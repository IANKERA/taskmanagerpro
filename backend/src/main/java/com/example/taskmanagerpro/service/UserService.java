package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.UserDTO;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.Role;
import com.example.taskmanagerpro.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public boolean existsByUsername(String username) {
        return userRepository.findByUsername(username).isPresent();
    }

    // Get all users (with tasks eagerly fetched)
    public List<User> getAllUsers() {
        return userRepository.findAllWithTasks();
    }

    // Get user by ID (with tasks eagerly fetched)
    public Optional<User> getUserById(Long id) {
        return userRepository.findByIdWithTasks(id);
    }

    public void updatePassword(User user, String newPassword) {
        validateNewPassword(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }


    public boolean checkPassword(User user, String rawPassword) {
        return passwordEncoder.matches(rawPassword, user.getPassword());
    }

    public void validateNewPassword(String newPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("Password cannot be empty.");
        }

        if (newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long.");
        }

        if (!newPassword.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter.");
        }

        if (!newPassword.matches(".*[a-z].*")) {
            throw new IllegalArgumentException("Password must contain at least one lowercase letter.");
        }

        if (!newPassword.matches(".*\\d.*")) {
            throw new IllegalArgumentException("Password must contain at least one number.");
        }

        if (!newPassword.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            throw new IllegalArgumentException("Password must contain at least one special character.");
        }
    }

    // Create or update user
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    public User registerUser(String username, String password) {
        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already taken");
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(Role.ROLE_USER);

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

    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

}
