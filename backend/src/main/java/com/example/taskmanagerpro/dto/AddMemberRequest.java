package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.ProjectRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddMemberRequest {
    @NotBlank
    private String username;

    @NotNull
    private ProjectRole projectRole;
}
