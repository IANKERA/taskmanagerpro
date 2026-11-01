package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.Sprint;
import com.example.taskmanagerpro.model.enums.SprintState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SprintRepository extends JpaRepository<Sprint, Long> {
    @Query("""
        SELECT s FROM Sprint s
        LEFT JOIN FETCH s.project
        WHERE s.project.id = :projectId
        ORDER BY s.createdAt DESC
    """)
    List<Sprint> findByProjectIdOrderByCreatedAtDesc(@Param("projectId") Long projectId);
    Optional<Sprint> findByProjectIdAndState(Long projectId, SprintState state);
}
