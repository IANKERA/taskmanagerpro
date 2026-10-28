package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.ActivityLog;
import com.example.taskmanagerpro.model.Sprint;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.SprintState;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.ActivityLogRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class BurndownService {

    private final SprintService sprintService;
    private final TaskRepository taskRepo;
    private final ActivityLogRepository activityRepo;

    public BurndownService(SprintService sprintService, TaskRepository taskRepo,
                           ActivityLogRepository activityRepo) {
        this.sprintService = sprintService;
        this.taskRepo = taskRepo;
        this.activityRepo = activityRepo;
    }

    /**
     * Compute a daily burndown for a sprint.
     * Returns a list of maps: [{date, remaining, ideal, done, total}]
     *
     * Strategy: count total issues in the sprint, then walk the activity log
     * day by day to see when issues transitioned to/from DONE.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> burndown(Long sprintId) {
        Sprint sprint = sprintService.get(sprintId);

        // Use the earlier of startDate and startedAt as the actual start
        LocalDate start = sprint.getStartedAt() != null
                ? sprint.getStartedAt().toLocalDate()
                : sprint.getCreatedAt().toLocalDate();
        if (sprint.getStartDate() != null && sprint.getStartDate().isBefore(start)) {
            start = sprint.getStartDate();
        }
        LocalDate end = sprint.getEndDate();
        if (end == null) {
            end = sprint.getClosedAt() != null
                    ? sprint.getClosedAt().toLocalDate()
                    : start.plusDays(14); // default 2-week sprint
        }
        // Ensure end is at least as far as start
        if (end.isBefore(start)) end = start.plusDays(7);
        if (end.isBefore(start)) end = start;

        // Cap to avoid huge ranges
        LocalDate today = LocalDate.now();
        LocalDate dataEnd = end.isAfter(today) ? today : end;

        // All tasks currently in the sprint
        List<Task> tasks = taskRepo.findBySprintIdWithRelations(sprintId);
        int totalScope = tasks.size();
        Set<Long> taskIds = new HashSet<>();
        for (Task t : tasks) taskIds.add(t.getId());

        // Gather all status-change activity logs for these tasks
        // We'll query per-task to reuse the existing repo method
        List<ActivityLog> statusChanges = new ArrayList<>();
        for (Long taskId : taskIds) {
            List<ActivityLog> logs = activityRepo.findByTaskIdWithActor(taskId);
            for (ActivityLog log : logs) {
                if ("status".equals(log.getField()) || log.getActivityType().name().equals("CREATED")) {
                    statusChanges.add(log);
                }
            }
        }
        // Sort by time
        statusChanges.sort(Comparator.comparing(ActivityLog::getAt));

        // Build a day-by-day remaining count
        // Start: on day 0, remaining = total (assume all are "not done" at sprint start)
        // Actually, some tasks may have been DONE before the sprint started.
        // Let's compute the initial state at sprint start, then apply deltas.

        LocalDateTime sprintStart = start.atStartOfDay();

        // Initial done count at sprint start
        int doneAtStart = 0;
        for (Task t : tasks) {
            // Check if task was already DONE at sprint start by checking if
            // latest status change before sprint start set it to DONE
            boolean wasDone = false;
            for (ActivityLog log : statusChanges) {
                if (!taskIds.contains(log.getTask().getId())) continue;
                if (log.getTask().getId().equals(t.getId()) && log.getAt().isBefore(sprintStart)) {
                    if ("status".equals(log.getField())) {
                        wasDone = "DONE".equals(log.getNewValue());
                    }
                }
            }
            if (wasDone) doneAtStart++;
        }

        // Build daily deltas map: date -> net change in done count
        Map<LocalDate, Integer> dailyDelta = new TreeMap<>();
        for (ActivityLog log : statusChanges) {
            if (!taskIds.contains(log.getTask().getId())) continue;
            if (!"status".equals(log.getField())) continue;
            LocalDate day = log.getAt().toLocalDate();
            if (day.isBefore(start)) continue;

            int delta = 0;
            if ("DONE".equals(log.getNewValue())) delta++;
            if ("DONE".equals(log.getOldValue())) delta--;
            if (delta != 0) {
                dailyDelta.merge(day, delta, Integer::sum);
            }
        }

        // Generate the series
        List<Map<String, Object>> series = new ArrayList<>();
        int doneCount = doneAtStart;
        long totalDays = java.time.temporal.ChronoUnit.DAYS.between(start, end);

        for (LocalDate d = start; !d.isAfter(dataEnd); d = d.plusDays(1)) {
            doneCount += dailyDelta.getOrDefault(d, 0);
            int remaining = totalScope - doneCount;

            // Ideal line: linear from totalScope to 0
            long dayIndex = java.time.temporal.ChronoUnit.DAYS.between(start, d);
            double ideal = totalDays > 0
                    ? totalScope * (1.0 - (double) dayIndex / totalDays)
                    : 0;

            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", d.toString());
            point.put("remaining", Math.max(remaining, 0));
            point.put("ideal", Math.round(ideal * 10) / 10.0);
            point.put("done", doneCount);
            point.put("total", totalScope);
            series.add(point);
        }

        return series;
    }
}
