package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Find a user by username
    Optional<User> findByUsername(String username);

    // Check if a username already exists
    boolean existsByUsername(String username);

    // Fetch user by ID with tasks eagerly loaded
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.tasks WHERE u.id = :id")
    Optional<User> findByIdWithTasks(Long id);

    // Fetch all users with tasks eagerly loaded
    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.tasks")
    java.util.List<User> findAllWithTasks();
}
