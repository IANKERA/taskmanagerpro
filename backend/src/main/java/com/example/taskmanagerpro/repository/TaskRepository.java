package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    // Fetch all tasks with optional user
    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.user")
    List<Task> findAllWithUser();

    // Fetch single task
    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.user WHERE t.id = :id")
    Task findByIdWithUser(Long id);


    // Filters for pagination
    @Query("""
    SELECT t FROM Task t
    LEFT JOIN t.user u
    WHERE (:status IS NULL OR t.status = :status)
      AND (:priority IS NULL OR t.priority = :priority)
      AND (:userId IS NULL OR (u IS NOT NULL AND u.id = :userId))
      AND (
            :keyword IS NULL 
            OR LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
    """)
    Page<Task> findAllWithFilters(@Param("status") TaskStatus status,
                                  @Param("priority") TaskPriority priority,
                                  @Param("userId") Long userId,
                                  @Param("keyword") String keyword,
                                  Pageable pageable);


    List<Task> findByStatus(TaskStatus status);

    List<Task> findByPriority(TaskPriority priority);

    List<Task> findByUserId(Long userId);
}
