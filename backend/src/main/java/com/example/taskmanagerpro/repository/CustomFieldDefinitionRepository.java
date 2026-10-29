package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.CustomFieldDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomFieldDefinitionRepository extends JpaRepository<CustomFieldDefinition, Long> {
    List<CustomFieldDefinition> findByProjectIdOrderBySortOrder(Long projectId);

    Optional<CustomFieldDefinition> findByIdAndProject_Id(Long id, Long projectId);
}
