package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import lombok.Data;

import java.time.LocalDate;

/** PATCH semantics — every field is optional; nulls mean "leave unchanged". */
@Data
public class UpdateIssueRequest {
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private IssueType issueType;
    private LocalDate dueDate;

    /** Pass empty string "" to explicitly unassign; null means "no change". */
    private String assigneeUsername;

    // M5
    /** Move into a sprint (id), out of any sprint (-1L), or leave unchanged (null). */
    private Long sprintId;
    /** Set to null to clear (use sentinel -1 to mean "clear"); 0 also means clear. */
    private Integer storyPoints;
    /** Set parent issue by key. Empty string "" clears it; null means no change. */
    private String parentIssueKey;

    // M19
    /** Estimated time in minutes. Use -1 or 0 to clear. */
    private Integer estimateMinutes;
}
