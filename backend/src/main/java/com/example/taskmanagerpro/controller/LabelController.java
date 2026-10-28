package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.CreateLabelRequest;
import com.example.taskmanagerpro.dto.LabelDTO;
import com.example.taskmanagerpro.dto.SetLabelsRequest;
import com.example.taskmanagerpro.service.LabelService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class LabelController {

    private final LabelService labelService;

    public LabelController(LabelService labelService) {
        this.labelService = labelService;
    }

    // ── Project-scoped label catalog ──
    @GetMapping("/api/projects/{projectKey}/labels")
    public List<LabelDTO> list(@PathVariable String projectKey) {
        return labelService.list(projectKey).stream().map(LabelDTO::from).toList();
    }

    @PostMapping("/api/projects/{projectKey}/labels")
    public ResponseEntity<LabelDTO> create(@PathVariable String projectKey,
                                            @Valid @RequestBody CreateLabelRequest req) {
        return ResponseEntity.status(201).body(LabelDTO.from(labelService.create(projectKey, req)));
    }

    @DeleteMapping("/api/projects/{projectKey}/labels/{labelId}")
    public ResponseEntity<Void> delete(@PathVariable String projectKey, @PathVariable Long labelId) {
        labelService.delete(projectKey, labelId);
        return ResponseEntity.noContent().build();
    }

    // ── Assign labels to an issue (replace semantics) ──
    @PutMapping("/api/issues/{issueKey}/labels")
    public List<LabelDTO> setLabels(@PathVariable String issueKey,
                                    @RequestBody SetLabelsRequest req) {
        return labelService.setLabelsOnIssue(issueKey, req).stream().map(LabelDTO::from).toList();
    }
}
