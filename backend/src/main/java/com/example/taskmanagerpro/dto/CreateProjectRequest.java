package com.example.taskmanagerpro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateProjectRequest {

    @NotBlank
    @Pattern(regexp = "^[A-Z][A-Z0-9]{1,15}$",
            message = "Project key must be 2-16 chars, uppercase letters/digits, starting with a letter")
    private String key;

    @NotBlank
    @Size(max = 255)
    private String name;

    private String description;
}
