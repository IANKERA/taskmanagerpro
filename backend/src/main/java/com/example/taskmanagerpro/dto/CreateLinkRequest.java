package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.LinkType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateLinkRequest {
    @NotNull
    private String targetIssueKey;
    @NotNull
    private LinkType linkType;
}
