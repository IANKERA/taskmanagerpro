package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.TaskDTO;
import com.example.taskmanagerpro.controller.TaskController;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.Role;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.ProjectRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.security.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceAuthorizationTests {

    @Mock
    private UserService userService;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private IssueKeyAllocator issueKeyAllocator;

    private TaskService taskService;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(taskRepository, userService, projectRepository, issueKeyAllocator);
        authenticate("alice", Role.ROLE_USER);
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void hidesAnotherUsersTaskWhenReadById() {
        Task task = new Task();
        task.setAssignee(user("bob", 2L));
        when(taskRepository.findByIdWithUser(41L)).thenReturn(task);

        assertTrue(taskService.getTaskById(41L).isEmpty());
    }

    @Test
    void filtersStatusListsToTheAuthenticatedAssignee() {
        User alice = user("alice", 1L);
        when(userService.findByUsername("alice")).thenReturn(Optional.of(alice));
        when(taskRepository.findByAssigneeIdAndStatus(1L, TaskStatus.PENDING))
                .thenReturn(List.of(new Task()));

        assertEquals(1, taskService.getTasksByStatus(TaskStatus.PENDING).size());
        verify(taskRepository).findByAssigneeIdAndStatus(1L, TaskStatus.PENDING);
    }

    @Test
    void rejectsFilteringByAnotherUsersTasks() {
        when(userService.findByUsername("alice")).thenReturn(Optional.of(user("alice", 1L)));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> taskService.getTasksByUserId(2L));

        assertEquals(403, exception.getStatusCode().value());
    }

    @Test
    void newTaskUsesAuthenticatedUserAsReporterAndAssignee() {
        User alice = user("alice", 1L);
        Project inbox = new Project();
        inbox.setId(8L);
        when(projectRepository.findByKey("INB")).thenReturn(Optional.of(inbox));
        when(userService.getUserByUsername("alice")).thenReturn(Optional.of(alice));
        when(issueKeyAllocator.allocate(8L)).thenReturn("INB-1");

        TaskDTO request = new TaskDTO();
        request.setId(41L);
        request.setProjectId(999L);
        request.setReporterId(999L);
        request.setAssigneeId(2L);
        request.setAssigneeUsername("bob");
        request.setTitle("Owned task");

        Task task = taskService.convertToEntity(request);

        assertNull(task.getId());
        assertSame(alice, task.getReporter());
        assertSame(alice, task.getAssignee());
        assertSame(inbox, task.getProject());
        assertEquals("INB-1", task.getIssueKey());
    }

    @Test
    void postRejectsClientSuppliedTaskId() {
        TaskService taskService = mock(TaskService.class);
        TaskController controller = new TaskController(taskService);
        TaskDTO request = new TaskDTO();
        request.setId(41L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.createTask(request));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(taskService);
    }

    @Test
    void globalAdminCanReadTasksAcrossAssignees() {
        authenticate("admin", Role.ROLE_ADMIN);
        Task task = new Task();
        task.setAssignee(user("bob", 2L));
        when(taskRepository.findByIdWithUser(41L)).thenReturn(task);

        assertSame(task, taskService.getTaskById(41L).orElseThrow());
    }

    private void authenticate(String username, Role role) {
        var principal = new CustomUserDetails(user(username, null, role));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        principal, null, List.of(new SimpleGrantedAuthority(role.name()))));
    }

    private User user(String username, Long id) {
        return user(username, id, Role.ROLE_USER);
    }

    private User user(String username, Long id, Role role) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setRole(role);
        return user;
    }
}
