package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.WorkflowRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkflowRuleRepository extends JpaRepository<WorkflowRule, Long> {
    List<WorkflowRule> findByProjectIdAndEnabledTrueOrderByCreatedAtAsc(Long projectId);
    List<WorkflowRule> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    Optional<WorkflowRule> findByIdAndProject_Id(Long id, Long projectId);
}
