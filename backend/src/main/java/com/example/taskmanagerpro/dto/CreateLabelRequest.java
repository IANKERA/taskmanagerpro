package com.example.taskmanagerpro.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateLabelRequest {
    @NotBlank
    @Size(max = 64)
    private String name;

    @Pattern(regexp = "^#[0-9a-fA-F]{3,8}$", message = "color must be a hex string like #6b7280")
    private String color;
}
