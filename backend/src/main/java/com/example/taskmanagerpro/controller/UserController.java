package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.Mapper;
import com.example.taskmanagerpro.dto.UserDTO;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
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

    // Create new user
    @PostMapping
    public UserDTO createUser(@RequestBody User user) {
        User saved = userService.saveUser(user);
        return Mapper.toUserDTO(saved);
    }

    // Update user
    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.getUserById(id)
                .map(existing -> {
                    existing.setUsername(user.getUsername());
                    existing.setPassword(user.getPassword());
                    existing.setRole(user.getRole());
                    User updated = userService.saveUser(existing);
                    return ResponseEntity.ok(Mapper.toUserDTO(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/users/{id}/reset-password
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
    public ResponseEntity<?> resetOwnPassword(@RequestBody SelfPasswordResetRequest request) {
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


    // Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
