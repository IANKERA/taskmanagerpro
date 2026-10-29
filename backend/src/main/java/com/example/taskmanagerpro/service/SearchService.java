package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.ActivityLog;
import com.example.taskmanagerpro.model.ProjectMembership;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.ActivityLogRepository;
import com.example.taskmanagerpro.repository.ProjectMembershipRepository;
import com.example.taskmanagerpro.repository.ProjectRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SearchService {

    private final TaskRepository taskRepo;
    private final ActivityLogRepository activityRepo;
    private final ProjectMembershipRepository membershipRepo;
    private final ProjectRepository projectRepo;
    private final ProjectService projectService;

    public SearchService(TaskRepository taskRepo,
                         ActivityLogRepository activityRepo,
                         ProjectMembershipRepository membershipRepo,
                         ProjectRepository projectRepo,
                         ProjectService projectService) {
        this.taskRepo = taskRepo;
        this.activityRepo = activityRepo;
        this.membershipRepo = membershipRepo;
        this.projectRepo = projectRepo;
        this.projectService = projectService;
    }

    @Transactional(readOnly = true)
    public List<Task> search(String query) {
        List<Long> projectIds = accessibleProjectIds();
        if (projectIds.isEmpty()) return List.of();
        return taskRepo.searchInProjects(query, projectIds);
    }

    @Transactional(readOnly = true)
    public List<Task> advancedSearch(String query, String status, String priority,
                                      String issueType, String assignee, String projectKey, int limit) {
        List<Long> projectIds = accessibleProjectIds();
        if (projectIds.isEmpty()) return List.of();

        // If projectKey filter, narrow down
        if (projectKey != null && !projectKey.isBlank()) {
            projectIds = projectIds.stream()
                    .filter(id -> projectRepo.findById(id)
                            .map(p -> p.getKey().equals(projectKey)).orElse(false))
                    .toList();
            if (projectIds.isEmpty()) return List.of();
        }

        // Start with text search or all issues
        List<Task> results;
        if (query != null && !query.isBlank()) {
            results = taskRepo.searchInProjects(query, projectIds);
        } else {
            results = new java.util.ArrayList<>();
            for (Long pid : projectIds) {
                results.addAll(taskRepo.findByProjectIdWithRelations(pid));
            }
            results.sort((a, b) -> {
                if (b.getUpdatedAt() != null && a.getUpdatedAt() != null)
                    return b.getUpdatedAt().compareTo(a.getUpdatedAt());
                return Long.compare(b.getId(), a.getId());
            });
        }

        // Apply filters
        var stream = results.stream();
        if (status != null && !status.isBlank())
            stream = stream.filter(t -> t.getStatus().name().equals(status));
        if (priority != null && !priority.isBlank())
            stream = stream.filter(t -> t.getPriority().name().equals(priority));
        if (issueType != null && !issueType.isBlank())
            stream = stream.filter(t -> t.getIssueType().name().equals(issueType));
        if (assignee != null && !assignee.isBlank()) {
            if (assignee.equals("__unassigned__"))
                stream = stream.filter(t -> t.getAssignee() == null);
            else
                stream = stream.filter(t -> t.getAssignee() != null && t.getAssignee().getUsername().equals(assignee));
        }

        return stream.limit(limit).toList();
    }

    @Transactional(readOnly = true)
    public List<Task> myIssues(boolean onlyOpen) {
        User user = projectService.currentUser();
        return taskRepo.findAssignedToUser(user.getId(), onlyOpen);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboardStats() {
        List<Long> projectIds = accessibleProjectIds();

        long totalOpen = 0, totalInProgress = 0, totalDone = 0;
        if (!projectIds.isEmpty()) {
            totalOpen = taskRepo.countByProjectIdsAndStatus(projectIds, TaskStatus.PENDING);
            totalInProgress = taskRepo.countByProjectIdsAndStatus(projectIds, TaskStatus.IN_PROGRESS);
            totalDone = taskRepo.countByProjectIdsAndStatus(projectIds, TaskStatus.DONE);
        }

        User user = projectService.currentUser();
        long myOpen = taskRepo.countAssignedToUserOpen(user.getId());

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("projectCount", projectIds.size());
        stats.put("totalOpen", totalOpen);
        stats.put("totalInProgress", totalInProgress);
        stats.put("totalDone", totalDone);
        stats.put("myOpenIssueCount", myOpen);
        return stats;
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> recentActivity(int limit) {
        List<Long> projectIds = accessibleProjectIds();
        if (projectIds.isEmpty()) return List.of();
        List<ActivityLog> all = activityRepo.findRecentByProjects(projectIds);
        return all.size() > limit ? all.subList(0, limit) : all;
    }

    @Transactional(readOnly = true)
    public List<Task> subtasks(String issueKey) {
        Task parent = taskRepo.findByIssueKeyWithRelations(issueKey)
                .orElse(null);
        if (parent == null) return List.of();
        projectService.requireProjectRole(parent.getProject().getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return taskRepo.findByParentId(parent.getId());
    }

    @Transactional(readOnly = true)
    public List<Task> workloadTasks() {
        List<Long> projectIds = accessibleProjectIds();
        if (projectIds.isEmpty()) return List.of();
        return taskRepo.findAllOpenWithRelationsByProjectIds(projectIds);
    }

    private List<Long> accessibleProjectIds() {
        boolean isGlobalAdmin = SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isGlobalAdmin) {
            return projectRepo.findAll().stream().map(p -> p.getId()).toList();
        }
        User user = projectService.currentUser();
        return membershipRepo.findByUserId(user.getId()).stream()
                .map(m -> m.getProject().getId())
                .toList();
    }
}
