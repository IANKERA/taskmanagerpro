package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.model.IssueTemplate;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.repository.IssueTemplateRepository;
import com.example.taskmanagerpro.service.ProjectService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects/{projectKey}/templates")
public class IssueTemplateController {

    private final IssueTemplateRepository templateRepo;
    private final ProjectService projectService;

    public IssueTemplateController(IssueTemplateRepository templateRepo, ProjectService projectService) {
        this.templateRepo = templateRepo;
        this.projectService = projectService;
    }

    @GetMapping
    public List<TemplateDTO> list(@PathVariable String projectKey) {
        Project p = projectService.getByKey(projectKey);
        return templateRepo.findByProjectIdOrderBySortOrder(p.getId())
                .stream().map(this::toDTO).toList();
    }

    @PostMapping
    public ResponseEntity<TemplateDTO> create(@PathVariable String projectKey, @RequestBody CreateTemplateRequest req) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);

        IssueTemplate t = IssueTemplate.builder()
                .project(p)
                .name(req.getName())
                .description(req.getDescription())
                .issueType(req.getIssueType() != null ? req.getIssueType() : IssueType.TASK)
                .priority(req.getPriority() != null ? req.getPriority() : TaskPriority.MEDIUM)
                .bodyTemplate(req.getBodyTemplate())
                .sortOrder(req.getSortOrder())
                .build();
        t = templateRepo.save(t);
        return ResponseEntity.status(201).body(toDTO(t));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String projectKey, @PathVariable Long id) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);
        templateRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private TemplateDTO toDTO(IssueTemplate t) {
        TemplateDTO d = new TemplateDTO();
        d.setId(t.getId());
        d.setName(t.getName());
        d.setDescription(t.getDescription());
        d.setIssueType(t.getIssueType().name());
        d.setPriority(t.getPriority().name());
        d.setBodyTemplate(t.getBodyTemplate());
        d.setSortOrder(t.getSortOrder());
        return d;
    }

    @Data
    public static class TemplateDTO {
        private Long id;
        private String name;
        private String description;
        private String issueType;
        private String priority;
        private String bodyTemplate;
        private int sortOrder;
    }

    @Data
    public static class CreateTemplateRequest {
        private String name;
        private String description;
        private IssueType issueType;
        private TaskPriority priority;
        private String bodyTemplate;
        private int sortOrder;
    }
}
