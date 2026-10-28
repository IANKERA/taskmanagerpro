package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.CreateSprintRequest;
import com.example.taskmanagerpro.dto.SprintDTO;
import com.example.taskmanagerpro.dto.UpdateSprintRequest;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.service.BurndownService;
import com.example.taskmanagerpro.service.SprintService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class SprintController {

    private final SprintService sprintService;
    private final TaskRepository taskRepo;
    private final BurndownService burndownService;

    public SprintController(SprintService sprintService, TaskRepository taskRepo,
                            BurndownService burndownService) {
        this.sprintService = sprintService;
        this.taskRepo = taskRepo;
        this.burndownService = burndownService;
    }

    @GetMapping("/api/projects/{projectKey}/sprints")
    public List<SprintDTO> list(@PathVariable String projectKey) {
        return sprintService.listForProject(projectKey).stream().map(s -> {
            SprintDTO dto = SprintDTO.from(s);
            dto.setIssueCount(taskRepo.countBySprintId(s.getId()));
            dto.setDoneCount(taskRepo.countBySprintIdAndStatus(s.getId(), TaskStatus.DONE));
            dto.setTotalPoints(taskRepo.sumPointsBySprintId(s.getId()));
            dto.setDonePoints(taskRepo.sumPointsBySprintIdAndStatus(s.getId(), TaskStatus.DONE));
            return dto;
        }).toList();
    }

    @PostMapping("/api/projects/{projectKey}/sprints")
    public ResponseEntity<SprintDTO> create(@PathVariable String projectKey,
                                             @Valid @RequestBody CreateSprintRequest req) {
        return ResponseEntity.status(201).body(SprintDTO.from(sprintService.create(projectKey, req)));
    }

    @GetMapping("/api/sprints/{id}")
    public SprintDTO get(@PathVariable Long id) {
        return SprintDTO.from(sprintService.get(id));
    }

    @PatchMapping("/api/sprints/{id}")
    public SprintDTO update(@PathVariable Long id, @Valid @RequestBody UpdateSprintRequest req) {
        return SprintDTO.from(sprintService.update(id, req));
    }

    @PostMapping("/api/sprints/{id}/start")
    public SprintDTO start(@PathVariable Long id) {
        return SprintDTO.from(sprintService.start(id));
    }

    @PostMapping("/api/sprints/{id}/close")
    public SprintDTO close(@PathVariable Long id) {
        return SprintDTO.from(sprintService.close(id));
    }

    @GetMapping("/api/sprints/{id}/burndown")
    public List<Map<String, Object>> burndown(@PathVariable Long id) {
        return burndownService.burndown(id);
    }
}
