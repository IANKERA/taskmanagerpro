package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DueDateReminderPerformanceTests {

    @Mock private TaskRepository taskRepo;
    @Mock private NotificationService notifService;

    @InjectMocks private DueDateReminder reminder;

    @Test
    void checkDueDatesUsesTargetedQueryWithoutFullTableScan() {
        LocalDateTime now = LocalDateTime.now();
        User assignee = User.builder().id(10L).username("alice").build();
        Project project = Project.builder().id(1L).key("PRJ").build();

        Task overdueTask = Task.builder()
                .id(101L)
                .issueKey("PRJ-101")
                .title("Overdue item")
                .status(TaskStatus.IN_PROGRESS)
                .dueDate(now.minusDays(1))
                .assignee(assignee)
                .project(project)
                .build();

        Task upcomingTask = Task.builder()
                .id(102L)
                .issueKey("PRJ-102")
                .title("Due soon item")
                .status(TaskStatus.PENDING)
                .dueDate(now.plusDays(1))
                .assignee(assignee)
                .project(project)
                .build();

        when(taskRepo.findTasksEligibleForDueDateReminder(any())).thenReturn(List.of(overdueTask, upcomingTask));

        reminder.checkDueDates();

        // Verify only the targeted query is used, never findAll()
        verify(taskRepo, times(1)).findTasksEligibleForDueDateReminder(any());
        verify(taskRepo, never()).findAll();

        // Verify notifications sent for both eligible tasks
        verify(notifService, times(1)).notifyUser(eq(assignee), eq(overdueTask), eq("DUE_DATE"), any(), any());
        verify(notifService, times(1)).notifyUser(eq(assignee), eq(upcomingTask), eq("DUE_DATE"), any(), any());
    }
}
