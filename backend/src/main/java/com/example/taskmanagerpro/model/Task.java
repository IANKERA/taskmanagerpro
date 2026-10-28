package com.example.taskmanagerpro.model;

import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Task is the persisted entity for what the Jira-clone API exposes as an "Issue".
 * The class is still named Task for backwards compatibility with the existing
 * /api/tasks endpoints and the React frontend; a future tidy-up pass will
 * rename it to Issue once those clients are migrated.
 */
@Entity
@Table(name = "tasks",
        uniqueConstraints = @UniqueConstraint(name = "uq_tasks_issue_key", columnNames = "issue_key"),
        indexes = {
                @Index(name = "idx_tasks_project",  columnList = "project_id"),
                @Index(name = "idx_tasks_assignee", columnList = "assignee_id"),
                @Index(name = "idx_tasks_reporter", columnList = "reporter_id")
        })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    /** Human-facing key like "DEMO-1". Allocated atomically from {@link Project#getNextIssueNum()}. */
    @Column(name = "issue_key", nullable = false, length = 32)
    private String issueKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TaskPriority priority = TaskPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(name = "issue_type", nullable = false, length = 16)
    @Builder.Default
    private IssueType issueType = IssueType.TASK;

    private LocalDateTime dueDate;

    /** Optional — Jira allows unassigned issues. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    @JsonBackReference("assignee-tasks")
    private User assignee;

    /** Required — who filed the issue. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ───── M5: Sprint + parent + story points ─────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    /** Self-FK for subtasks and Epic→Story links. Null for top-level issues. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Task parent;

    @Column(name = "story_points")
    private Integer storyPoints;

    @Column(name = "estimate_minutes")
    private Integer estimateMinutes;

    @Column(name = "sort_order")
    @Builder.Default
    private int sortOrder = 0;

    // ───── M4: Labels (project-scoped) ─────
    @ManyToMany
    @JoinTable(name = "task_labels",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "label_id"))
    @Builder.Default
    private Set<Label> labels = new HashSet<>();

    // ───── M4: Watchers (users following updates) ─────
    @ManyToMany
    @JoinTable(name = "watchers",
            joinColumns = @JoinColumn(name = "task_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    @Builder.Default
    private Set<User> watchers = new HashSet<>();

    // ───── Compatibility shim ─────
    // The old code (TaskService, frontend) calls task.getUser() / setUser() expecting "the owner".
    // For Jira semantics that's the assignee — alias here so we don't have to touch every callsite.
    @Transient
    public User getUser() { return assignee; }
    @Transient
    public void setUser(User u) { this.assignee = u; }
}
