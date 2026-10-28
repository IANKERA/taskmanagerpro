package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    @Query("""
        SELECT a FROM ActivityLog a
        LEFT JOIN FETCH a.actor
        WHERE a.task.id = :taskId
        ORDER BY a.at ASC, a.id ASC
    """)
    List<ActivityLog> findByTaskIdWithActor(@Param("taskId") Long taskId);

    @Query("""
        SELECT a FROM ActivityLog a
        LEFT JOIN FETCH a.actor
        LEFT JOIN FETCH a.task t
        LEFT JOIN FETCH t.project
        WHERE t.project.id IN :projectIds
        ORDER BY a.at DESC, a.id DESC
    """)
    List<ActivityLog> findRecentByProjects(@Param("projectIds") List<Long> projectIds);

    @Query("""
        SELECT a FROM ActivityLog a
        LEFT JOIN FETCH a.actor
        LEFT JOIN FETCH a.task t
        LEFT JOIN FETCH t.project
        ORDER BY a.at DESC, a.id DESC
    """)
    List<ActivityLog> findAllWithRelations();
}
