package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.IssueTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IssueTemplateRepository extends JpaRepository<IssueTemplate, Long> {
    List<IssueTemplate> findByProjectIdOrderBySortOrder(Long projectId);
}
