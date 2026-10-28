package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.ActivityLog;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.ActivityType;
import com.example.taskmanagerpro.repository.ActivityLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * Writes structured audit rows for everything that happens on an issue.
 * Called explicitly from IssueService / CommentService — chosen over a JPA
 * entity listener so we capture intent (assigned vs status change vs
 * description tweak), not just "the row changed".
 */
@Service
public class ActivityService {

    private final ActivityLogRepository repo;

    public ActivityService(ActivityLogRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public void logCreated(Task task, User actor) {
        repo.save(ActivityLog.builder()
                .task(task)
                .actor(actor)
                .activityType(ActivityType.CREATED)
                .message("Created " + task.getIssueKey())
                .build());
    }

    /** No-op when {@code oldValue} equals {@code newValue} — keeps the log clean. */
    @Transactional
    public void logFieldChange(Task task, User actor, String field, Object oldValue, Object newValue) {
        if (Objects.equals(oldValue, newValue)) return;
        repo.save(ActivityLog.builder()
                .task(task)
                .actor(actor)
                .activityType(ActivityType.FIELD_CHANGED)
                .field(field)
                .oldValue(oldValue == null ? null : oldValue.toString())
                .newValue(newValue == null ? null : newValue.toString())
                .build());
    }

    @Transactional
    public void logAssignment(Task task, User actor, User oldAssignee, User newAssignee) {
        Long oldId = oldAssignee == null ? null : oldAssignee.getId();
        Long newId = newAssignee == null ? null : newAssignee.getId();
        if (Objects.equals(oldId, newId)) return;

        ActivityType type = newAssignee == null ? ActivityType.UNASSIGNED : ActivityType.ASSIGNED;
        repo.save(ActivityLog.builder()
                .task(task)
                .actor(actor)
                .activityType(type)
                .field("assignee")
                .oldValue(oldAssignee == null ? null : oldAssignee.getUsername())
                .newValue(newAssignee == null ? null : newAssignee.getUsername())
                .build());
    }

    @Transactional
    public void logComment(Task task, User actor, Long commentId) {
        repo.save(ActivityLog.builder()
                .task(task)
                .actor(actor)
                .activityType(ActivityType.COMMENTED)
                .message("Comment #" + commentId)
                .build());
    }

    @Transactional(readOnly = true)
    public List<ActivityLog> listForTask(Long taskId) {
        return repo.findByTaskIdWithActor(taskId);
    }
}
