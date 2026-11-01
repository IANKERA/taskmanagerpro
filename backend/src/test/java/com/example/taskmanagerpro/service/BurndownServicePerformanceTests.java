package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.ActivityLog;
import com.example.taskmanagerpro.model.Sprint;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.ActivityType;
import com.example.taskmanagerpro.model.enums.SprintState;
import com.example.taskmanagerpro.repository.ActivityLogRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BurndownServicePerformanceTests {

    @Mock private SprintService sprintService;
    @Mock private TaskRepository taskRepo;
    @Mock private ActivityLogRepository activityRepo;

    @InjectMocks private BurndownService burndownService;

    @Test
    void burndownUsesBatchQueriesInsteadOfPerTaskLoop() {
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().plusDays(2);

        Sprint sprint = Sprint.builder()
                .id(100L)
                .name("Sprint 1")
                .state(SprintState.ACTIVE)
                .startDate(start)
                .endDate(end)
                .createdAt(start.atStartOfDay())
                .startedAt(start.atStartOfDay())
                .build();
        when(sprintService.get(100L)).thenReturn(sprint);

        List<Long> taskIds = List.of(1L, 2L, 3L);
        when(taskRepo.findTaskIdsBySprintId(100L)).thenReturn(taskIds);

        Task task1 = Task.builder().id(1L).build();
        Task task2 = Task.builder().id(2L).build();

        // 1 task done before start, 1 task done on day 2
        ActivityLog logBefore = ActivityLog.builder()
                .task(task1)
                .field("status")
                .oldValue("IN_PROGRESS")
                .newValue("DONE")
                .at(start.atStartOfDay().minusHours(2))
                .build();

        ActivityLog logDuring = ActivityLog.builder()
                .task(task2)
                .field("status")
                .oldValue("IN_PROGRESS")
                .newValue("DONE")
                .at(start.atStartOfDay().plusDays(2))
                .build();

        when(activityRepo.findStatusChangesByTaskIds(taskIds)).thenReturn(List.of(logBefore, logDuring));

        List<Map<String, Object>> series = burndownService.burndown(100L);

        // Verify N+1 queries eliminated
        verify(taskRepo, times(1)).findTaskIdsBySprintId(100L);
        verify(taskRepo, never()).findBySprintIdWithRelations(any());
        verify(activityRepo, times(1)).findStatusChangesByTaskIds(taskIds);
        verify(activityRepo, never()).findByTaskIdWithActor(any());

        assertFalse(series.isEmpty());
        // Day 0: 1 already done at start -> remaining = 2
        Map<String, Object> day0 = series.get(0);
        assertEquals(start.toString(), day0.get("date"));
        assertEquals(3, day0.get("total"));
        assertEquals(1, day0.get("done"));
        assertEquals(2, day0.get("remaining"));
    }

    @Test
    void burndownSkipsActivityQueryWhenSprintHasNoTasks() {
        LocalDate start = LocalDate.now().minusDays(3);
        LocalDate end = LocalDate.now().plusDays(3);

        Sprint sprint = Sprint.builder()
                .id(200L)
                .name("Empty Sprint")
                .state(SprintState.ACTIVE)
                .startDate(start)
                .endDate(end)
                .createdAt(start.atStartOfDay())
                .startedAt(start.atStartOfDay())
                .build();
        when(sprintService.get(200L)).thenReturn(sprint);
        when(taskRepo.findTaskIdsBySprintId(200L)).thenReturn(List.of());

        List<Map<String, Object>> series = burndownService.burndown(200L);

        verify(taskRepo, times(1)).findTaskIdsBySprintId(200L);
        verify(activityRepo, never()).findStatusChangesByTaskIds(any());
        verify(activityRepo, never()).findByTaskIdWithActor(any());

        assertFalse(series.isEmpty());
        Map<String, Object> firstPoint = series.get(0);
        assertEquals(0, firstPoint.get("total"));
        assertEquals(0, firstPoint.get("done"));
        assertEquals(0, firstPoint.get("remaining"));
    }
}
