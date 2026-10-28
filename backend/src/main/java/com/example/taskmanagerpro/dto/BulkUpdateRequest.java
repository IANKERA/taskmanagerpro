package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import lombok.Data;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

@Data
public class BulkUpdateRequest {
    @NotEmpty
    private List<String> issueKeys;
    /** If non-null, set status on all selected issues. */
    private TaskStatus status;
    /** If non-null, set priority on all selected issues. */
    private TaskPriority priority;
    /** If non-null, move all into this sprint (use -1 to move to backlog). */
    private Long sprintId;
    /** If non-null, set assignee (empty string to unassign). */
    private String assigneeUsername;
    /** If true, delete all selected issues. */
    private boolean delete;
}
