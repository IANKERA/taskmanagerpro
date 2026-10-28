package com.example.taskmanagerpro.dto;

import lombok.Data;

import java.time.LocalDate;

/** PATCH semantics — nulls leave fields unchanged. State transitions go through dedicated endpoints. */
@Data
public class UpdateSprintRequest {
    private String name;
    private String goal;
    private LocalDate startDate;
    private LocalDate endDate;
}
