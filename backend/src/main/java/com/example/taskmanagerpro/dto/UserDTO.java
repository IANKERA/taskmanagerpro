package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String username;
    private Role role;
    private List<Long> taskIds; // only store task IDs, no recursion
}
