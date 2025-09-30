package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

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
}
