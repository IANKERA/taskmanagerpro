package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.CustomFieldDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomFieldDefinitionRepository extends JpaRepository<CustomFieldDefinition, Long> {
    List<CustomFieldDefinition> findByProjectIdOrderBySortOrder(Long projectId);
}
