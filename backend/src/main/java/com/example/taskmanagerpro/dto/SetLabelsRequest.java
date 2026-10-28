package com.example.taskmanagerpro.dto;

import lombok.Data;

import java.util.List;

/** Replaces the issue's label set with exactly the provided IDs. Empty list clears labels. */
@Data
public class SetLabelsRequest {
    private List<Long> labelIds = List.of();
}
