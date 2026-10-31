package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.LinkType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateLinkRequest {
    @NotBlank
    private String targetIssueKey;
    @NotNull
    private LinkType linkType;
}
