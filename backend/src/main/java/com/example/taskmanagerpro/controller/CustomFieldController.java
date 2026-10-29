package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.*;
import com.example.taskmanagerpro.model.CustomFieldDefinition;
import com.example.taskmanagerpro.model.CustomFieldValue;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.repository.CustomFieldDefinitionRepository;
import com.example.taskmanagerpro.repository.CustomFieldValueRepository;
import com.example.taskmanagerpro.service.IssueService;
import com.example.taskmanagerpro.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class CustomFieldController {

    private final CustomFieldDefinitionRepository fieldRepo;
    private final CustomFieldValueRepository valueRepo;
    private final ProjectService projectService;
    private final IssueService issueService;

    public CustomFieldController(CustomFieldDefinitionRepository fieldRepo,
                                  CustomFieldValueRepository valueRepo,
                                  ProjectService projectService,
                                  IssueService issueService) {
        this.fieldRepo = fieldRepo;
        this.valueRepo = valueRepo;
        this.projectService = projectService;
        this.issueService = issueService;
    }

    // ───── Field definitions (project-scoped) ─────

    @GetMapping("/api/projects/{projectKey}/custom-fields")
    public List<CustomFieldDTO> listFields(@PathVariable String projectKey) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return fieldRepo.findByProjectIdOrderBySortOrder(p.getId()).stream()
                .map(this::toDTO).toList();
    }

    @PostMapping("/api/projects/{projectKey}/custom-fields")
    @Transactional
    public ResponseEntity<CustomFieldDTO> createField(@PathVariable String projectKey,
                                                       @Valid @RequestBody CreateCustomFieldRequest req) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);
        CustomFieldDefinition f = CustomFieldDefinition.builder()
                .project(p)
                .name(req.getName())
                .fieldType(req.getFieldType())
                .options(req.getOptions())
                .required(req.getRequired() != null ? req.getRequired() : false)
                .sortOrder(req.getSortOrder() != null ? req.getSortOrder() : 0)
                .build();
        return ResponseEntity.status(201).body(toDTO(fieldRepo.save(f)));
    }

    @DeleteMapping("/api/projects/{projectKey}/custom-fields/{fieldId}")
    @Transactional
    public ResponseEntity<Void> deleteField(@PathVariable String projectKey, @PathVariable Long fieldId) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);
        CustomFieldDefinition field = fieldRepo.findByIdAndProject_Id(fieldId, p.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Custom field not found"));
        valueRepo.deleteByFieldId(fieldId);
        fieldRepo.delete(field);
        return ResponseEntity.noContent().build();
    }

    // ───── Field values (issue-scoped) ─────

    @GetMapping("/api/issues/{issueKey}/custom-fields")
    public List<CustomFieldValueDTO> getValues(@PathVariable String issueKey) {
        Task t = issueService.getByIssueKey(issueKey);
        // Return all field definitions for the project, with values filled in
        List<CustomFieldDefinition> defs = fieldRepo.findByProjectIdOrderBySortOrder(t.getProject().getId());
        List<CustomFieldValue> vals = valueRepo.findByTaskId(t.getId());
        var valMap = new java.util.HashMap<Long, String>();
        for (var v : vals) valMap.put(v.getField().getId(), v.getValue());

        return defs.stream().map(d -> CustomFieldValueDTO.builder()
                .fieldId(d.getId())
                .name(d.getName())
                .fieldType(d.getFieldType())
                .options(d.getOptions())
                .value(valMap.get(d.getId()))
                .build()).toList();
    }

    @PutMapping("/api/issues/{issueKey}/custom-fields")
    @Transactional
    public List<CustomFieldValueDTO> setValues(@PathVariable String issueKey,
                                                @Valid @RequestBody List<SetFieldValueRequest> reqs) {
        Task t = issueService.getByIssueKey(issueKey);
        projectService.requireProjectRole(t.getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);

        for (var req : reqs) {
            CustomFieldDefinition field = fieldRepo.findByIdAndProject_Id(
                            req.getFieldId(), t.getProject().getId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Custom field does not belong to this project's issue"));
            var existing = valueRepo.findByTaskIdAndFieldId(t.getId(), field.getId());
            if (req.getValue() == null || req.getValue().isBlank()) {
                existing.ifPresent(valueRepo::delete);
            } else {
                CustomFieldValue v = existing.orElse(CustomFieldValue.builder()
                        .task(t)
                        .field(field)
                        .build());
                v.setValue(req.getValue());
                valueRepo.save(v);
            }
        }
        return getValues(issueKey);
    }

    private CustomFieldDTO toDTO(CustomFieldDefinition d) {
        return CustomFieldDTO.builder()
                .id(d.getId()).name(d.getName())
                .fieldType(d.getFieldType()).options(d.getOptions())
                .required(d.getRequired()).sortOrder(d.getSortOrder())
                .build();
    }
}
