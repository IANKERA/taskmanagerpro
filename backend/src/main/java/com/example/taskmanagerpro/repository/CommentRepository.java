package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("""
        SELECT c FROM Comment c
        JOIN FETCH c.author
        WHERE c.task.id = :taskId
        ORDER BY c.createdAt ASC
    """)
    List<Comment> findByTaskIdWithAuthor(@Param("taskId") Long taskId);
}
