package com.example.taskmanagerpro.dto;

public interface EpicChildCountProjection {
    Long getParentId();
    Long getChildCount();
    Long getChildDoneCount();
}
