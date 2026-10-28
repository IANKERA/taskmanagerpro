package com.example.taskmanagerpro.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SetFieldValueRequest {
    @NotNull
    private Long fieldId;
    private String value;  // null to clear
}
