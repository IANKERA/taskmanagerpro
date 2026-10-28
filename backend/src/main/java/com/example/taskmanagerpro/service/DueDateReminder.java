package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Sends notifications for issues approaching or past their due date.
 * Runs every hour.
 */
@Service
@Slf4j
public class DueDateReminder {

    private final TaskRepository taskRepo;
    private final NotificationService notifService;

    public DueDateReminder(TaskRepository taskRepo, NotificationService notifService) {
        this.taskRepo = taskRepo;
        this.notifService = notifService;
    }

    @Scheduled(fixedDelay = 3600000) // every hour
    @Transactional
    public void checkDueDates() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime tomorrow = now.plusDays(1);
        LocalDateTime dayAfter = now.plusDays(2);

        // Find tasks due within 2 days that are not done
        List<Task> allTasks = taskRepo.findAll();
        int reminded = 0;

        for (Task t : allTasks) {
            if (t.getDueDate() == null) continue;
            if (t.getStatus() == TaskStatus.DONE) continue;
            if (t.getAssignee() == null) continue;

            LocalDateTime due = t.getDueDate();

            // Overdue
            if (due.isBefore(now)) {
                notifService.notifyUser(
                    t.getAssignee(), t, "DUE_DATE",
                    "Overdue: " + t.getIssueKey(),
                    t.getTitle() + " was due " + due.toLocalDate()
                );
                reminded++;
            }
            // Due today or tomorrow
            else if (due.isBefore(dayAfter)) {
                String when = due.toLocalDate().equals(now.toLocalDate()) ? "today" : "tomorrow";
                notifService.notifyUser(
                    t.getAssignee(), t, "DUE_DATE",
                    t.getIssueKey() + " is due " + when,
                    t.getTitle() + " is due " + when + " (" + due.toLocalDate() + ")"
                );
                reminded++;
            }
        }

        if (reminded > 0) {
            log.info("Sent {} due-date reminders", reminded);
        }
    }
}
