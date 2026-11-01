package com.example.taskmanagerpro.dto;

public interface SprintMetricsProjection {
    Long getSprintId();
    Long getIssueCount();
    Long getDoneCount();
    Number getTotalPoints();
    Number getDonePoints();
}

