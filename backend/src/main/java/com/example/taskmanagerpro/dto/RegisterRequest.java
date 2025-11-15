package com.example.taskmanagerpro.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String password;
    private String role = "USER"; // default value
}
