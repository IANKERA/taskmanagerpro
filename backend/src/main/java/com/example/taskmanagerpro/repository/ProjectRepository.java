package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    Optional<Project> findByKey(String key);
    boolean existsByKey(String key);

    @Query("SELECT DISTINCT p FROM Project p LEFT JOIN FETCH p.lead")
    List<Project> findAllWithLead();
}
