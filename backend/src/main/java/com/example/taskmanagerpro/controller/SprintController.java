package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.CreateSprintRequest;
import com.example.taskmanagerpro.dto.SprintDTO;
import com.example.taskmanagerpro.dto.SprintMetricsProjection;
import com.example.taskmanagerpro.dto.UpdateSprintRequest;
import com.example.taskmanagerpro.model.Sprint;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.service.BurndownService;
import com.example.taskmanagerpro.service.SprintService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

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
        List<Sprint> sprints = sprintService.listForProject(projectKey);
        if (sprints.isEmpty()) {
            return List.of();
        }

        List<Long> sprintIds = sprints.stream().map(Sprint::getId).toList();
        Map<Long, SprintMetricsProjection> metricsMap = taskRepo.getSprintMetricsGroupedBySprintId(sprintIds)
                .stream()
                .collect(Collectors.toMap(SprintMetricsProjection::getSprintId, Function.identity()));

        return sprints.stream().map(s -> {
            SprintDTO dto = SprintDTO.from(s);
            SprintMetricsProjection m = metricsMap.get(s.getId());
            dto.setIssueCount(m != null && m.getIssueCount() != null ? m.getIssueCount() : 0L);
            dto.setDoneCount(m != null && m.getDoneCount() != null ? m.getDoneCount() : 0L);
            dto.setTotalPoints(m != null && m.getTotalPoints() != null ? m.getTotalPoints().intValue() : 0);
            dto.setDonePoints(m != null && m.getDonePoints() != null ? m.getDonePoints().intValue() : 0);
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
