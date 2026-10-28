package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateIssueRequest {
    @NotBlank
    @Size(max = 1024)
    private String title;

    private String description;

    private TaskStatus status;     // defaults to PENDING if null
    private TaskPriority priority; // defaults to MEDIUM if null
    private IssueType issueType;   // defaults to TASK if null

    private LocalDate dueDate;

    /** Optional — issues can be unassigned. */
    private String assigneeUsername;
}
