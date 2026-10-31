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
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
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
    void advancedSearchWithoutQueryExecutesTwoStepQueryWithDatabaseLimit() {
        List<Long> pids = List.of(1L, 2L, 3L, 4L, 5L);
        mockAccessibleProjects(pids);

        Task t1 = Task.builder().id(1L).title("Task 1").status(TaskStatus.PENDING).updatedAt(LocalDateTime.now().minusMinutes(10)).build();
        Task t2 = Task.builder().id(2L).title("Task 2").status(TaskStatus.DONE).updatedAt(LocalDateTime.now().minusMinutes(5)).build();

        // Step 1: Database limits IDs in sorted order
        when(taskRepo.findMatchingTaskIds(pids, null, null, null, null, false, null, PageRequest.of(0, 50)))
                .thenReturn(List.of(2L, 1L));

        // Step 2: Hydrate matching entities
        when(taskRepo.findByIdsWithRelations(List.of(2L, 1L))).thenReturn(List.of(t1, t2));

        List<Task> results = searchService.advancedSearch(null, null, null, null, null, null, 50);

        verify(taskRepo, times(1)).findMatchingTaskIds(pids, null, null, null, null, false, null, PageRequest.of(0, 50));
        verify(taskRepo, times(1)).findByIdsWithRelations(List.of(2L, 1L));
        verify(taskRepo, never()).findByProjectIdsWithRelations(any());
        verify(taskRepo, never()).findByProjectIdWithRelations(any());

        assertEquals(2, results.size());
        // Ordered according to Step 1 database order: t2 (ID 2), then t1 (ID 1)
        assertEquals(2L, results.get(0).getId());
        assertEquals(1L, results.get(1).getId());
    }

    @Test
    void advancedSearchWithProjectKeyUsesSingleLookupAndRestrictsIds() {
        List<Long> pids = List.of(1L, 2L, 3L, 4L, 5L);
        mockAccessibleProjects(pids);

        Project targeted = Project.builder().id(3L).key("TARGET").build();
        when(projectRepo.findByKey("TARGET")).thenReturn(Optional.of(targeted));

        Task t = Task.builder().id(30L).title("Targeted task").status(TaskStatus.PENDING).build();
        when(taskRepo.findMatchingTaskIds(List.of(3L), null, null, null, null, false, null, PageRequest.of(0, 50)))
                .thenReturn(List.of(30L));
        when(taskRepo.findByIdsWithRelations(List.of(30L))).thenReturn(List.of(t));

        List<Task> results = searchService.advancedSearch("", null, null, null, null, "TARGET", 50);

        verify(projectRepo, times(1)).findByKey("TARGET");
        verify(projectRepo, never()).findById(any());
        verify(taskRepo, times(1)).findMatchingTaskIds(List.of(3L), null, null, null, null, false, null, PageRequest.of(0, 50));
        verify(taskRepo, times(1)).findByIdsWithRelations(List.of(30L));
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
        verify(taskRepo, never()).findMatchingTaskIds(any(), any(), any(), any(), any(), anyBoolean(), any(), any());
        verify(taskRepo, never()).findByIdsWithRelations(any());
        verify(taskRepo, never()).findByProjectIdsWithRelations(any());
    }

    @Test
    void advancedSearchAppliesFiltersAndPaginationCorrectly() {
        List<Long> pids = List.of(1L);
        mockAccessibleProjects(pids);

        User alice = User.builder().id(10L).username("alice").build();
        Task tMatch = Task.builder().id(1L).status(TaskStatus.IN_PROGRESS).priority(TaskPriority.HIGH)
                .issueType(IssueType.BUG).assignee(alice).updatedAt(LocalDateTime.now()).build();

        when(taskRepo.findMatchingTaskIds(pids, null, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, IssueType.BUG, false, "alice", PageRequest.of(0, 10)))
                .thenReturn(List.of(1L));
        when(taskRepo.findByIdsWithRelations(List.of(1L))).thenReturn(List.of(tMatch));

        List<Task> results = searchService.advancedSearch(
                "", "IN_PROGRESS", "HIGH", "BUG", "alice", null, 10);

        verify(taskRepo, times(1)).findMatchingTaskIds(pids, null, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, IssueType.BUG, false, "alice", PageRequest.of(0, 10));
        verify(taskRepo, times(1)).findByIdsWithRelations(List.of(1L));
        assertEquals(1, results.size());
        assertEquals(1L, results.get(0).getId());
    }

    @Test
    void advancedSearchWithUnassignedKeywordPassesUnassignedFlag() {
        List<Long> pids = List.of(1L);
        mockAccessibleProjects(pids);

        Task tUnassigned = Task.builder().id(5L).title("Unassigned task").status(TaskStatus.PENDING).build();
        when(taskRepo.findMatchingTaskIds(pids, null, null, null, null, true, null, PageRequest.of(0, 20)))
                .thenReturn(List.of(5L));
        when(taskRepo.findByIdsWithRelations(List.of(5L))).thenReturn(List.of(tUnassigned));

        List<Task> results = searchService.advancedSearch(null, null, null, null, "__unassigned__", null, 20);

        verify(taskRepo, times(1)).findMatchingTaskIds(pids, null, null, null, null, true, null, PageRequest.of(0, 20));
        verify(taskRepo, times(1)).findByIdsWithRelations(List.of(5L));
        assertEquals(1, results.size());
        assertEquals(5L, results.get(0).getId());
    }

    @Test
    void advancedSearchWithInvalidEnumReturnsEmptyWithoutQueryingTasks() {
        List<Long> pids = List.of(1L);
        mockAccessibleProjects(pids);

        List<Task> results = searchService.advancedSearch(null, "INVALID_STATUS", null, null, null, null, 20);

        assertTrue(results.isEmpty());
        verify(taskRepo, never()).findMatchingTaskIds(any(), any(), any(), any(), any(), anyBoolean(), any(), any());
        verify(taskRepo, never()).findByIdsWithRelations(any());
    }

    @Test
    void advancedSearchWhenNoTasksMatchSkipsHydrationQuery() {
        List<Long> pids = List.of(1L);
        mockAccessibleProjects(pids);

        when(taskRepo.findMatchingTaskIds(pids, "nonexistent", null, null, null, false, null, PageRequest.of(0, 20)))
                .thenReturn(List.of());

        List<Task> results = searchService.advancedSearch("nonexistent", null, null, null, null, null, 20);

        assertTrue(results.isEmpty());
        verify(taskRepo, times(1)).findMatchingTaskIds(pids, "nonexistent", null, null, null, false, null, PageRequest.of(0, 20));
        verify(taskRepo, never()).findByIdsWithRelations(any());
    }

    @Test
    void advancedSearchPreservesDatabaseOrderingRegardlessOfHydrationOrder() {
        List<Long> pids = List.of(1L);
        mockAccessibleProjects(pids);

        Task t1 = Task.builder().id(1L).title("Task 1").build();
        Task t2 = Task.builder().id(2L).title("Task 2").build();
        Task t3 = Task.builder().id(3L).title("Task 3").build();

        // Step 1 returns order: 3, 1, 2
        when(taskRepo.findMatchingTaskIds(pids, null, null, null, null, false, null, PageRequest.of(0, 10)))
                .thenReturn(List.of(3L, 1L, 2L));

        // Step 2 returns tasks in arbitrary order (e.g. 1, 2, 3)
        when(taskRepo.findByIdsWithRelations(List.of(3L, 1L, 2L))).thenReturn(List.of(t1, t2, t3));

        List<Task> results = searchService.advancedSearch(null, null, null, null, null, null, 10);

        assertEquals(3, results.size());
        assertEquals(3L, results.get(0).getId());
        assertEquals(1L, results.get(1).getId());
        assertEquals(2L, results.get(2).getId());
    }
}
