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

    @Query("SELECT t FROM Task t JOIN FETCH t.user")
    List<Task> findAllWithUser();

    @Query("SELECT t FROM Task t JOIN FETCH t.user WHERE t.id = :id")
    Task findByIdWithUser(Long id);

    List<Task> findByStatus(TaskStatus status);

    List<Task> findByPriority(TaskPriority priority);

    List<Task> findByUserId(Long userId);


    @Query("""
    SELECT t FROM Task t
    WHERE (:status IS NULL OR t.status = :status)
        AND (:priority IS NULL OR t.priority = :priority)
        AND (:userId IS NULL OR t.user.id = :userId)
        AND (:keyword IS NULL 
            OR LOWER(COALESCE(t.title, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(COALESCE(t.description, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """)
    Page<Task> findAllWithFilters(@Param("status") TaskStatus status,
                                  @Param("priority") TaskPriority priority,
                                  @Param("userId") Long userId,
                                  @Param("keyword") String keyword,
                                  Pageable pageable);


}

