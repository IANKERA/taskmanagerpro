package com.example.taskmanagerpro.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeLogDTO {
    private Long id;
    private Integer minutes;
    private String description;
    private LocalDate loggedAt;
    private String username;
}
