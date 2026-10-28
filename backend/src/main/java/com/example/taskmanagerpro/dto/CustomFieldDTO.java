package com.example.taskmanagerpro.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomFieldDTO {
    private Long id;
    private String name;
    private String fieldType;
    private String options;   // JSON array string for SELECT
    private Boolean required;
    private Integer sortOrder;
}
