package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.Comment;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentDTO {
    private Long id;
    private String body;
    private Long authorId;
    private String authorUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CommentDTO from(Comment c) {
        return CommentDTO.builder()
                .id(c.getId())
                .body(c.getBody())
                .authorId(c.getAuthor().getId())
                .authorUsername(c.getAuthor().getUsername())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
