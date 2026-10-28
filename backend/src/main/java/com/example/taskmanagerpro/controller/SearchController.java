package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.Mapper;
import com.example.taskmanagerpro.dto.TaskDTO;
import com.example.taskmanagerpro.model.ActivityLog;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.service.ProjectService;
import com.example.taskmanagerpro.service.SearchService;
import com.example.taskmanagerpro.repository.ActivityLogRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SearchController {

    private final SearchService searchService;
    private final TaskRepository taskRepository;
    private final ActivityLogRepository activityLogRepository;

    public SearchController(SearchService searchService, TaskRepository taskRepository,
                            ActivityLogRepository activityLogRepository) {
        this.searchService = searchService;
        this.taskRepository = taskRepository;
        this.activityLogRepository = activityLogRepository;
    }

    @GetMapping("/search")
    public List<TaskDTO> search(@RequestParam String q) {
        if (q == null || q.isBlank()) return List.of();
        return Mapper.toTaskDTOList(searchService.search(q));
    }

    @GetMapping("/search/advanced")
    public List<TaskDTO> advancedSearch(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String issueType,
            @RequestParam(required = false) String assignee,
            @RequestParam(required = false) String projectKey,
            @RequestParam(defaultValue = "100") int limit) {
        return Mapper.toTaskDTOList(
                searchService.advancedSearch(q, status, priority, issueType, assignee, projectKey,
                        Math.min(limit, 200)));
    }

    @GetMapping("/my-issues")
    public List<TaskDTO> myIssues(@RequestParam(defaultValue = "true") boolean onlyOpen) {
        return Mapper.toTaskDTOList(searchService.myIssues(onlyOpen));
    }

    @GetMapping("/dashboard/stats")
    public Map<String, Object> dashboardStats() {
        return searchService.dashboardStats();
    }

    @GetMapping("/activity/recent")
    public List<Map<String, Object>> recentActivity(@RequestParam(defaultValue = "30") int limit) {
        return searchService.recentActivity(Math.min(limit, 100)).stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("activityType", a.getActivityType());
            m.put("field", a.getField());
            m.put("oldValue", a.getOldValue());
            m.put("newValue", a.getNewValue());
            m.put("message", a.getMessage());
            m.put("at", a.getAt());
            m.put("actorUsername", a.getActor() != null ? a.getActor().getUsername() : null);
            m.put("issueKey", a.getTask().getIssueKey());
            m.put("issueTitle", a.getTask().getTitle());
            m.put("projectKey", a.getTask().getProject().getKey());
            return m;
        }).toList();
    }

    @GetMapping("/issues/{issueKey}/subtasks")
    public List<TaskDTO> subtasks(@PathVariable String issueKey) {
        return Mapper.toTaskDTOList(searchService.subtasks(issueKey));
    }

    @GetMapping("/workload")
    public List<Map<String, Object>> workload() {
        List<Task> openTasks = taskRepository.findAllOpenWithRelations();

        // Group by assignee username
        Map<String, List<Task>> byUser = new LinkedHashMap<>();
        for (Task t : openTasks) {
            String username = t.getAssignee() != null ? t.getAssignee().getUsername() : "Unassigned";
            byUser.computeIfAbsent(username, k -> new java.util.ArrayList<>()).add(t);
        }

        return byUser.entrySet().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("username", e.getKey());
            m.put("totalOpen", e.getValue().size());
            m.put("highPriority", e.getValue().stream()
                    .filter(t -> t.getPriority() != null && "HIGH".equals(t.getPriority().name())).count());
            m.put("inProgress", e.getValue().stream()
                    .filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS).count());
            m.put("pending", e.getValue().stream()
                    .filter(t -> t.getStatus() == TaskStatus.PENDING).count());
            m.put("storyPoints", e.getValue().stream()
                    .mapToInt(t -> t.getStoryPoints() != null ? t.getStoryPoints() : 0).sum());
            m.put("overdue", e.getValue().stream()
                    .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(java.time.LocalDateTime.now())).count());
            m.put("issues", e.getValue().stream().map(t -> {
                Map<String, Object> im = new LinkedHashMap<>();
                im.put("issueKey", t.getIssueKey());
                im.put("title", t.getTitle());
                im.put("status", t.getStatus().name());
                im.put("priority", t.getPriority() != null ? t.getPriority().name() : null);
                im.put("issueType", t.getIssueType() != null ? t.getIssueType().name() : null);
                im.put("projectKey", t.getProject().getKey());
                return im;
            }).toList());
            return m;
        }).sorted((a, b) -> Integer.compare((int) b.get("totalOpen"), (int) a.get("totalOpen")))
          .toList();
    }

    @GetMapping("/admin/audit-log")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map<String, Object>> auditLog(@RequestParam(defaultValue = "200") int limit) {
        return activityLogRepository.findAllWithRelations().stream()
                .limit(Math.min(limit, 500))
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", a.getId());
                    m.put("activityType", a.getActivityType());
                    m.put("field", a.getField());
                    m.put("oldValue", a.getOldValue());
                    m.put("newValue", a.getNewValue());
                    m.put("message", a.getMessage());
                    m.put("at", a.getAt());
                    m.put("actorUsername", a.getActor() != null ? a.getActor().getUsername() : null);
                    m.put("issueKey", a.getTask() != null ? a.getTask().getIssueKey() : null);
                    m.put("issueTitle", a.getTask() != null ? a.getTask().getTitle() : null);
                    m.put("projectKey", a.getTask() != null && a.getTask().getProject() != null ? a.getTask().getProject().getKey() : null);
                    return m;
                }).toList();
    }
}
