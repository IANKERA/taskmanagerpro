package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.CreateIssueRequest;
import com.example.taskmanagerpro.dto.UpdateIssueRequest;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Sprint;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.IssueLinkRepository;
import com.example.taskmanagerpro.repository.SprintRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.repository.TimeLogRepository;
import com.example.taskmanagerpro.repository.UserRepository;
import com.example.taskmanagerpro.model.TimeLog;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

import static org.springframework.http.HttpStatus.*;

/**
 * Jira-shaped API on top of the same {@code tasks} table. Distinct from
 * {@link TaskService} which preserves the older "task is owned by a user" semantics
 * for the legacy /api/tasks endpoints and the existing React frontend.
 */
@Service
public class IssueService {

    private final TaskRepository taskRepo;
    private final UserRepository userRepo;
    private final ProjectService projectService;
    private final IssueKeyAllocator issueKeyAllocator;
    private final ActivityService activityService;
    private final SprintRepository sprintRepo;
    private final NotificationService notificationService;
    private final IssueLinkRepository linkRepo;
    private final TimeLogRepository timeLogRepo;
    private final WorkflowEngine workflowEngine;
    private final AttachmentCleanupService attachmentCleanupService;

    public IssueService(TaskRepository taskRepo,
                        UserRepository userRepo,
                        ProjectService projectService,
                        IssueKeyAllocator issueKeyAllocator,
                        ActivityService activityService,
                        SprintRepository sprintRepo,
                        NotificationService notificationService,
                        IssueLinkRepository linkRepo,
                        TimeLogRepository timeLogRepo,
                        WorkflowEngine workflowEngine,
                        AttachmentCleanupService attachmentCleanupService) {
        this.taskRepo = taskRepo;
        this.userRepo = userRepo;
        this.projectService = projectService;
        this.issueKeyAllocator = issueKeyAllocator;
        this.activityService = activityService;
        this.sprintRepo = sprintRepo;
        this.notificationService = notificationService;
        this.linkRepo = linkRepo;
        this.timeLogRepo = timeLogRepo;
        this.workflowEngine = workflowEngine;
        this.attachmentCleanupService = attachmentCleanupService;
    }

