package com.example.taskmanagerpro.model.enums;

/**
 * Jira-style issue categories. M2 introduces this; M5 will add SUBTASK
 * once parent/child links are in place.
 */
public enum IssueType {
    STORY,
    TASK,
    BUG,
    EPIC
}
