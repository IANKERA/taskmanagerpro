package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    @Query("SELECT a FROM Attachment a JOIN FETCH a.uploader WHERE a.task.id = :taskId ORDER BY a.createdAt DESC")
    List<Attachment> findByTaskId(Long taskId);
}
