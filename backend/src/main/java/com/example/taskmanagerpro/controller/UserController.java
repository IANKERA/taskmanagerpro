package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.Mapper;
import com.example.taskmanagerpro.dto.UserDTO;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    // Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
