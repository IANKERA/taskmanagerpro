package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.EpicChildCountProjection;
import com.example.taskmanagerpro.dto.TaskDTO;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.repository.TimeLogRepository;
import com.example.taskmanagerpro.repository.UserRepository;
import com.example.taskmanagerpro.service.IssueService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IssueControllerPerformanceTests {

    @Mock private IssueService issueService;
    @Mock private TaskRepository taskRepo;
    @Mock private TimeLogRepository timeLogRepo;
    @Mock private UserRepository userRepo;

    @InjectMocks private IssueController issueController;

    private record SimpleEpicChildCountProjection(Long parentId, Long childCount, Long childDoneCount)
            implements EpicChildCountProjection {
        @Override public Long getParentId() { return parentId; }
        @Override public Long getChildCount() { return childCount; }
        @Override public Long getChildDoneCount() { return childDoneCount; }
    }

    @Test
    void listForProjectUsesBatchQueryForEpicChildCountsInsteadOfPerEpicLoop() {
        Project project = Project.builder().id(1L).key("PRJ").build();

        Task epic1 = Task.builder()
                .id(10L)
                .issueKey("PRJ-10")
                .title("Epic 1")
                .issueType(IssueType.EPIC)
                .status(TaskStatus.IN_PROGRESS)
                .priority(TaskPriority.HIGH)
                .project(project)
                .build();

        Task epic2 = Task.builder()
                .id(20L)
                .issueKey("PRJ-20")
                .title("Epic 2")
                .issueType(IssueType.EPIC)
                .status(TaskStatus.PENDING)
                .priority(TaskPriority.MEDIUM)
                .project(project)
                .build();

        Task story = Task.builder()
                .id(30L)
                .issueKey("PRJ-30")
                .title("Story 1")
                .issueType(IssueType.STORY)
                .status(TaskStatus.PENDING)
                .priority(TaskPriority.LOW)
                .project(project)
                .build();

        when(issueService.listForProject("PRJ")).thenReturn(List.of(epic1, epic2, story));

        EpicChildCountProjection p1 = new SimpleEpicChildCountProjection(10L, 5L, 2L);
        EpicChildCountProjection p2 = new SimpleEpicChildCountProjection(20L, 3L, 3L);
        when(taskRepo.countChildrenGroupedByParentId(List.of(10L, 20L))).thenReturn(List.of(p1, p2));

        List<TaskDTO> result = issueController.listForProject("PRJ");

        // Verify batch query called once with all epic IDs, and per-epic queries are never called
        verify(taskRepo, times(1)).countChildrenGroupedByParentId(List.of(10L, 20L));
        verify(taskRepo, never()).countByParentId(any());
        verify(taskRepo, never()).countByParentIdAndStatus(any(), any());

        assertEquals(3, result.size());
        TaskDTO dto1 = result.get(0);
        assertEquals(5, dto1.getChildCount());
        assertEquals(2, dto1.getChildDoneCount());

        TaskDTO dto2 = result.get(1);
        assertEquals(3, dto2.getChildCount());
        assertEquals(3, dto2.getChildDoneCount());

        TaskDTO dto3 = result.get(2);
        // non-epic has null child counts
        assertEquals(null, dto3.getChildCount());
        assertEquals(null, dto3.getChildDoneCount());
    }

    @Test
    void listForProjectSkipsChildCountQueryWhenNoEpics() {
        Project project = Project.builder().id(1L).key("PRJ").build();
        Task story = Task.builder()
                .id(30L)
                .issueKey("PRJ-30")
                .title("Story 1")
                .issueType(IssueType.STORY)
                .status(TaskStatus.PENDING)
                .priority(TaskPriority.LOW)
                .project(project)
                .build();

        when(issueService.listForProject("PRJ")).thenReturn(List.of(story));

        List<TaskDTO> result = issueController.listForProject("PRJ");

        verify(taskRepo, never()).countChildrenGroupedByParentId(any());
        verify(taskRepo, never()).countByParentId(any());
        verify(taskRepo, never()).countByParentIdAndStatus(any(), any());
        assertEquals(1, result.size());
    }
}
