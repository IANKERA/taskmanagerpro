package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.Label;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LabelRepository extends JpaRepository<Label, Long> {
    List<Label> findByProjectIdOrderByNameAsc(Long projectId);
    List<Label> findByProjectIdAndIdIn(Long projectId, List<Long> ids);
    boolean existsByProjectIdAndName(Long projectId, String name);
}
