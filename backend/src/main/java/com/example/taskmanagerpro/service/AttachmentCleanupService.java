package com.example.taskmanagerpro.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class AttachmentCleanupService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AttachmentCleanupService.class);
    private static final int BATCH_SIZE = 100;

    private final JdbcTemplate jdbcTemplate;
    private final Path uploadRoot;

    public AttachmentCleanupService(JdbcTemplate jdbcTemplate,
                                    @Value("${app.upload.dir:./attachments}") String uploadDir) {
        this.jdbcTemplate = jdbcTemplate;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueueForTask(Long taskId) {
        enqueuePaths(jdbcTemplate.query(
                "SELECT storage_path FROM attachments WHERE task_id = ?",
                (resultSet, rowNum) -> resultSet.getString(1),
                taskId));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueueForProject(Long projectId) {
        enqueuePaths(jdbcTemplate.query(
                "SELECT a.storage_path FROM attachments a "
                        + "JOIN tasks t ON t.id = a.task_id WHERE t.project_id = ?",
                (resultSet, rowNum) -> resultSet.getString(1),
                projectId));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueueForAttachment(Long attachmentId) {
        enqueuePaths(jdbcTemplate.query(
                "SELECT storage_path FROM attachments WHERE id = ?",
                (resultSet, rowNum) -> resultSet.getString(1),
                attachmentId));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void enqueueOrphanUpload(String storagePath) {
        enqueuePaths(List.of(storagePath));
    }

    @Scheduled(fixedDelayString = "${app.attachment-cleanup.delay-ms:60000}")
    @Transactional
    public void processPending() {
        List<CleanupEntry> entries = jdbcTemplate.query(
                "SELECT id, storage_path FROM attachment_cleanup_outbox "
                        + "WHERE next_attempt_at <= CURRENT_TIMESTAMP ORDER BY id LIMIT ?",
                (resultSet, rowNum) -> new CleanupEntry(
                        resultSet.getLong("id"), resultSet.getString("storage_path")),
                BATCH_SIZE);

        for (CleanupEntry entry : entries) {
            try {
                deleteStoredFile(entry.storagePath());
                jdbcTemplate.update("DELETE FROM attachment_cleanup_outbox WHERE id = ?", entry.id());
            } catch (IOException | InvalidPathException | SecurityException e) {
                jdbcTemplate.update(
                        "UPDATE attachment_cleanup_outbox "
                                + "SET attempts = attempts + 1, "
                                + "next_attempt_at = CURRENT_TIMESTAMP + INTERVAL '1 minute', "
                                + "last_error = ? WHERE id = ?",
                        e.getClass().getSimpleName(), entry.id());
                LOGGER.warn("Attachment cleanup queue entry {} failed; it will be retried", entry.id());
            }
        }
    }

    private void enqueuePaths(List<String> storagePaths) {
        for (String storagePath : storagePaths) {
            jdbcTemplate.update(
                    "INSERT INTO attachment_cleanup_outbox(storage_path) VALUES (?) "
                            + "ON CONFLICT(storage_path) DO NOTHING",
                    storagePath);
        }
    }

    private void deleteStoredFile(String storagePath) throws IOException {
        if (!Files.isDirectory(uploadRoot, LinkOption.NOFOLLOW_LINKS)) {
            throw new IOException("Upload root is unavailable");
        }

        Path realRoot = uploadRoot.toRealPath();
        Path configuredPath = Paths.get(storagePath);
        if (!configuredPath.isAbsolute()) {
            throw new IOException("Stored path is not absolute");
        }
        Path file = configuredPath.normalize();
        if (!file.startsWith(uploadRoot) || file.equals(uploadRoot)) {
            throw new IOException("Stored path is outside the upload root");
        }
        if (!Files.exists(file, LinkOption.NOFOLLOW_LINKS)) {
            return;
        }
        if (Files.isSymbolicLink(file)) {
            throw new IOException("Stored path is a symbolic link");
        }

        Path realFile = file.toRealPath();
        if (!realFile.startsWith(realRoot) || realFile.equals(realRoot)) {
            throw new IOException("Resolved path is outside the upload root");
        }
        Files.deleteIfExists(realFile);
    }

    private record CleanupEntry(long id, String storagePath) {
    }
}
