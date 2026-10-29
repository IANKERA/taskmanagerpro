package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Attachment;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.repository.AttachmentRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
public class AttachmentService {

    private final AttachmentRepository attachmentRepo;
    private final TaskRepository taskRepo;
    private final ProjectService projectService;
    private final Path uploadRoot;

    public AttachmentService(AttachmentRepository attachmentRepo,
                             TaskRepository taskRepo,
                             ProjectService projectService,
                             @Value("${app.upload.dir:./attachments}") String uploadDir) {
        this.attachmentRepo = attachmentRepo;
        this.taskRepo = taskRepo;
        this.projectService = projectService;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional
    public Attachment upload(String issueKey, MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "File is empty");
        }
        Task task = taskRepo.findByIssueKeyWithRelations(issueKey)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Issue not found: " + issueKey));
        projectService.requireProjectRole(task.getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        User uploader = projectService.currentUser();

        String projectKey = task.getProject().getKey();
        String storedName = UUID.randomUUID() + "-" + file.getOriginalFilename();
        Path dir = uploadRoot.resolve(projectKey).resolve(issueKey);
        Path target = dir.resolve(storedName);

        try {
            Files.createDirectories(dir);
            file.transferTo(target.toFile());
        } catch (IOException e) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        Attachment a = Attachment.builder()
                .task(task)
                .uploader(uploader)
                .filename(file.getOriginalFilename())
                .contentType(file.getContentType())
                .sizeBytes(file.getSize())
                .storagePath(target.toString())
                .build();
        return attachmentRepo.save(a);
    }

    @Transactional(readOnly = true)
    public List<Attachment> list(String issueKey) {
        Task task = taskRepo.findByIssueKeyWithRelations(issueKey)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Issue not found: " + issueKey));
        projectService.requireProjectRole(task.getProject().getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return attachmentRepo.findByTaskId(task.getId());
    }

    @Transactional(readOnly = true)
    public Attachment getById(Long id) {
        Attachment a = attachmentRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Attachment not found"));
        a.getUploader().getUsername();
        a.getTask().getProject().getKey();
        projectService.requireProjectRole(a.getTask().getProject().getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return a;
    }

    public Resource loadAsResource(Attachment a) {
        try {
            Path file = Paths.get(a.getStoragePath());
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists()) {
                throw new ResponseStatusException(NOT_FOUND, "File not found on disk");
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Could not read file");
        }
    }

    @Transactional
    public void delete(Long id) {
        Attachment a = attachmentRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Attachment not found"));
        a.getTask().getProject().getId();
        User current = projectService.currentUser();
        boolean isUploader = a.getUploader().getId().equals(current.getId());
        boolean isAdmin = projectService.hasProjectRole(a.getTask().getProject().getId(), ProjectRole.ADMIN);
        if (!isUploader && !isAdmin) {
            throw new ResponseStatusException(FORBIDDEN, "Only the uploader or a project admin can delete attachments");
        }
        try {
            Files.deleteIfExists(Paths.get(a.getStoragePath()));
        } catch (IOException e) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Failed to delete attachment file");
        }
        attachmentRepo.delete(a);
    }
}
