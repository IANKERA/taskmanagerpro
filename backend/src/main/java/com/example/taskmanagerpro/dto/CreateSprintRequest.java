package com.example.taskmanagerpro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateSprintRequest {
    @NotBlank
    @Size(max = 128)
    private String name;
    private String goal;
    private LocalDate startDate;
    private LocalDate endDate;
}
