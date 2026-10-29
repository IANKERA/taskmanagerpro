package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.WorkflowRule;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.repository.WorkflowRuleRepository;
import com.example.taskmanagerpro.service.ProjectService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/projects/{projectKey}/workflow-rules")
public class WorkflowRuleController {

    private final WorkflowRuleRepository ruleRepo;
    private final ProjectService projectService;

    public WorkflowRuleController(WorkflowRuleRepository ruleRepo, ProjectService projectService) {
        this.ruleRepo = ruleRepo;
        this.projectService = projectService;
    }

    @GetMapping
    public List<RuleDTO> list(@PathVariable String projectKey) {
        Project p = projectService.getByKey(projectKey);
        return ruleRepo.findByProjectIdOrderByCreatedAtDesc(p.getId())
                .stream().map(this::toDTO).toList();
    }

    @PostMapping
    public ResponseEntity<RuleDTO> create(@PathVariable String projectKey, @RequestBody CreateRuleRequest req) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);

        WorkflowRule rule = WorkflowRule.builder()
                .project(p)
                .name(req.getName())
                .triggerField(req.getTriggerField())
                .triggerValue(req.getTriggerValue())
                .actionType(req.getActionType())
                .actionField(req.getActionField())
                .actionValue(req.getActionValue())
                .enabled(true)
                .build();
        rule = ruleRepo.save(rule);
        return ResponseEntity.status(201).body(toDTO(rule));
    }

    @PatchMapping("/{id}/toggle")
    public RuleDTO toggle(@PathVariable String projectKey, @PathVariable Long id) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);
        WorkflowRule rule = ruleRepo.findByIdAndProject_Id(id, p.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Workflow rule not found"));
        rule.setEnabled(!rule.isEnabled());
        ruleRepo.save(rule);
        return toDTO(rule);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String projectKey, @PathVariable Long id) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);
        WorkflowRule rule = ruleRepo.findByIdAndProject_Id(id, p.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Workflow rule not found"));
        ruleRepo.delete(rule);
        return ResponseEntity.noContent().build();
    }

    private RuleDTO toDTO(WorkflowRule r) {
        RuleDTO d = new RuleDTO();
        d.setId(r.getId());
        d.setName(r.getName());
        d.setTriggerField(r.getTriggerField());
        d.setTriggerValue(r.getTriggerValue());
        d.setActionType(r.getActionType());
        d.setActionField(r.getActionField());
        d.setActionValue(r.getActionValue());
        d.setEnabled(r.isEnabled());
        return d;
    }

    @Data
    public static class RuleDTO {
        private Long id;
        private String name;
        private String triggerField;
        private String triggerValue;
        private String actionType;
        private String actionField;
        private String actionValue;
        private boolean enabled;
    }

    @Data
    public static class CreateRuleRequest {
        private String name;
        private String triggerField;
        private String triggerValue;
        private String actionType;
        private String actionField;
        private String actionValue;
    }
}
