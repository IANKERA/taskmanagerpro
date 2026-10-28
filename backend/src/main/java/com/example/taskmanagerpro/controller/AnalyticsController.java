package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.model.ActivityLog;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.Sprint;
import com.example.taskmanagerpro.repository.ActivityLogRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.repository.SprintRepository;
import com.example.taskmanagerpro.service.ProjectService;
import lombok.Data;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects/{projectKey}/analytics")
public class AnalyticsController {

    private final ProjectService projectService;
    private final TaskRepository taskRepo;
    private final SprintRepository sprintRepo;
    private final ActivityLogRepository activityLogRepo;

    public AnalyticsController(ProjectService projectService,
                               TaskRepository taskRepo,
                               SprintRepository sprintRepo,
                               ActivityLogRepository activityLogRepo) {
        this.projectService = projectService;
        this.taskRepo = taskRepo;
        this.sprintRepo = sprintRepo;
        this.activityLogRepo = activityLogRepo;
    }

    @GetMapping
    public AnalyticsResponse getAnalytics(@PathVariable String projectKey) {
        Project p = projectService.getByKey(projectKey);
        List<Task> issues = taskRepo.findByProjectIdWithRelations(p.getId());

        AnalyticsResponse r = new AnalyticsResponse();

        // Status breakdown
        r.statusBreakdown = issues.stream()
                .collect(Collectors.groupingBy(t -> t.getStatus().name(), Collectors.counting()));

        // Priority breakdown
        r.priorityBreakdown = issues.stream()
                .collect(Collectors.groupingBy(t -> t.getPriority().name(), Collectors.counting()));

        // Type breakdown
        r.typeBreakdown = issues.stream()
                .collect(Collectors.groupingBy(t -> t.getIssueType().name(), Collectors.counting()));

        // Assignee workload
        r.assigneeWorkload = new ArrayList<>();
        Map<String, List<Task>> byAssignee = issues.stream()
                .filter(t -> t.getAssignee() != null)
                .collect(Collectors.groupingBy(t -> t.getAssignee().getUsername()));
        for (var entry : byAssignee.entrySet()) {
            AssigneeStats as = new AssigneeStats();
            as.username = entry.getKey();
            as.total = entry.getValue().size();
            as.open = (int) entry.getValue().stream().filter(t -> !"DONE".equals(t.getStatus().name())).count();
            as.done = (int) entry.getValue().stream().filter(t -> "DONE".equals(t.getStatus().name())).count();
            r.assigneeWorkload.add(as);
        }
        r.assigneeWorkload.sort(Comparator.comparingInt((AssigneeStats a) -> a.total).reversed());

        // Unassigned count
        r.unassignedCount = (int) issues.stream().filter(t -> t.getAssignee() == null).count();

        // Sprint velocity (story points completed per closed sprint)
        List<Sprint> sprints = sprintRepo.findByProjectIdOrderByCreatedAtDesc(p.getId());
        r.sprintVelocity = new ArrayList<>();
        for (Sprint s : sprints) {
            if (!"CLOSED".equals(s.getState().name())) continue;
            SprintVelocity sv = new SprintVelocity();
            sv.sprintName = s.getName();
            sv.committed = 0;
            sv.completed = 0;
            List<Task> sprintIssues = issues.stream()
                    .filter(t -> s.getId().equals(t.getSprint() != null ? t.getSprint().getId() : null))
                    .toList();
            for (Task t : sprintIssues) {
                int sp = t.getStoryPoints() != null ? t.getStoryPoints() : 0;
                sv.committed += sp;
                if ("DONE".equals(t.getStatus().name())) sv.completed += sp;
            }
            r.sprintVelocity.add(sv);
        }
        Collections.reverse(r.sprintVelocity); // chronological order

        // Summary
        r.totalIssues = issues.size();
        r.openIssues = (int) issues.stream().filter(t -> !"DONE".equals(t.getStatus().name())).count();
        r.doneIssues = (int) issues.stream().filter(t -> "DONE".equals(t.getStatus().name())).count();

        // Stale issues (not updated in 14+ days, not done)
        var staleThreshold = java.time.LocalDateTime.now().minusDays(14);
        r.staleIssues = issues.stream()
                .filter(t -> !"DONE".equals(t.getStatus().name()))
                .filter(t -> t.getUpdatedAt() != null && t.getUpdatedAt().isBefore(staleThreshold))
                .map(t -> {
                    StaleIssue si = new StaleIssue();
                    si.issueKey = t.getIssueKey();
                    si.title = t.getTitle();
                    si.status = t.getStatus().name();
                    si.daysSinceUpdate = java.time.temporal.ChronoUnit.DAYS.between(t.getUpdatedAt(), java.time.LocalDateTime.now());
                    si.assignee = t.getAssignee() != null ? t.getAssignee().getUsername() : null;
                    return si;
                })
                .sorted(Comparator.comparingLong((StaleIssue s) -> s.daysSinceUpdate).reversed())
                .toList();

        // Overdue issues
        var now = java.time.LocalDateTime.now();
        r.overdueCount = (int) issues.stream()
                .filter(t -> !"DONE".equals(t.getStatus().name()))
                .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(now))
                .count();

        // ── M50: Health score & risk flags ──
        List<String> risks = new ArrayList<>();
        int healthScore = 100;

