package com.example.taskmanagerpro.model.enums;

public enum LinkType {
    BLOCKS,
    IS_BLOCKED_BY,
    RELATES_TO,
    DUPLICATES,
    IS_DUPLICATED_BY;

    /** Returns the inverse link type (for the "other side" of the relationship). */
    public LinkType inverse() {
        return switch (this) {
            case BLOCKS         -> IS_BLOCKED_BY;
            case IS_BLOCKED_BY  -> BLOCKS;
            case DUPLICATES     -> IS_DUPLICATED_BY;
            case IS_DUPLICATED_BY -> DUPLICATES;
            case RELATES_TO     -> RELATES_TO;
        };
    }
}
