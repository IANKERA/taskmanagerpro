package com.example.taskmanagerpro.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "Current password must not be blank")
    private String currentPassword;

    @NotBlank(message = "New password must not be blank")
    private String newPassword;

    private String confirmPassword;

    // Optional backwards compatibility alias
    private String oldPassword;

    public String getCurrentPassword() {
        if (currentPassword != null && !currentPassword.isBlank()) {
            return currentPassword;
        }
        return oldPassword;
    }
}

