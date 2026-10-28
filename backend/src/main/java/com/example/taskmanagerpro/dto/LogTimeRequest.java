package com.example.taskmanagerpro.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class LogTimeRequest {
    @NotNull @Min(1)
    private Integer minutes;
    private String description;
    /** Defaults to today if not provided. */
    private LocalDate loggedAt;
}
