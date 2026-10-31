package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.Mapper;
import com.example.taskmanagerpro.dto.UserDTO;
import com.example.taskmanagerpro.model.NotificationPreference;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.service.NotificationService;
import com.example.taskmanagerpro.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final NotificationService notificationService;

    public UserController(UserService userService, NotificationService notificationService) {
        this.userService = userService;
        this.notificationService = notificationService;
    }

    /** Current-user profile — accessible to any authenticated user. */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> me() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.getUserByUsername(username)
                .map(Mapper::toUserDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Get all users
    @GetMapping
    public List<UserDTO> getAllUsers() {
        return Mapper.toUserDTOList(userService.getAllUsers());
    }

    // Get user by ID
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(Mapper::toUserDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // M1: POST /api/users removed — user creation goes through /api/auth/register, which hashes the password.
    // The old endpoint stored the password in plaintext, which was a security hole.

    // Update user (admin only — secured by SecurityConfig). Password updates go through reset-password endpoints.
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.getUserById(id)
                .map(existing -> {
                    if (user.getUsername() != null) existing.setUsername(user.getUsername());
                    if (user.getEmail() != null) existing.setEmail(user.getEmail());
                    if (user.getRole() != null) existing.setRole(user.getRole());
                    // Intentionally NOT updating password here — use /reset-password endpoints which hash properly.
                    User updated = userService.saveUser(existing);
                    return ResponseEntity.ok(Mapper.toUserDTO(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Reset-password
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(
            @PathVariable Long id,
            @RequestBody PasswordResetRequest request
    ) {
        Optional<User> userOpt = userService.getUserById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        try {
            userService.updatePassword(userOpt.get(), request.getNewPassword());
            return ResponseEntity.ok("Password reset successfully for user ID: " + id);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    // DTO class for password request
    public static class PasswordResetRequest {
        private String newPassword;

        public String getNewPassword() {
            return newPassword;
        }

        public void setNewPassword(String newPassword) {
            this.newPassword = newPassword;
        }
    }

    @PostMapping("/me/reset-password")
    public ResponseEntity<?> resetOwnPassword(@Valid @RequestBody SelfPasswordResetRequest request) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userService.getUserByUsername(currentUsername);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body("User not found.");
        }

        User user = userOpt.get();

        if (!userService.checkPassword(user, request.getOldPassword())) {
            return ResponseEntity.badRequest().body("Incorrect old password.");
        }

        try {
            userService.updatePassword(user, request.getNewPassword());
            return ResponseEntity.ok("Password updated successfully.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }



    public static class SelfPasswordResetRequest {
        @NotBlank
        private String oldPassword;
        private String newPassword;

        public String getOldPassword() {
            return oldPassword;
        }

        public void setOldPassword(String oldPassword) {
            this.oldPassword = oldPassword;
        }

        public String getNewPassword() {
            return newPassword;
        }

        public void setNewPassword(String newPassword) {
            this.newPassword = newPassword;
        }
    }


    /** Update current user's email. */
    @PatchMapping("/me/email")
    public ResponseEntity<UserDTO> updateEmail(@RequestBody Map<String, String> body) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.getUserByUsername(username)
                .map(user -> {
                    user.setEmail(body.get("email"));
                    User saved = userService.saveUser(user);
                    return ResponseEntity.ok(Mapper.toUserDTO(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Get notification preferences for current user. */
    @GetMapping("/me/notification-preferences")
    public ResponseEntity<Map<String, Boolean>> getNotifPrefs() {
        NotificationPreference p = notificationService.getPreferences();
        return ResponseEntity.ok(Map.of(
            "notifyAssigned", p.isNotifyAssigned(),
            "notifyMentioned", p.isNotifyMentioned(),
            "notifyWatching", p.isNotifyWatching(),
            "notifyComment", p.isNotifyComment()
        ));
    }

    /** Update notification preferences for current user. */
    @PutMapping("/me/notification-preferences")
    public ResponseEntity<?> updateNotifPrefs(@RequestBody Map<String, Boolean> body) {
        if (body == null || body.values().stream().anyMatch(java.util.Objects::isNull)) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Notification preferences must be boolean values."));
        }
        NotificationPreference p = notificationService.savePreferences(
            body.getOrDefault("notifyAssigned", true),
            body.getOrDefault("notifyMentioned", true),
            body.getOrDefault("notifyWatching", true),
            body.getOrDefault("notifyComment", true)
        );
        return ResponseEntity.ok(Map.of(
            "notifyAssigned", p.isNotifyAssigned(),
            "notifyMentioned", p.isNotifyMentioned(),
            "notifyWatching", p.isNotifyWatching(),
            "notifyComment", p.isNotifyComment()
        ));
    }

    // Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