    @Transactional(readOnly = true)
    public List<Task> listForProject(String projectKey) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        // Force lazy fields for downstream DTO mapping.
        List<Task> tasks = taskRepo.findByProjectIdWithRelations(p.getId());
        return tasks;
    }

    @Transactional(readOnly = true)
    public Task getByIssueKey(String issueKey) {
        Task t = taskRepo.findByIssueKeyWithRelations(issueKey)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Issue not found: " + issueKey));
        projectService.requireProjectRole(t.getProject().getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return t;
    }

    @Transactional(readOnly = true)
    public Task getByIssueKeyForMember(String issueKey) {
        Task t = getByIssueKey(issueKey);
        projectService.requireProjectRole(t.getProject().getId(),
                ProjectRole.MEMBER, ProjectRole.ADMIN);
        return t;
    }

    @Transactional
    public Task create(String projectKey, CreateIssueRequest req) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);

        User reporter = projectService.currentUser();
        User assignee = resolveAssignee(p.getId(), req.getAssigneeUsername());

        Task t = Task.builder()
                .project(p)
                .issueKey(issueKeyAllocator.allocate(p.getId()))
                .title(req.getTitle())
                .description(req.getDescription())
                .status(req.getStatus() != null ? req.getStatus() : TaskStatus.PENDING)
                .priority(req.getPriority() != null ? req.getPriority() : TaskPriority.MEDIUM)
                .issueType(req.getIssueType() != null ? req.getIssueType() : IssueType.TASK)
                .dueDate(req.getDueDate() == null ? null : req.getDueDate().atStartOfDay())
                .reporter(reporter)
                .assignee(assignee)
                .build();
        t = taskRepo.save(t);
        activityService.logCreated(t, reporter);
        if (assignee != null) {
            activityService.logAssignment(t, reporter, null, assignee);
        }
        return t;
    }

    /** Used by scheduled tasks (no security context). Saves a pre-built Task. */
    @Transactional
    public Task saveDirectly(Task t, User actor) {
        if (t.getAssignee() != null) {
            projectService.requireAssignableMember(t.getProject().getId(), t.getAssignee().getId());
        }
        t = taskRepo.save(t);
        activityService.logCreated(t, actor);
        if (t.getAssignee() != null) {
            activityService.logAssignment(t, actor, null, t.getAssignee());
        }
        return t;
    }

    @Transactional
    public Task update(String issueKey, UpdateIssueRequest req) {
        Task t = getByIssueKey(issueKey);
        projectService.requireProjectRole(t.getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        User actor = projectService.currentUser();

        if (req.getTitle() != null && !req.getTitle().equals(t.getTitle())) {
            activityService.logFieldChange(t, actor, "title", t.getTitle(), req.getTitle());
            t.setTitle(req.getTitle());
        }
        if (req.getDescription() != null && !req.getDescription().equals(t.getDescription())) {
            // Don't echo full descriptions into the log — they can be huge.
            activityService.logFieldChange(t, actor, "description", "(updated)", "(updated)");
            t.setDescription(req.getDescription());
        }
        if (req.getStatus() != null && req.getStatus() != t.getStatus()) {
            activityService.logFieldChange(t, actor, "status", t.getStatus(), req.getStatus());
            t.setStatus(req.getStatus());
        }
        if (req.getPriority() != null && req.getPriority() != t.getPriority()) {
            activityService.logFieldChange(t, actor, "priority", t.getPriority(), req.getPriority());
            t.setPriority(req.getPriority());
        }
        if (req.getIssueType() != null && req.getIssueType() != t.getIssueType()) {
            activityService.logFieldChange(t, actor, "issueType", t.getIssueType(), req.getIssueType());
            t.setIssueType(req.getIssueType());
        }
        if (req.getDueDate() != null) {
            t.setDueDate(req.getDueDate().atStartOfDay());
        }
        if (req.getAssigneeUsername() != null) {
            User newAssignee = resolveAssignee(t.getProject().getId(), req.getAssigneeUsername());
            activityService.logAssignment(t, actor, t.getAssignee(), newAssignee);
            t.setAssignee(newAssignee);
        }

        // M5: sprint, parent, story points
        if (req.getSprintId() != null) {
            Sprint newSprint = null;
            if (req.getSprintId() >= 0) {
                newSprint = sprintRepo.findById(req.getSprintId())
                        .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST,
                                "Sprint not found: " + req.getSprintId()));
                if (!newSprint.getProject().getId().equals(t.getProject().getId())) {
                    throw new ResponseStatusException(BAD_REQUEST, "Sprint belongs to a different project");
                }
            }
            String oldName = t.getSprint() == null ? "(backlog)" : t.getSprint().getName();
            String newName = newSprint == null ? "(backlog)" : newSprint.getName();
            if (!java.util.Objects.equals(oldName, newName)) {
                activityService.logFieldChange(t, actor, "sprint", oldName, newName);
            }
            t.setSprint(newSprint);
        }
        if (req.getStoryPoints() != null) {
            Integer newSp = req.getStoryPoints() <= 0 ? null : req.getStoryPoints();
            if (!java.util.Objects.equals(t.getStoryPoints(), newSp)) {
                activityService.logFieldChange(t, actor, "storyPoints", t.getStoryPoints(), newSp);
                t.setStoryPoints(newSp);
            }
        }
        if (req.getParentIssueKey() != null) {
            Task newParent = null;
            if (!req.getParentIssueKey().isBlank()) {
                newParent = taskRepo.findByIssueKeyWithRelations(req.getParentIssueKey())
                        .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST,
                                "Parent issue not found: " + req.getParentIssueKey()));
                if (!newParent.getProject().getId().equals(t.getProject().getId())) {
                    throw new ResponseStatusException(BAD_REQUEST, "Parent is in a different project");
                }
                if (newParent.getId().equals(t.getId())) {
                    throw new ResponseStatusException(BAD_REQUEST, "An issue cannot be its own parent");
                }
            }
            String oldKey = t.getParent() == null ? null : t.getParent().getIssueKey();
            String newKey = newParent == null ? null : newParent.getIssueKey();
            if (!java.util.Objects.equals(oldKey, newKey)) {
                activityService.logFieldChange(t, actor, "parent", oldKey, newKey);
            }
            t.setParent(newParent);
        }
        // M19: estimate
        if (req.getEstimateMinutes() != null) {
            Integer newEst = req.getEstimateMinutes() <= 0 ? null : req.getEstimateMinutes();
            t.setEstimateMinutes(newEst);
        }

        // Evaluate workflow rules for changed fields
        if (req.getStatus() != null) workflowEngine.evaluate(t, "status", req.getStatus().name(), actor);
        if (req.getPriority() != null) workflowEngine.evaluate(t, "priority", req.getPriority().name(), actor);
        if (req.getIssueType() != null) workflowEngine.evaluate(t, "issueType", req.getIssueType().name(), actor);
        if (req.getAssigneeUsername() != null) workflowEngine.evaluate(t, "assignee", req.getAssigneeUsername(), actor);

        Task saved = taskRepo.save(t);

        // Notify watchers about the update
        try {
            String notifTitle = actor.getUsername() + " updated " + saved.getIssueKey();
            StringBuilder msg = new StringBuilder();
            if (req.getStatus() != null) msg.append("Status changed to ").append(req.getStatus()).append(". ");
            if (req.getAssigneeUsername() != null) msg.append("Assigned to ").append(req.getAssigneeUsername().isBlank() ? "nobody" : req.getAssigneeUsername()).append(". ");
            if (req.getPriority() != null) msg.append("Priority set to ").append(req.getPriority()).append(". ");
            notificationService.notifyWatchers(saved, actor, "ISSUE_UPDATED", notifTitle,
                    msg.length() > 0 ? msg.toString().trim() : null);

            // Also notify the new assignee specifically if they're not a watcher
            if (req.getAssigneeUsername() != null && !req.getAssigneeUsername().isBlank()) {
                User newAssignee = saved.getAssignee();
                if (newAssignee != null && !newAssignee.getId().equals(actor.getId())) {
                    notificationService.notifyUser(newAssignee, saved, "ASSIGNED",
                            actor.getUsername() + " assigned you to " + saved.getIssueKey(), null);
                }
            }
        } catch (Exception ignored) { /* don't fail the update if notification fails */ }

        return saved;
    }

    /** Backlog = issues in this project not attached to any sprint, ordered by id. */
    @Transactional(readOnly = true)
    public List<Task> backlog(String projectKey) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return taskRepo.findBacklog(p.getId());
    }

    /** Issues attached to a specific sprint. */
    @Transactional(readOnly = true)
    public List<Task> issuesInSprint(Long sprintId) {
        Sprint s = sprintRepo.findById(sprintId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Sprint not found"));
        projectService.requireProjectRole(s.getProject().getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return taskRepo.findBySprintIdWithRelations(sprintId);
    }

    @Transactional
    public void delete(String issueKey) {
        Task t = getByIssueKey(issueKey);
        projectService.requireProjectRole(t.getProject().getId(), ProjectRole.ADMIN);
        attachmentCleanupService.enqueueForTask(t.getId());
        taskRepo.delete(t);
    }

    // ───── M18: Issue linking ─────

    @Transactional(readOnly = true)
    public List<com.example.taskmanagerpro.model.IssueLink> listLinks(String issueKey) {
        Task t = getByIssueKey(issueKey);
        List<com.example.taskmanagerpro.model.IssueLink> links = linkRepo.findByTaskId(t.getId());
        for (var link : links) {
            Task other = link.getSource().getId().equals(t.getId())
                    ? link.getTarget()
                    : link.getSource();
            projectService.requireProjectRole(other.getProject().getId(),
                    ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        }
        return links;
    }

    @Transactional
    public com.example.taskmanagerpro.model.IssueLink createLink(String sourceKey,
                                                                  com.example.taskmanagerpro.dto.CreateLinkRequest req) {
        Task source = getByIssueKey(sourceKey);
        Task target = taskRepo.findByIssueKeyWithRelations(req.getTargetIssueKey())
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Target not found: " + req.getTargetIssueKey()));
        projectService.requireProjectRole(source.getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        projectService.requireProjectRole(target.getProject().getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);

        if (source.getId().equals(target.getId()))
            throw new ResponseStatusException(BAD_REQUEST, "Cannot link an issue to itself");
        if (linkRepo.existsLink(source.getId(), target.getId(), req.getLinkType()))
            throw new ResponseStatusException(BAD_REQUEST, "Link already exists");

        var link = com.example.taskmanagerpro.model.IssueLink.builder()
                .source(source).target(target).linkType(req.getLinkType()).build();
        return linkRepo.save(link);
    }

    @Transactional
    public void deleteLink(Long linkId) {
        var link = linkRepo.findById(linkId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Link not found"));
        projectService.requireProjectRole(link.getSource().getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        projectService.requireProjectRole(link.getTarget().getProject().getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        linkRepo.delete(link);
    }

    @Transactional
    public void deleteTimeLog(String issueKey, Long logId) {
        Task task = getByIssueKey(issueKey);
        TimeLog timeLog = timeLogRepo.findByIdAndTaskId(logId, task.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Time log not found"));
        User currentUser = projectService.currentUser();
        boolean isAuthor = timeLog.getUser().getId().equals(currentUser.getId());
        boolean isProjectAdmin = projectService.hasProjectRole(
                task.getProject().getId(), ProjectRole.ADMIN);
        if (!isAuthor && !isProjectAdmin) {
            throw new ResponseStatusException(FORBIDDEN, "Only the time-log author or a project admin can delete it");
        }
        timeLogRepo.delete(timeLog);
    }

    // ───── M18: Bulk update ─────

    @Transactional
    public List<Task> bulkUpdate(String projectKey, com.example.taskmanagerpro.dto.BulkUpdateRequest req) {
        Project p = projectService.getByKey(projectKey);
        if (req.isDelete()) {
            projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);
        } else {
            projectService.requireProjectRole(p.getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        }
        User actor = projectService.currentUser();

        Sprint newSprint = null;
        if (req.getSprintId() != null && req.getSprintId() >= 0) {
            newSprint = sprintRepo.findById(req.getSprintId())
                    .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Sprint not found"));
            if (!newSprint.getProject().getId().equals(p.getId()))
                throw new ResponseStatusException(BAD_REQUEST, "Sprint belongs to a different project");
        }
        User newAssignee = null;
        boolean changeAssignee = req.getAssigneeUsername() != null;
        if (changeAssignee && !req.getAssigneeUsername().isBlank()) {
            newAssignee = resolveAssignee(p.getId(), req.getAssigneeUsername());
        }

        List<Task> updated = new ArrayList<>();
        for (String key : req.getIssueKeys()) {
            Task t = taskRepo.findByIssueKeyWithRelations(key).orElse(null);
            if (t == null || !t.getProject().getId().equals(p.getId())) continue;

            // Delete mode
            if (req.isDelete()) {
                attachmentCleanupService.enqueueForTask(t.getId());
                taskRepo.delete(t);
                continue;
            }

            if (req.getStatus() != null && req.getStatus() != t.getStatus()) {
                activityService.logFieldChange(t, actor, "status", t.getStatus(), req.getStatus());
                t.setStatus(req.getStatus());
            }
            if (req.getPriority() != null && req.getPriority() != t.getPriority()) {
                activityService.logFieldChange(t, actor, "priority", t.getPriority(), req.getPriority());
                t.setPriority(req.getPriority());
            }
            if (req.getSprintId() != null) {
                t.setSprint(req.getSprintId() < 0 ? null : newSprint);
            }
            if (changeAssignee) {
                t.setAssignee(req.getAssigneeUsername().isBlank() ? null : newAssignee);
            }
            updated.add(taskRepo.save(t));
        }
        return updated;
    }

    @Transactional
    public void reorder(String projectKey, List<String> issueKeys) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        for (int i = 0; i < issueKeys.size(); i++) {
            Task t = taskRepo.findByIssueKeyWithRelations(issueKeys.get(i)).orElse(null);
            if (t != null && t.getProject().getId().equals(p.getId())) {
                t.setSortOrder(i);
                taskRepo.save(t);
            }
        }
    }

    @Transactional
    public Task toggleWatch(String issueKey) {
        Task t = getByIssueKey(issueKey);
        User u = projectService.currentUser();
        if (t.getWatchers().contains(u)) {
            t.getWatchers().remove(u);
        } else {
            t.getWatchers().add(u);
        }
        return taskRepo.save(t);
    }

    @Transactional
    public Task moveToProject(String issueKey, String targetProjectKey) {
        Task t = getByIssueKey(issueKey);
        Project source = t.getProject();
        Project target = projectService.getByKey(targetProjectKey);
        if (source.getId().equals(target.getId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Issue is already in project " + targetProjectKey);
        }
        projectService.requireProjectRole(source.getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        projectService.requireProjectRole(target.getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        if (t.getAssignee() != null) {
            projectService.requireAssignableMember(target.getId(), t.getAssignee().getId());
        }

        String oldKey = t.getIssueKey();
        String newKey = issueKeyAllocator.allocate(target.getId());
        t.setProject(target);
        t.setIssueKey(newKey);
        t.setSprint(null); // clear sprint since it belongs to old project
        t = taskRepo.save(t);

        User actor = projectService.currentUser();
        activityService.logFieldChange(t, actor, "project", source.getKey() + " (" + oldKey + ")", target.getKey() + " (" + newKey + ")");
        return t;
    }

    private User resolveAssignee(Long projectId, String username) {
        if (username == null || username.isBlank()) return null;
        User assignee = userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Assignee not found: " + username));
        projectService.requireAssignableMember(projectId, assignee.getId());
        return assignee;
    }
}
