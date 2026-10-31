package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.model.ActivityLog;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.ActivityType;
import com.example.taskmanagerpro.repository.ActivityLogRepository;
import com.example.taskmanagerpro.repository.SprintRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsControllerPerformanceTests {

    @Mock private ProjectService projectService;
    @Mock private TaskRepository taskRepo;
    @Mock private SprintRepository sprintRepo;
    @Mock private ActivityLogRepository activityLogRepo;

    @InjectMocks private AnalyticsController analyticsController;

    @Test
    void cfdRetrievesActivitiesInASingleBatchQueryInsteadOfPerTaskLoop() {
        Project project = Project.builder().id(10L).key("CFD").build();
        when(projectService.getByKey("CFD")).thenReturn(project);

        LocalDateTime baseTime = LocalDateTime.now().minusDays(5);
        Task t1 = Task.builder().id(1L).project(project).createdAt(baseTime).build();
        Task t2 = Task.builder().id(2L).project(project).createdAt(baseTime).build();
        Task t3 = Task.builder().id(3L).project(project).createdAt(baseTime).build();
        when(taskRepo.findByProjectIdWithRelations(10L)).thenReturn(List.of(t1, t2, t3));

        ActivityLog log1 = ActivityLog.builder()
                .task(t1)
                .activityType(ActivityType.FIELD_CHANGED)
                .field("status")
                .newValue("IN_PROGRESS")
                .at(baseTime.plusDays(1))
                .build();
        ActivityLog log2 = ActivityLog.builder()
                .task(t2)
                .activityType(ActivityType.FIELD_CHANGED)
                .field("status")
                .newValue("DONE")
                .at(baseTime.plusDays(2))
                .build();
        when(activityLogRepo.findStatusChangesByProjectId(10L)).thenReturn(List.of(log1, log2));

        List<Map<String, Object>> result = analyticsController.cumulativeFlowDiagram("CFD", 7);

        // Assert query count efficiency: exactly 1 batch query, never loop over individual tasks
        verify(activityLogRepo, times(1)).findStatusChangesByProjectId(10L);
        verify(activityLogRepo, never()).findByTaskIdWithActor(any());

        assertFalse(result.isEmpty());
        Map<String, Object> latestDay = result.get(result.size() - 1);
        assertEquals(LocalDate.now().toString(), latestDay.get("date"));
        assertEquals(1, latestDay.get("PENDING"));
        assertEquals(1, latestDay.get("IN_PROGRESS"));
        assertEquals(1, latestDay.get("DONE"));
    }

    @Test
    void cfdSkipsActivityQueryWhenProjectHasNoTasks() {
        Project project = Project.builder().id(10L).key("EMPTY").build();
        when(projectService.getByKey("EMPTY")).thenReturn(project);
        when(taskRepo.findByProjectIdWithRelations(10L)).thenReturn(List.of());

        List<Map<String, Object>> result = analyticsController.cumulativeFlowDiagram("EMPTY", 5);

        assertFalse(result.isEmpty());
        verify(activityLogRepo, never()).findStatusChangesByProjectId(any());
        verify(activityLogRepo, never()).findByTaskIdWithActor(any());
    }

    @Test
    void cfdPropagatesAuthorizationDenial() {
        when(projectService.getByKey("DENIED"))
                .thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN));

        assertThrows(ResponseStatusException.class,
                () -> analyticsController.cumulativeFlowDiagram("DENIED", 30));

        verify(taskRepo, never()).findByProjectIdWithRelations(any());
        verify(activityLogRepo, never()).findStatusChangesByProjectId(any());
    }
}

