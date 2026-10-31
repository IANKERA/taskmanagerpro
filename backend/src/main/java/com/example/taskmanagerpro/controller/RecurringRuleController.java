package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.RecurringRule;
import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.repository.RecurringRuleRepository;
import com.example.taskmanagerpro.service.ProjectService;
import com.example.taskmanagerpro.service.RecurringIssueService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/projects/{projectKey}/recurring-rules")
public class RecurringRuleController {

    private final RecurringRuleRepository ruleRepo;
    private final ProjectService projectService;

    public RecurringRuleController(RecurringRuleRepository ruleRepo, ProjectService projectService) {
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
    public ResponseEntity<RuleDTO> create(@PathVariable String projectKey,
                                          @Valid @RequestBody CreateRuleRequest req) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);

        // Validate cron
        try {
            CronExpression.parse(req.getCronExpression());
        } catch (Exception e) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid cron expression: " + e.getMessage());
        }

        LocalDateTime now = LocalDateTime.now();
        RecurringRule rule = RecurringRule.builder()
                .project(p)
                .createdBy(projectService.currentUser())
                .name(req.getName())
                .titleTemplate(req.getTitleTemplate())
                .description(req.getDescription())
                .issueType(req.getIssueType() != null ? req.getIssueType() : IssueType.TASK)
                .priority(req.getPriority() != null ? req.getPriority() : TaskPriority.MEDIUM)
                .assigneeUsername(req.getAssigneeUsername())
                .cronExpression(req.getCronExpression())
                .enabled(true)
                .nextRunAt(RecurringIssueService.computeNext(req.getCronExpression(), now))
                .build();
        rule = ruleRepo.save(rule);
        return ResponseEntity.status(201).body(toDTO(rule));
    }

    @PatchMapping("/{id}/toggle")
    public RuleDTO toggle(@PathVariable String projectKey, @PathVariable Long id) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);
        RecurringRule rule = ruleRepo.findByIdAndProject_Id(id, p.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Recurring rule not found"));
        rule.setEnabled(!rule.isEnabled());
        if (rule.isEnabled()) {
            rule.setNextRunAt(RecurringIssueService.computeNext(rule.getCronExpression(), LocalDateTime.now()));
        }
        ruleRepo.save(rule);
        return toDTO(rule);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String projectKey, @PathVariable Long id) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);
        RecurringRule rule = ruleRepo.findByIdAndProject_Id(id, p.getId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Recurring rule not found"));
        ruleRepo.delete(rule);
        return ResponseEntity.noContent().build();
    }

    private RuleDTO toDTO(RecurringRule r) {
        RuleDTO d = new RuleDTO();
        d.setId(r.getId());
        d.setName(r.getName());
        d.setTitleTemplate(r.getTitleTemplate());
        d.setDescription(r.getDescription());
        d.setIssueType(r.getIssueType().name());
        d.setPriority(r.getPriority().name());
        d.setAssigneeUsername(r.getAssigneeUsername());
        d.setCronExpression(r.getCronExpression());
        d.setEnabled(r.isEnabled());
        d.setLastRunAt(r.getLastRunAt());
        d.setNextRunAt(r.getNextRunAt());
        d.setCreatedAt(r.getCreatedAt());
        return d;
    }

    @Data
    public static class RuleDTO {
        private Long id;
        private String name;
        private String titleTemplate;
        private String description;
        private String issueType;
        private String priority;
        private String assigneeUsername;
        private String cronExpression;
        private boolean enabled;
        private LocalDateTime lastRunAt;
        private LocalDateTime nextRunAt;
        private LocalDateTime createdAt;
    }

    @Data
    public static class CreateRuleRequest {
        @NotBlank
        @Size(max = 128)
        private String name;
        @NotBlank
        @Size(max = 256)
        private String titleTemplate;
        private String description;
        private IssueType issueType;
        private TaskPriority priority;
        @Size(max = 64)
        private String assigneeUsername;
        @NotBlank
        @Size(max = 64)
        private String cronExpression;
    }
}
