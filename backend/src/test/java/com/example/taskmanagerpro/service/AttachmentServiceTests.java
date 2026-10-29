package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Attachment;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.repository.AttachmentRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceTests {

    @Mock private AttachmentRepository attachmentRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private ProjectService projectService;
    @Mock private AttachmentCleanupService attachmentCleanupService;

    @Test
    void uploadStoresFileUnderGeneratedNameAndPreservesOriginalFilename(@TempDir Path tempDir)
            throws IOException {
        Path uploadRoot = tempDir.resolve("uploads");
        Task task = task();
        User user = user(1L);
        when(taskRepository.findByIssueKeyWithRelations("PROJ-1")).thenReturn(Optional.of(task));
        when(projectService.currentUser()).thenReturn(user);
        when(attachmentRepository.save(any(Attachment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        MockMultipartFile file = new MockMultipartFile(
                "file", "quarterly report.csv", "text/csv", "id,name\n1,Ada".getBytes());

        TransactionSynchronizationManager.initSynchronization();
        Attachment saved;
        try {
            saved = service(uploadRoot).upload("PROJ-1", file);
            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(synchronization ->
                            synchronization.afterCompletion(
                                    org.springframework.transaction.support.TransactionSynchronization
                                            .STATUS_COMMITTED));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }

        Path storagePath = Path.of(saved.getStoragePath());
        assertTrue(storagePath.startsWith(uploadRoot.toAbsolutePath().normalize()));
        assertNotEquals("quarterly report.csv", storagePath.getFileName().toString());
        assertTrue(storagePath.getFileName().toString().matches(
                "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"));
        assertEquals("quarterly report.csv", saved.getFilename());
        assertEquals("id,name\n1,Ada", Files.readString(storagePath));
        try (var files = Files.list(uploadRoot)) {
            assertEquals(1L, files.count());
        }
    }

    @Test
    void uploadRejectsTraversalAndPathLikeFilenamesWithoutWritingOutsideRoot(@TempDir Path tempDir) {
        Path uploadRoot = tempDir.resolve("uploads");
        String[] invalidFilenames = {
                "../escape.txt",
                "..\\escape.txt",
                "/absolute/path.txt",
                "C:\\absolute\\path.txt",
                "nested/path.txt",
                "nested\\path.txt",
                "name\u2215segment.txt",
                "name\uff0fsegment.txt"
        };

        for (String filename : invalidFilenames) {
            MockMultipartFile file = new MockMultipartFile(
                    "file", filename, "text/plain", "must not be written".getBytes());

            ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                    () -> service(uploadRoot).upload("PROJ-1", file), filename);

            assertEquals(400, exception.getStatusCode().value(), filename);
        }

        assertFalse(Files.exists(uploadRoot));
        assertFalse(Files.exists(tempDir.resolve("escape.txt")));
        assertFalse(Files.exists(tempDir.resolve("absolute").resolve("path.txt")));
    }

    @Test
    void downloadRejectsStoragePathOutsideConfiguredRoot(@TempDir Path tempDir) throws IOException {
        Path uploadRoot = tempDir.resolve("uploads");
        Files.createDirectories(uploadRoot);
        Path outsideFile = tempDir.resolve("outside.txt");
        Files.writeString(outsideFile, "private");
        Attachment attachment = attachment(user(1L), outsideFile);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(uploadRoot).loadAsResource(attachment));

        assertEquals(404, exception.getStatusCode().value());
        assertEquals("private", Files.readString(outsideFile));
    }

    @Test
    void downloadLoadsFileFromInsideConfiguredRoot(@TempDir Path tempDir) throws IOException {
        Path uploadRoot = Files.createDirectory(tempDir.resolve("uploads"));
        Path storedFile = uploadRoot.resolve("generated-name");
        Files.writeString(storedFile, "download content");
        Attachment attachment = attachment(user(1L), storedFile);

        try (InputStream input = service(uploadRoot).loadAsResource(attachment).getInputStream();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            input.transferTo(output);
            assertEquals("download content", output.toString());
        }
    }

    @Test
    void successfulDeleteQueuesFileCleanupAndRemovesDatabaseRecord(@TempDir Path tempDir) throws IOException {
        Path file = tempDir.resolve("attachment.txt");
        Files.writeString(file, "attachment");
        User user = user(1L);
        Attachment attachment = attachment(user, file);
        when(attachmentRepository.findById(3L)).thenReturn(Optional.of(attachment));
        allowProjectUploader(user);

        service(tempDir).delete(3L);

        assertTrue(Files.exists(file));
        verify(attachmentCleanupService).enqueueForAttachment(3L);
        verify(attachmentRepository).delete(attachment);
    }

    @Test
    void missingFileIsTreatedAsAlreadyDeletedAndRecordIsRemoved(@TempDir Path tempDir) {
        User user = user(1L);
        Path missingFile = tempDir.resolve("missing.txt");
        Attachment attachment = attachment(user, missingFile);
        when(attachmentRepository.findById(3L)).thenReturn(Optional.of(attachment));
        allowProjectUploader(user);

        service(tempDir).delete(3L);

        assertFalse(Files.exists(missingFile));
        verify(attachmentCleanupService).enqueueForAttachment(3L);
        verify(attachmentRepository).delete(attachment);
    }

    @Test
    void missingAttachmentRecordReturnsNotFoundWithoutDeletion(@TempDir Path tempDir) {
        when(attachmentRepository.findById(3L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(tempDir).delete(3L));

        assertEquals(404, exception.getStatusCode().value());
        verify(attachmentRepository, never()).delete(any());
    }

    @Test
    void formerUploaderCannotDeleteAfterProjectMembershipIsRevoked(@TempDir Path tempDir)
            throws IOException {
        Path file = tempDir.resolve("attachment.txt");
        Files.writeString(file, "preserve");
        User formerUploader = user(1L);
        Attachment attachment = attachment(formerUploader, file);
        when(attachmentRepository.findById(3L)).thenReturn(Optional.of(attachment));
        when(projectService.currentUser()).thenReturn(formerUploader);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(tempDir).delete(3L));

        assertEquals(404, exception.getStatusCode().value());
        assertTrue(Files.exists(file));
        verify(attachmentRepository, never()).delete(attachment);
        verify(projectService, never()).hasProjectRole(2L, ProjectRole.ADMIN);
    }

    @Test
    void memberOfAnotherProjectCannotDeleteAttachment(@TempDir Path tempDir) throws IOException {
        Path file = tempDir.resolve("attachment.txt");
        Files.writeString(file, "preserve");
        Attachment attachment = attachment(user(1L), file);
        User otherProjectMember = user(2L);
        when(attachmentRepository.findById(3L)).thenReturn(Optional.of(attachment));
        when(projectService.currentUser()).thenReturn(otherProjectMember);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(tempDir).delete(3L));

        assertEquals(404, exception.getStatusCode().value());
        assertTrue(Files.exists(file));
        verify(attachmentRepository, never()).delete(attachment);
    }

    @Test
    void currentProjectMemberWithoutUploaderOrAdminPermissionCannotDelete(@TempDir Path tempDir)
            throws IOException {
        Path file = tempDir.resolve("attachment.txt");
        Files.writeString(file, "preserve");
        Attachment attachment = attachment(user(1L), file);
        User member = user(2L);
        when(attachmentRepository.findById(3L)).thenReturn(Optional.of(attachment));
        when(projectService.currentUser()).thenReturn(member);
        when(projectService.hasProjectRole(2L,
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN)).thenReturn(true);
        when(projectService.hasProjectRole(2L, ProjectRole.ADMIN)).thenReturn(false);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(tempDir).delete(3L));

        assertEquals(403, exception.getStatusCode().value());
        assertTrue(Files.exists(file));
        verify(attachmentRepository, never()).delete(attachment);
    }

    @Test
    void projectAdminCanDeleteAttachmentUploadedByAnotherMember(@TempDir Path tempDir)
            throws IOException {
        Path file = tempDir.resolve("attachment.txt");
        Files.writeString(file, "attachment");
        Attachment attachment = attachment(user(1L), file);
        User admin = user(2L);
        when(attachmentRepository.findById(3L)).thenReturn(Optional.of(attachment));
        when(projectService.currentUser()).thenReturn(admin);
        when(projectService.hasProjectRole(2L,
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN)).thenReturn(true);
        when(projectService.hasProjectRole(2L, ProjectRole.ADMIN)).thenReturn(true);

        service(tempDir).delete(3L);

        assertTrue(Files.exists(file));
        verify(attachmentCleanupService).enqueueForAttachment(3L);
        verify(attachmentRepository).delete(attachment);
    }

    @Test
    void deletionRejectsTamperedPathOutsideRootAndKeepsFileAndRecord(@TempDir Path tempDir)
            throws IOException {
        Path uploadRoot = tempDir.resolve("uploads");
        Files.createDirectories(uploadRoot);
        Path outsideFile = tempDir.resolve("outside.txt");
        Files.writeString(outsideFile, "preserve");
        User user = user(1L);
        Attachment attachment = attachment(user, outsideFile);
        when(attachmentRepository.findById(3L)).thenReturn(Optional.of(attachment));
        allowProjectUploader(user);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(uploadRoot).delete(3L));

        assertEquals(404, exception.getStatusCode().value());
        assertEquals("preserve", Files.readString(outsideFile));
        verify(attachmentRepository, never()).delete(attachment);
    }

    private AttachmentService service(Path uploadRoot) {
        return new AttachmentService(
                attachmentRepository, taskRepository, projectService, attachmentCleanupService,
                uploadRoot.toString());
    }

    private void allowProjectUploader(User user) {
        when(projectService.currentUser()).thenReturn(user);
        when(projectService.hasProjectRole(2L,
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN)).thenReturn(true);
        when(projectService.hasProjectRole(2L, ProjectRole.ADMIN)).thenReturn(false);
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private Task task() {
        Project project = Project.builder().id(2L).key("PROJ").build();
        Task task = new Task();
        task.setId(4L);
        task.setIssueKey("PROJ-1");
        task.setProject(project);
        return task;
    }

    private Attachment attachment(User user, Path path) {
        Project project = Project.builder().id(2L).build();
        Task task = new Task();
        task.setProject(project);
        return Attachment.builder()
                .id(3L)
                .uploader(user)
                .task(task)
                .storagePath(path.toString())
                .build();
    }
}
