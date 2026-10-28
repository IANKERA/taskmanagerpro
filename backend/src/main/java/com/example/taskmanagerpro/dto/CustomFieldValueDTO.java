package com.example.taskmanagerpro.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomFieldValueDTO {
    private Long fieldId;
    private String name;
    private String fieldType;
    private String options;
    private String value;
}
