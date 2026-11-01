package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.TaskStatus;

public interface ProjectStatusCountProjection {
    Long getProjectId();
    TaskStatus getStatus();
    long getCount();
}

