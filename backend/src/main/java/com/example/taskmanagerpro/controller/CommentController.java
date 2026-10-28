package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.ActivityDTO;
import com.example.taskmanagerpro.dto.CommentDTO;
import com.example.taskmanagerpro.dto.CreateCommentRequest;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.service.ActivityService;
import com.example.taskmanagerpro.service.CommentService;
import com.example.taskmanagerpro.service.IssueService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class CommentController {

    private final CommentService commentService;
    private final ActivityService activityService;
    private final IssueService issueService;

    public CommentController(CommentService commentService,
                             ActivityService activityService,
                             IssueService issueService) {
        this.commentService = commentService;
        this.activityService = activityService;
        this.issueService = issueService;
    }

    @GetMapping("/api/issues/{issueKey}/comments")
    public List<CommentDTO> list(@PathVariable String issueKey) {
        return commentService.listForIssue(issueKey).stream().map(CommentDTO::from).toList();
    }

    @PostMapping("/api/issues/{issueKey}/comments")
    public ResponseEntity<CommentDTO> create(@PathVariable String issueKey,
                                              @Valid @RequestBody CreateCommentRequest req) {
        return ResponseEntity.status(201).body(CommentDTO.from(commentService.create(issueKey, req)));
    }

    @PatchMapping("/api/issues/{issueKey}/comments/{commentId}")
    public CommentDTO update(@PathVariable String issueKey,
                             @PathVariable Long commentId,
                             @Valid @RequestBody CreateCommentRequest req) {
        return CommentDTO.from(commentService.update(issueKey, commentId, req));
    }

    @DeleteMapping("/api/issues/{issueKey}/comments/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable String issueKey,
                                        @PathVariable Long commentId) {
        commentService.delete(issueKey, commentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/issues/{issueKey}/activity")
    public List<ActivityDTO> activity(@PathVariable String issueKey) {
        Task t = issueService.getByIssueKey(issueKey); // enforces VIEWER+ membership
        return activityService.listForTask(t.getId()).stream().map(ActivityDTO::from).toList();
    }
}
