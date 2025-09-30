package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.UserDTO;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Get all users (with tasks eagerly fetched)
    public List<User> getAllUsers() {
        return userRepository.findAllWithTasks();
    }

    // Get user by ID (with tasks eagerly fetched)
    public Optional<User> getUserById(Long id) {
        return userRepository.findByIdWithTasks(id);
    }

    // Create or update user
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    // Delete user
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    // Check if username exists
    public boolean usernameExists(String username) {
        return userRepository.existsByUsername(username);
    }

    // Find user by username
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    // Convert User entity to UserDTO
    public UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setRole(user.getRole());
        if (user.getTasks() != null) {
            dto.setTaskIds(user.getTasks().stream().map(task -> task.getId()).toList());
        }
        return dto;
    }
}
