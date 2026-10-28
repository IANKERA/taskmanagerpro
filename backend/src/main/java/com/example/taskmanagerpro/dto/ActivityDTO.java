package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.ActivityLog;
import com.example.taskmanagerpro.model.enums.ActivityType;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityDTO {
    private Long id;
    private ActivityType activityType;
    private String field;
    private String oldValue;
    private String newValue;
    private String message;
    private String actorUsername;
    private String issueKey;
    private String projectKey;
    private LocalDateTime at;

    public static ActivityDTO from(ActivityLog a) {
        return ActivityDTO.builder()
                .id(a.getId())
                .activityType(a.getActivityType())
                .field(a.getField())
                .oldValue(a.getOldValue())
                .newValue(a.getNewValue())
                .message(a.getMessage())
                .actorUsername(a.getActor() == null ? null : a.getActor().getUsername())
                .issueKey(a.getTask() == null ? null : a.getTask().getIssueKey())
                .projectKey(a.getTask() == null || a.getTask().getProject() == null ? null : a.getTask().getProject().getKey())
                .at(a.getAt())
                .build();
    }
}
