package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.Project;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDTO {
    private Long id;
    private String key;
    private String name;
    private String description;
    private Long leadUserId;
    private String leadUsername;
    private Long nextIssueNum;
    private LocalDateTime createdAt;
    private Long openCount;
    private Long inProgressCount;
    private Long doneCount;
    private boolean archived;

    public static ProjectDTO from(Project p) {
        return ProjectDTO.builder()
                .id(p.getId())
                .key(p.getKey())
                .name(p.getName())
                .description(p.getDescription())
                .leadUserId(p.getLead() == null ? null : p.getLead().getId())
                .leadUsername(p.getLead() == null ? null : p.getLead().getUsername())
                .nextIssueNum(p.getNextIssueNum())
                .createdAt(p.getCreatedAt())
                .archived(p.isArchived())
                .build();
    }
}
