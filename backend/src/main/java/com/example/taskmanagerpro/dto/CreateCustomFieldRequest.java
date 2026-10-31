package com.example.taskmanagerpro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCustomFieldRequest {
    @NotBlank
    @Size(max = 64)
    private String name;
    @NotNull
    @Pattern(regexp = "TEXT|NUMBER|DATE|SELECT",
            message = "must be one of TEXT, NUMBER, DATE, or SELECT")
    private String fieldType;  // TEXT, NUMBER, DATE, SELECT
    private String options;    // JSON array for SELECT
    private Boolean required;
    private Integer sortOrder;
}
