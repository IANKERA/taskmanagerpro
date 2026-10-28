package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.Sprint;
import com.example.taskmanagerpro.model.enums.SprintState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SprintRepository extends JpaRepository<Sprint, Long> {
    List<Sprint> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    Optional<Sprint> findByProjectIdAndState(Long projectId, SprintState state);
}
