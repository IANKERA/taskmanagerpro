package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.RecurringRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RecurringRuleRepository extends JpaRepository<RecurringRule, Long> {

    List<RecurringRule> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    Optional<RecurringRule> findByIdAndProject_Id(Long id, Long projectId);

    @Query("SELECT r FROM RecurringRule r WHERE r.enabled = true AND r.nextRunAt <= :now")
    List<RecurringRule> findDueRules(@Param("now") LocalDateTime now);
}