        // Risk: high % of unassigned open issues
        if (r.openIssues > 0) {
            double unassignedPct = (double) r.unassignedCount / r.openIssues * 100;
            if (unassignedPct > 50) { risks.add("Over 50% of open issues are unassigned"); healthScore -= 20; }
            else if (unassignedPct > 25) { risks.add("Over 25% of open issues are unassigned"); healthScore -= 10; }
        }

        // Risk: overdue issues
        if (r.overdueCount > 0) {
            risks.add(r.overdueCount + " overdue issue" + (r.overdueCount > 1 ? "s" : ""));
            healthScore -= Math.min(30, r.overdueCount * 5);
        }

        // Risk: stale issues
        if (!r.staleIssues.isEmpty()) {
            risks.add(r.staleIssues.size() + " stale issue" + (r.staleIssues.size() > 1 ? "s" : "") + " (14+ days without update)");
            healthScore -= Math.min(20, r.staleIssues.size() * 3);
        }

        // Risk: too many high-priority open issues
        long highPrioOpen = issues.stream()
                .filter(t -> !"DONE".equals(t.getStatus().name()) && "HIGH".equals(t.getPriority().name()))
                .count();
        if (highPrioOpen > 5) { risks.add(highPrioOpen + " open HIGH priority issues"); healthScore -= 15; }
        else if (highPrioOpen > 2) { risks.add(highPrioOpen + " open HIGH priority issues"); healthScore -= 5; }

        // Risk: low completion rate
        if (r.totalIssues > 5) {
            double completionPct = (double) r.doneIssues / r.totalIssues * 100;
            if (completionPct < 10) { risks.add("Completion rate below 10%"); healthScore -= 15; }
        }

        // Average velocity (from last 3 sprints)
        double avgVelocity = 0;
        if (!r.sprintVelocity.isEmpty()) {
            int lookback = Math.min(3, r.sprintVelocity.size());
            int sum = 0;
            for (int i = r.sprintVelocity.size() - lookback; i < r.sprintVelocity.size(); i++) {
                sum += r.sprintVelocity.get(i).completed;
            }
            avgVelocity = (double) sum / lookback;
        }

        r.healthScore = Math.max(0, healthScore);
        r.risks = risks;
        r.avgVelocity = Math.round(avgVelocity * 10) / 10.0;
        r.highPriorityOpenCount = (int) highPrioOpen;

        return r;
    }

    @GetMapping("/cfd")
    public List<Map<String, Object>> cumulativeFlowDiagram(@PathVariable String projectKey,
                                                            @RequestParam(defaultValue = "30") int days) {
        Project p = projectService.getByKey(projectKey);
        List<Task> issues = taskRepo.findByProjectIdWithRelations(p.getId());

        // For each day in range, count issues per status by replaying events
        // Simple approach: for each day, count issues that existed and determine their status on that day
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(Math.min(days, 90));

        // Get all activities for this project's tasks
        List<Long> taskIds = issues.stream().map(Task::getId).toList();

        // Build a map of task -> list of status changes (date -> newStatus)
        Map<Long, TreeMap<LocalDate, String>> statusHistory = new HashMap<>();
        for (Task t : issues) {
            TreeMap<LocalDate, String> hist = new TreeMap<>();
            // Initial status at creation
            LocalDate created = t.getCreatedAt() != null ? t.getCreatedAt().toLocalDate() : start;
            hist.put(created, "PENDING"); // default creation status
            statusHistory.put(t.getId(), hist);
        }

        // Overlay actual status change events from activity logs
        for (Task t : issues) {
            List<ActivityLog> logs = activityLogRepo.findByTaskIdWithActor(t.getId());
            for (ActivityLog log : logs) {
                if ("FIELD_CHANGED".equals(log.getActivityType()) && "status".equals(log.getField())) {
                    LocalDate day = log.getAt().toLocalDate();
                    statusHistory.get(t.getId()).put(day, log.getNewValue());
                }
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            int pending = 0, inProgress = 0, done = 0;
            for (Task t : issues) {
                LocalDate created = t.getCreatedAt() != null ? t.getCreatedAt().toLocalDate() : start;
                if (created.isAfter(day)) continue; // issue didn't exist yet

                TreeMap<LocalDate, String> hist = statusHistory.get(t.getId());
                Map.Entry<LocalDate, String> entry = hist.floorEntry(day);
                String status = entry != null ? entry.getValue() : "PENDING";
                switch (status) {
                    case "IN_PROGRESS" -> inProgress++;
                    case "DONE" -> done++;
                    default -> pending++;
                }
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", day.toString());
            m.put("PENDING", pending);
            m.put("IN_PROGRESS", inProgress);
            m.put("DONE", done);
            result.add(m);
        }
        return result;
    }

    @Data
    public static class AnalyticsResponse {
        int totalIssues;
        int openIssues;
        int doneIssues;
        int unassignedCount;
        Map<String, Long> statusBreakdown;
        Map<String, Long> priorityBreakdown;
        Map<String, Long> typeBreakdown;
        List<AssigneeStats> assigneeWorkload;
        List<SprintVelocity> sprintVelocity;
        List<StaleIssue> staleIssues;
        int overdueCount;
        // M50: Health
        int healthScore;
        List<String> risks;
        double avgVelocity;
        int highPriorityOpenCount;
    }

    @Data
    public static class AssigneeStats {
        String username;
        int total;
        int open;
        int done;
    }

    @Data
    public static class SprintVelocity {
        String sprintName;
        int committed;
        int completed;
    }

    @Data
    public static class StaleIssue {
        String issueKey;
        String title;
        String status;
        long daysSinceUpdate;
        String assignee;
    }
}
