package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.IssueTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IssueTemplateRepository extends JpaRepository<IssueTemplate, Long> {
    List<IssueTemplate> findByProjectIdOrderBySortOrder(Long projectId);

    Optional<IssueTemplate> findByIdAndProject_Id(Long id, Long projectId);
}
