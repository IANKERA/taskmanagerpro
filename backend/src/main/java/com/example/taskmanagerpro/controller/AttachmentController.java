package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.AttachmentDTO;
import com.example.taskmanagerpro.model.Attachment;
import com.example.taskmanagerpro.service.AttachmentService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping("/api/issues/{issueKey}/attachments")
    public ResponseEntity<AttachmentDTO> upload(@PathVariable String issueKey,
                                                @RequestParam("file") MultipartFile file) {
        Attachment a = attachmentService.upload(issueKey, file);
        return ResponseEntity.status(201).body(AttachmentDTO.from(a));
    }

    @GetMapping("/api/issues/{issueKey}/attachments")
    public List<AttachmentDTO> list(@PathVariable String issueKey) {
        return attachmentService.list(issueKey).stream().map(AttachmentDTO::from).toList();
    }

    @GetMapping("/api/attachments/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        Attachment a = attachmentService.getById(id);
        Resource resource = attachmentService.loadAsResource(a);
        String contentType = a.getContentType() != null ? a.getContentType() : "application/octet-stream";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + a.getFilename() + "\"")
                .body(resource);
    }

    @DeleteMapping("/api/attachments/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        attachmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
