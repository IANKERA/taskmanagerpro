package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {
    private Long id;

    /** New in M2 — read-only on responses, ignored on create. */
    private String issueKey;

    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;

    /** New in M2 — defaults to TASK. */
    private IssueType issueType;

    private LocalDate dueDate;

    // ── Assignee (legacy "user" alias kept below for the old frontend) ──
    private Long assigneeId;
    private String assigneeUsername;

    // ── Reporter (new in M2) ──
    private Long reporterId;
    private String reporterUsername;

    // ── Legacy compat: the old code uses "userId" / "username" to mean the assignee. ──
    /** @deprecated Use {@link #assigneeId}. Kept so the existing React frontend keeps working. */
    @Deprecated private Long userId;
    /** @deprecated Use {@link #assigneeUsername}. */
    @Deprecated private String username;

    // Project context (M1)
    private Long projectId;
    private String projectKey;

    // M4 — populated by Mapper#toTaskDTO when relations are session-attached.
    private java.util.List<LabelDTO> labels;
    private Integer watcherCount;
    private java.util.List<String> watcherUsernames;

    // M5
    private Long sprintId;
    private String sprintName;
    private com.example.taskmanagerpro.model.enums.SprintState sprintState;
    private Integer storyPoints;
    private String parentIssueKey;

    // M19 — time tracking
    private Integer estimateMinutes;
    private Integer loggedMinutes;

    // M61 — Epic progress
    private Integer childCount;
    private Integer childDoneCount;
}
