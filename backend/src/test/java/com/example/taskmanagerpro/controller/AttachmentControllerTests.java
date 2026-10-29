package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.AttachmentDTO;
import com.example.taskmanagerpro.model.Attachment;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.service.AttachmentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttachmentControllerTests {

    @Mock private AttachmentService attachmentService;
    @InjectMocks private AttachmentController attachmentController;

    @Test
    void uploadPreservesDisplayFilenameAndCreatedResponseContract() {
        Attachment attachment = attachment();
        MockMultipartFile file = new MockMultipartFile(
                "file", attachment.getFilename(), "text/csv", "id,name\n1,Ada".getBytes());
        when(attachmentService.upload("PROJ-1", file)).thenReturn(attachment);

        var response = attachmentController.upload("PROJ-1", file);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(attachment.getFilename(), response.getBody().getFilename());
        assertEquals(attachment.getContentType(), response.getBody().getContentType());
        verify(attachmentService).upload("PROJ-1", file);
    }

    @Test
    void downloadUsesSafeContentDispositionAndReturnsResource() {
        Attachment attachment = attachment();
        ByteArrayResource resource = new ByteArrayResource("attachment".getBytes());
        when(attachmentService.getById(3L)).thenReturn(attachment);
        when(attachmentService.loadAsResource(attachment)).thenReturn(resource);

        var response = attachmentController.download(3L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(resource, response.getBody());
        assertEquals("text/csv", response.getHeaders().getContentType().toString());
        assertEquals(
                ContentDisposition.attachment()
                        .filename(attachment.getFilename(), StandardCharsets.UTF_8)
                        .build().toString(),
                response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
    }

    @Test
    void deleteReturnsNoContentAfterServiceDeletion() {
        var response = attachmentController.delete(3L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(attachmentService).delete(3L);
    }

    private Attachment attachment() {
        User uploader = new User();
        uploader.setUsername("alice");
        return Attachment.builder()
                .id(3L)
                .uploader(uploader)
                .filename("report \"quarterly\".csv")
                .contentType("text/csv")
                .sizeBytes(10L)
                .build();
    }
}
