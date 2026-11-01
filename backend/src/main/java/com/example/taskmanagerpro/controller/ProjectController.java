package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.AddMemberRequest;
import com.example.taskmanagerpro.dto.CreateProjectRequest;
import com.example.taskmanagerpro.dto.ProjectDTO;
import com.example.taskmanagerpro.dto.ProjectStatusCountProjection;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.ProjectMembership;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final TaskRepository taskRepo;

    public ProjectController(ProjectService projectService, TaskRepository taskRepo) {
        this.projectService = projectService;
        this.taskRepo = taskRepo;
    }

    @GetMapping
    public List<ProjectDTO> listMine() {
        List<Project> projects = projectService.listForCurrentUser();
        if (projects.isEmpty()) {
            return List.of();
        }

        List<Long> projectIds = projects.stream().map(Project::getId).toList();
        Map<Long, Map<TaskStatus, Long>> statusCountsByProject = taskRepo.countByProjectIdsGroupedByStatus(projectIds)
                .stream()
                .collect(Collectors.groupingBy(
                        ProjectStatusCountProjection::getProjectId,
                        Collectors.toMap(ProjectStatusCountProjection::getStatus, ProjectStatusCountProjection::getCount)
                ));

        return projects.stream().map(p -> {
            ProjectDTO dto = ProjectDTO.from(p);
            Map<TaskStatus, Long> counts = statusCountsByProject.getOrDefault(p.getId(), Collections.emptyMap());
            dto.setOpenCount(counts.getOrDefault(TaskStatus.PENDING, 0L));
            dto.setInProgressCount(counts.getOrDefault(TaskStatus.IN_PROGRESS, 0L));
            dto.setDoneCount(counts.getOrDefault(TaskStatus.DONE, 0L));
            return dto;
        }).toList();
    }

    @GetMapping("/{key}")
    public ProjectDTO getOne(@PathVariable String key) {
        Project p = projectService.getByKey(key);
        return ProjectDTO.from(p);
    }

    @PostMapping
    public ResponseEntity<ProjectDTO> create(@Valid @RequestBody CreateProjectRequest req) {
        Project p = projectService.create(req);
        return ResponseEntity.status(201).body(ProjectDTO.from(p));
    }

    @GetMapping("/{key}/members")
    public List<Map<String, Object>> members(@PathVariable String key) {
        List<ProjectMembership> ms = projectService.listMembers(key);
        return ms.stream().map(m -> Map.<String, Object>of(
                "userId", m.getUser().getId(),
                "username", m.getUser().getUsername(),
                "projectRole", m.getProjectRole().name(),
                "joinedAt", m.getJoinedAt()
        )).toList();
    }

    @GetMapping("/{key}/assignable-users")
    public List<Map<String, Object>> assignableUsers(@PathVariable String key) {
        return projectService.listAssignableMembers(key).stream()
                .map(m -> Map.<String, Object>of(
                        "id", m.getUser().getId(),
                        "username", m.getUser().getUsername()
                ))
                .toList();
    }

    @PatchMapping("/{key}")
    public ProjectDTO update(@PathVariable String key, @RequestBody java.util.Map<String, String> body) {
        Project p = projectService.getByKey(key);
        if (body.containsKey("name")) p.setName(body.get("name"));
        if (body.containsKey("description")) p.setDescription(body.get("description"));
        projectService.save(p);
        return ProjectDTO.from(projectService.getByKey(key));
    }

    @PostMapping("/{key}/archive")
    public ProjectDTO archive(@PathVariable String key) {
        Project p = projectService.getByKey(key);
        p.setArchived(true);
        projectService.save(p);
        return ProjectDTO.from(projectService.getByKey(key));
    }

    @PostMapping("/{key}/unarchive")
    public ProjectDTO unarchive(@PathVariable String key) {
        Project p = projectService.getByKey(key);
        p.setArchived(false);
        projectService.save(p);
        return ProjectDTO.from(projectService.getByKey(key));
    }

    @DeleteMapping("/{key}")
    public ResponseEntity<Void> delete(@PathVariable String key) {
        projectService.deleteProject(key);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{key}/members")
    public ResponseEntity<Map<String, Object>> addMember(@PathVariable String key,
                                                          @Valid @RequestBody AddMemberRequest req) {
        ProjectMembership m = projectService.addMember(key, req);
        return ResponseEntity.status(201).body(Map.of(
                "userId", m.getUser().getId(),
                "username", m.getUser().getUsername(),
                "projectRole", m.getProjectRole().name()
        ));
    }
}
