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
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttachmentServiceTests {

    @Mock private AttachmentRepository attachmentRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private ProjectService projectService;

    @Test
    void failedFileDeletionKeepsAttachmentRecord(@TempDir Path tempDir) throws IOException {
        Path nonEmptyDirectory = Files.createDirectory(tempDir.resolve("attachment"));
        Files.writeString(nonEmptyDirectory.resolve("content"), "preserve");

        User user = new User();
        user.setId(1L);
        Project project = Project.builder().id(2L).build();
        Task task = new Task();
        task.setProject(project);
        Attachment attachment = Attachment.builder()
                .id(3L)
                .uploader(user)
                .task(task)
                .storagePath(nonEmptyDirectory.toString())
                .build();

        when(attachmentRepository.findById(3L)).thenReturn(Optional.of(attachment));
        when(projectService.currentUser()).thenReturn(user);
        when(projectService.hasProjectRole(2L, ProjectRole.ADMIN)).thenReturn(false);

        AttachmentService service = new AttachmentService(
                attachmentRepository, taskRepository, projectService, tempDir.toString());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.delete(3L));

        assertEquals(500, exception.getStatusCode().value());
        verify(attachmentRepository, never()).delete(attachment);
    }
}
