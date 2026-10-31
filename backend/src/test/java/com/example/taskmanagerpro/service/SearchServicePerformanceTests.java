package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.ProjectMembership;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.ActivityLogRepository;
import com.example.taskmanagerpro.repository.ProjectMembershipRepository;
import com.example.taskmanagerpro.repository.ProjectRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServicePerformanceTests {

    @Mock private TaskRepository taskRepo;
    @Mock private ActivityLogRepository activityRepo;
    @Mock private ProjectMembershipRepository membershipRepo;
    @Mock private ProjectRepository projectRepo;
    @Mock private ProjectService projectService;

    private SearchService searchService;
    private final User currentUser = User.builder().id(100L).username("testuser").build();

    @BeforeEach
    void setUp() {
        searchService = new SearchService(taskRepo, activityRepo, membershipRepo, projectRepo, projectService);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("testuser", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        when(projectService.currentUser()).thenReturn(currentUser);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockAccessibleProjects(List<Long> pids) {
        List<ProjectMembership> memberships = pids.stream().map(id -> {
            Project p = Project.builder().id(id).key("P" + id).build();
            return ProjectMembership.builder().id(id).project(p).user(currentUser).build();
        }).toList();
        when(membershipRepo.findByUserId(100L)).thenReturn(memberships);
    }

    @Test
    void advancedSearchWithoutQueryFetchesAllProjectsInSingleBatchQuery() {
        List<Long> pids = List.of(1L, 2L, 3L, 4L, 5L);
        mockAccessibleProjects(pids);

        Task t1 = Task.builder().id(1L).title("Task 1").status(TaskStatus.PENDING).updatedAt(LocalDateTime.now().minusMinutes(10)).build();
        Task t2 = Task.builder().id(2L).title("Task 2").status(TaskStatus.DONE).updatedAt(LocalDateTime.now().minusMinutes(5)).build();
        when(taskRepo.findByProjectIdsWithRelations(pids)).thenReturn(List.of(t1, t2));

        List<Task> results = searchService.advancedSearch(null, null, null, null, null, null, 50);

        // Exactly 1 batch query for tasks across all 5 projects
        verify(taskRepo, times(1)).findByProjectIdsWithRelations(pids);
        verify(taskRepo, never()).findByProjectIdWithRelations(any());

        assertEquals(2, results.size());
        // Ordered by updatedAt DESC: t2 (5m ago) before t1 (10m ago)
        assertEquals(2L, results.get(0).getId());
        assertEquals(1L, results.get(1).getId());
    }

    @Test
    void advancedSearchWithProjectKeyUsesSingleLookupInsteadOfIteratingAccessibleProjects() {
        List<Long> pids = List.of(1L, 2L, 3L, 4L, 5L);
        mockAccessibleProjects(pids);

        Project targeted = Project.builder().id(3L).key("TARGET").build();
        when(projectRepo.findByKey("TARGET")).thenReturn(Optional.of(targeted));

        Task t = Task.builder().id(30L).title("Targeted task").status(TaskStatus.PENDING).build();
        when(taskRepo.findByProjectIdsWithRelations(List.of(3L))).thenReturn(List.of(t));

        List<Task> results = searchService.advancedSearch("", null, null, null, null, "TARGET", 50);

        verify(projectRepo, times(1)).findByKey("TARGET");
        verify(projectRepo, never()).findById(any());
        verify(taskRepo, times(1)).findByProjectIdsWithRelations(List.of(3L));
        assertEquals(1, results.size());
        assertEquals(30L, results.get(0).getId());
    }

    @Test
    void advancedSearchWithInaccessibleProjectKeyReturnsEmptyWithoutQueryingTasks() {
        List<Long> pids = List.of(1L, 2L);
        mockAccessibleProjects(pids);

        Project secret = Project.builder().id(999L).key("SECRET").build();
        when(projectRepo.findByKey("SECRET")).thenReturn(Optional.of(secret));

        List<Task> results = searchService.advancedSearch(null, null, null, null, null, "SECRET", 50);

        assertTrue(results.isEmpty());
        verify(taskRepo, never()).findByProjectIdsWithRelations(any());
        verify(taskRepo, never()).searchInProjects(any(), any());
    }

    @Test
    void advancedSearchAppliesFiltersAndPaginationCorrectly() {
        List<Long> pids = List.of(1L);
        mockAccessibleProjects(pids);

        User alice = User.builder().id(10L).username("alice").build();
        Task tMatch = Task.builder().id(1L).status(TaskStatus.IN_PROGRESS).priority(TaskPriority.HIGH)
                .issueType(IssueType.BUG).assignee(alice).updatedAt(LocalDateTime.now()).build();
        Task tWrongStatus = Task.builder().id(2L).status(TaskStatus.DONE).priority(TaskPriority.HIGH)
                .issueType(IssueType.BUG).assignee(alice).updatedAt(LocalDateTime.now()).build();

        when(taskRepo.findByProjectIdsWithRelations(pids)).thenReturn(List.of(tMatch, tWrongStatus));

        List<Task> results = searchService.advancedSearch(
                "", "IN_PROGRESS", "HIGH", "BUG", "alice", null, 10);

        assertEquals(1, results.size());
        assertEquals(1L, results.get(0).getId());
    }
}

