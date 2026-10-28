package com.example.taskmanagerpro.model.enums;

/**
 * Per-project role. Distinct from the global {@link Role} enum, which gates
 * platform-wide admin actions. ProjectRole gates membership-scoped operations
 * (creating issues, deleting the project, etc.).
 */
public enum ProjectRole {
    ADMIN,   // Manage members, edit project settings, delete project
    MEMBER,  // Create/edit issues
    VIEWER   // Read-only
}
