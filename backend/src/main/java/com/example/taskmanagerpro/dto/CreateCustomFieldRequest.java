package com.example.taskmanagerpro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCustomFieldRequest {
    @NotBlank
    private String name;
    @NotNull
    private String fieldType;  // TEXT, NUMBER, DATE, SELECT
    private String options;    // JSON array for SELECT
    private Boolean required;
    private Integer sortOrder;
}
