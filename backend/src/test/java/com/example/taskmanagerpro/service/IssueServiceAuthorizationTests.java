package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.CreateLinkRequest;
import com.example.taskmanagerpro.dto.CreateIssueRequest;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.TimeLog;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.LinkType;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.repository.IssueLinkRepository;
import com.example.taskmanagerpro.repository.SprintRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.repository.TimeLogRepository;
import com.example.taskmanagerpro.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IssueServiceAuthorizationTests {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectService projectService;

    @Mock
    private IssueKeyAllocator issueKeyAllocator;

    @Mock
    private ActivityService activityService;

    @Mock
    private SprintRepository sprintRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private IssueLinkRepository issueLinkRepository;

    @Mock
    private TimeLogRepository timeLogRepository;

    @Mock
    private WorkflowEngine workflowEngine;

    @Mock
    private AttachmentCleanupService attachmentCleanupService;

    private IssueService createService() {
        return new IssueService(
                taskRepository,
                userRepository,
                projectService,
                issueKeyAllocator,
                activityService,
                sprintRepository,
                notificationService,
                issueLinkRepository,
                timeLogRepository,
                workflowEngine,
                attachmentCleanupService);
    }

    @Test
    void creatingCrossProjectLinkRequiresTargetMembership() {
        Task source = task(1L, 10L);
        Task target = task(2L, 20L);
        when(taskRepository.findByIssueKeyWithRelations("SRC-1")).thenReturn(Optional.of(source));
        when(taskRepository.findByIssueKeyWithRelations("DST-1")).thenReturn(Optional.of(target));

        CreateLinkRequest request = new CreateLinkRequest();
        request.setTargetIssueKey("DST-1");
        request.setLinkType(LinkType.BLOCKS);

        lenient().doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN))
                .when(projectService).requireProjectRole(
                        20L, ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> createService().createLink("SRC-1", request));

        assertEquals(403, exception.getStatusCode().value());
        verify(issueLinkRepository, never()).save(any());
    }

    @Test
    void creatingIssueRejectsAssigneeOutsideProject() {
        Project project = new Project();
        project.setId(20L);
        User reporter = user(1L, "alice");
        User outsider = user(3L, "charlie");
        when(projectService.getByKey("DST")).thenReturn(project);
        when(projectService.currentUser()).thenReturn(reporter);
        when(userRepository.findByUsername("charlie")).thenReturn(Optional.of(outsider));
        org.mockito.Mockito.doThrow(new ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST))
                .when(projectService).requireAssignableMember(20L, 3L);

        CreateIssueRequest request = new CreateIssueRequest();
        request.setTitle("Assigned issue");
        request.setAssigneeUsername("charlie");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> createService().create("DST", request));

        assertEquals(400, exception.getStatusCode().value());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void timeLogDeleteRequiresMatchingIssueAndAuthorOrProjectAdmin() {
        Task task = task(1L, 10L);
        User author = user(2L, "bob");
        TimeLog timeLog = TimeLog.builder().id(8L).task(task).user(author).build();
        when(taskRepository.findByIssueKeyWithRelations("SRC-1")).thenReturn(Optional.of(task));
        when(timeLogRepository.findByIdAndTaskId(8L, 1L)).thenReturn(Optional.of(timeLog));
        when(projectService.currentUser()).thenReturn(user(1L, "alice"));
        when(projectService.hasProjectRole(10L, ProjectRole.ADMIN)).thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> createService().deleteTimeLog("SRC-1", 8L));

        assertEquals(403, exception.getStatusCode().value());
        verify(timeLogRepository, never()).delete(any(TimeLog.class));
    }

    @Test
    void timeLogIdFromDifferentIssueIsNotDeleted() {
        Task task = task(1L, 10L);
        when(taskRepository.findByIssueKeyWithRelations("SRC-1")).thenReturn(Optional.of(task));
        when(timeLogRepository.findByIdAndTaskId(8L, 1L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> createService().deleteTimeLog("SRC-1", 8L));

        assertEquals(404, exception.getStatusCode().value());
        verify(timeLogRepository, never()).delete(any(TimeLog.class));
    }

    @Test
    void timeLogAuthorCanDeleteOwnEntry() {
        Task task = task(1L, 10L);
        User author = user(2L, "bob");
        TimeLog timeLog = TimeLog.builder().id(8L).task(task).user(author).build();
        when(taskRepository.findByIssueKeyWithRelations("SRC-1")).thenReturn(Optional.of(task));
        when(timeLogRepository.findByIdAndTaskId(8L, 1L)).thenReturn(Optional.of(timeLog));
        when(projectService.currentUser()).thenReturn(author);
        when(projectService.hasProjectRole(10L, ProjectRole.ADMIN)).thenReturn(false);

        createService().deleteTimeLog("SRC-1", 8L);

        verify(timeLogRepository).delete(timeLog);
    }

    private Task task(Long id, Long projectId) {
        Project project = new Project();
        project.setId(projectId);
        Task task = new Task();
        task.setId(id);
        task.setProject(project);
        return task;
    }

    private User user(Long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        return user;
    }
}
