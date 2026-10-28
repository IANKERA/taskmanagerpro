package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.WorkflowRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkflowRuleRepository extends JpaRepository<WorkflowRule, Long> {
    List<WorkflowRule> findByProjectIdAndEnabledTrueOrderByCreatedAtAsc(Long projectId);
    List<WorkflowRule> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
