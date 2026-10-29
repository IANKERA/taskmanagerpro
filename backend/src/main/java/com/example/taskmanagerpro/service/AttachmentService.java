package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Attachment;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.repository.AttachmentRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
public class AttachmentService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AttachmentService.class);

    private final AttachmentRepository attachmentRepo;
    private final TaskRepository taskRepo;
    private final ProjectService projectService;
    private final AttachmentCleanupService attachmentCleanupService;
    private final Path uploadRoot;

    public AttachmentService(AttachmentRepository attachmentRepo,
                             TaskRepository taskRepo,
                             ProjectService projectService,
                             AttachmentCleanupService attachmentCleanupService,
                             @Value("${app.upload.dir:./attachments}") String uploadDir) {
        this.attachmentRepo = attachmentRepo;
        this.taskRepo = taskRepo;
        this.projectService = projectService;
        this.attachmentCleanupService = attachmentCleanupService;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional
    public Attachment upload(String issueKey, MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "File is empty");
        }
        String filename = validateFilename(file.getOriginalFilename());
        Task task = taskRepo.findByIssueKeyWithRelations(issueKey)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Issue not found: " + issueKey));
        projectService.requireProjectRole(task.getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        User uploader = projectService.currentUser();

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Attachment uploads require an active transaction");
        }

        Path target;
        try {
            Files.createDirectories(uploadRoot);
            Path realRoot = uploadRoot.toRealPath();
            target = uploadRoot.resolve(UUID.randomUUID().toString()).normalize();
            if (!target.startsWith(uploadRoot) || target.equals(uploadRoot)
                    || !target.getParent().toRealPath().equals(realRoot)) {
                throw new IOException("Resolved upload path is outside the configured directory");
            }
            Files.createFile(target);
            registerRollbackCleanup(target);
            try (InputStream input = file.getInputStream();
                 OutputStream output = Files.newOutputStream(target,
                         StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING,
                         LinkOption.NOFOLLOW_LINKS)) {
                input.transferTo(output);
            }
        } catch (IOException | SecurityException e) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        Attachment a = Attachment.builder()
                .task(task)
                .uploader(uploader)
                .filename(filename)
                .contentType(file.getContentType())
                .sizeBytes(file.getSize())
                .storagePath(target.toString())
                .build();
        return attachmentRepo.save(a);
    }

    private void registerRollbackCleanup(Path target) {
        try {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_COMMITTED) {
                        return;
                    }

                    try {
                        Files.deleteIfExists(resolveStoragePath(target.toString()));
                    } catch (IOException | SecurityException | ResponseStatusException cleanupFailure) {
                        try {
                            attachmentCleanupService.enqueueOrphanUpload(target.toString());
                            LOGGER.warn("Rolled-back attachment upload cleanup failed; queued for retry",
                                    cleanupFailure);
                        } catch (RuntimeException enqueueFailure) {
                            enqueueFailure.addSuppressed(cleanupFailure);
                            LOGGER.error("Could not clean up or queue a rolled-back attachment upload; "
                                    + "manual file cleanup may be required", enqueueFailure);
                        }
                    }
                }
            });
        } catch (RuntimeException registrationFailure) {
            try {
                Files.deleteIfExists(target);
            } catch (IOException | SecurityException cleanupFailure) {
                registrationFailure.addSuppressed(cleanupFailure);
                LOGGER.error("Could not remove an attachment file after rollback cleanup registration failed",
                        registrationFailure);
            }
            throw registrationFailure;
        }
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
            Path file = resolveStoragePath(a.getStoragePath());
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
        Long projectId = a.getTask().getProject().getId();
        User current = projectService.currentUser();
        if (!projectService.hasProjectRole(projectId,
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN)) {
            throw new ResponseStatusException(NOT_FOUND, "Attachment not found");
        }
        boolean isUploader = a.getUploader().getId().equals(current.getId());
        boolean isAdmin = projectService.hasProjectRole(projectId, ProjectRole.ADMIN);
        if (!isUploader && !isAdmin) {
            throw new ResponseStatusException(FORBIDDEN, "Only the uploader or a project admin can delete attachments");
        }
        resolveStoragePath(a.getStoragePath());
        attachmentCleanupService.enqueueForAttachment(id);
        attachmentRepo.delete(a);
    }

    private String validateFilename(String filename) {
        if (filename == null || filename.isBlank() || filename.length() > 255
                || filename.equals(".") || filename.equals("..")) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid filename");
        }
        for (int i = 0; i < filename.length(); i++) {
            char character = filename.charAt(i);
            if (Character.isISOControl(character) || character == '/' || character == '\\'
                    || character == ':' || character == '\u2044' || character == '\u2215'
                    || character == '\u29f8' || character == '\uff0f' || character == '\uff3c') {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid filename");
            }
        }
        return filename;
    }

    private Path resolveStoragePath(String storagePath) {
        if (storagePath == null) {
            throw new ResponseStatusException(NOT_FOUND, "Attachment file not found");
        }
        try {
            Path file = Paths.get(storagePath).toAbsolutePath().normalize();
            if (!file.startsWith(uploadRoot) || file.equals(uploadRoot)) {
                throw new ResponseStatusException(NOT_FOUND, "Attachment file not found");
            }

            Path realRoot = uploadRoot.toRealPath();
            if (Files.exists(file, LinkOption.NOFOLLOW_LINKS)) {
                if (Files.isSymbolicLink(file)) {
                    throw new ResponseStatusException(NOT_FOUND, "Attachment file not found");
                }
                Path realFile = file.toRealPath();
                if (!realFile.startsWith(realRoot) || realFile.equals(realRoot)) {
                    throw new ResponseStatusException(NOT_FOUND, "Attachment file not found");
                }
                return realFile;
            }

            Path existingParent = file.getParent();
            while (existingParent != null
                    && !Files.exists(existingParent, LinkOption.NOFOLLOW_LINKS)) {
                existingParent = existingParent.getParent();
            }
            if (existingParent == null || !existingParent.startsWith(uploadRoot)) {
                throw new ResponseStatusException(NOT_FOUND, "Attachment file not found");
            }
            Path realParent = existingParent.toRealPath();
            if (!realParent.startsWith(realRoot)) {
                throw new ResponseStatusException(NOT_FOUND, "Attachment file not found");
            }
            return file;
        } catch (InvalidPathException | IOException | SecurityException e) {
            throw new ResponseStatusException(NOT_FOUND, "Attachment file not found");
        }
    }
}
