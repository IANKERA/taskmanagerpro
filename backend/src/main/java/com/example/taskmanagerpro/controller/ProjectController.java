package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.AddMemberRequest;
import com.example.taskmanagerpro.dto.CreateProjectRequest;
import com.example.taskmanagerpro.dto.ProjectDTO;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.ProjectMembership;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
        return projectService.listForCurrentUser().stream().map(p -> {
            ProjectDTO dto = ProjectDTO.from(p);
            dto.setOpenCount(taskRepo.countByProjectAndStatus(p.getId(), TaskStatus.PENDING));
            dto.setInProgressCount(taskRepo.countByProjectAndStatus(p.getId(), TaskStatus.IN_PROGRESS));
            dto.setDoneCount(taskRepo.countByProjectAndStatus(p.getId(), TaskStatus.DONE));
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
