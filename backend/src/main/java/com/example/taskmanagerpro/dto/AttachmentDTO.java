package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.Attachment;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentDTO {
    private Long id;
    private String filename;
    private String contentType;
    private Long sizeBytes;
    private String uploaderUsername;
    private LocalDateTime createdAt;

    public static AttachmentDTO from(Attachment a) {
        return AttachmentDTO.builder()
                .id(a.getId())
                .filename(a.getFilename())
                .contentType(a.getContentType())
                .sizeBytes(a.getSizeBytes())
                .uploaderUsername(a.getUploader().getUsername())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
