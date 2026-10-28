package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.Sprint;
import com.example.taskmanagerpro.model.enums.SprintState;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SprintDTO {
    private Long id;
    private String name;
    private String goal;
    private SprintState state;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime startedAt;
    private LocalDateTime closedAt;
    private String projectKey;
    private Long issueCount;
    private Long doneCount;
    private Integer totalPoints;
    private Integer donePoints;

    public static SprintDTO from(Sprint s) {
        return SprintDTO.builder()
                .id(s.getId())
                .name(s.getName())
                .goal(s.getGoal())
                .state(s.getState())
                .startDate(s.getStartDate())
                .endDate(s.getEndDate())
                .startedAt(s.getStartedAt())
                .closedAt(s.getClosedAt())
                .projectKey(s.getProject() == null ? null : s.getProject().getKey())
                .build();
    }
}
