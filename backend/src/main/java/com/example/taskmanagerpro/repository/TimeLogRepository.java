package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.TimeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TimeLogRepository extends JpaRepository<TimeLog, Long> {

    @Query("""
        SELECT t FROM TimeLog t
        LEFT JOIN FETCH t.user
        WHERE t.task.id = :taskId
        ORDER BY t.loggedAt DESC, t.createdAt DESC
    """)
    List<TimeLog> findByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT COALESCE(SUM(t.minutes), 0) FROM TimeLog t WHERE t.task.id = :taskId")
    int sumMinutesByTaskId(@Param("taskId") Long taskId);

    @Query("""
        SELECT t FROM TimeLog t
        LEFT JOIN FETCH t.user
        LEFT JOIN FETCH t.task tk
        LEFT JOIN FETCH tk.project
        WHERE tk.project.id = :projectId
        ORDER BY t.loggedAt DESC, t.createdAt DESC
    """)
    List<TimeLog> findByProjectId(@Param("projectId") Long projectId);
}
