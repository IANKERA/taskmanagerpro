package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.CreateSprintRequest;
import com.example.taskmanagerpro.dto.UpdateSprintRequest;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Sprint;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.model.enums.SprintState;
import com.example.taskmanagerpro.repository.SprintRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.http.HttpStatus.*;

@Service
public class SprintService {

    private final SprintRepository sprintRepo;
    private final ProjectService projectService;

    public SprintService(SprintRepository sprintRepo, ProjectService projectService) {
        this.sprintRepo = sprintRepo;
        this.projectService = projectService;
    }

    @Transactional(readOnly = true)
    public List<Sprint> listForProject(String projectKey) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return sprintRepo.findByProjectIdOrderByCreatedAtDesc(p.getId());
    }

    @Transactional(readOnly = true)
    public Sprint get(Long sprintId) {
        Sprint s = sprintRepo.findById(sprintId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Sprint not found"));
        // Force-init the project proxy so DTO mapping in the controller layer
        // (which runs after the tx closes) doesn't blow up with LazyInitializationException.
        s.getProject().getKey();
        projectService.requireProjectRole(s.getProject().getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return s;
    }

    @Transactional
    public Sprint create(String projectKey, CreateSprintRequest req) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        validateDateRange(req.getStartDate(), req.getEndDate());
        Sprint s = Sprint.builder()
                .project(p)
                .name(req.getName())
                .goal(req.getGoal())
                .state(SprintState.PLANNED)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .build();
        return sprintRepo.save(s);
    }

    @Transactional
    public Sprint update(Long sprintId, UpdateSprintRequest req) {
        Sprint s = get(sprintId);
        projectService.requireProjectRole(s.getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        if (s.getState() == SprintState.CLOSED) {
            throw new ResponseStatusException(CONFLICT, "Closed sprints are immutable");
        }
        if (req.getName() != null)      s.setName(req.getName());
        if (req.getGoal() != null)      s.setGoal(req.getGoal());
        if (req.getStartDate() != null) s.setStartDate(req.getStartDate());
        if (req.getEndDate() != null)   s.setEndDate(req.getEndDate());
        validateDateRange(s.getStartDate(), s.getEndDate());
        return sprintRepo.save(s);
    }

    /** PLANNED → ACTIVE. Postgres partial unique index enforces at most one ACTIVE per project. */
    @Transactional
    public Sprint start(Long sprintId) {
        Sprint s = get(sprintId);
        projectService.requireProjectRole(s.getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        if (s.getState() != SprintState.PLANNED) {
            throw new ResponseStatusException(CONFLICT,
                    "Only PLANNED sprints can be started (current: " + s.getState() + ")");
        }
        // Friendlier error than a constraint-violation DB exception.
        sprintRepo.findByProjectIdAndState(s.getProject().getId(), SprintState.ACTIVE)
                .ifPresent(existing -> {
                    throw new ResponseStatusException(CONFLICT,
                            "Project already has an active sprint: " + existing.getName());
                });
        s.setState(SprintState.ACTIVE);
        s.setStartedAt(LocalDateTime.now());
        return sprintRepo.save(s);
    }

    /** ACTIVE → CLOSED. (Issues in the sprint stay attached; future M8 reports will use the closed-state data.) */
    @Transactional
    public Sprint close(Long sprintId) {
        Sprint s = get(sprintId);
        projectService.requireProjectRole(s.getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        if (s.getState() != SprintState.ACTIVE) {
            throw new ResponseStatusException(CONFLICT,
                    "Only ACTIVE sprints can be closed (current: " + s.getState() + ")");
        }
        s.setState(SprintState.CLOSED);
        s.setClosedAt(LocalDateTime.now());
        return sprintRepo.save(s);
    }

    private void validateDateRange(java.time.LocalDate start, java.time.LocalDate end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new ResponseStatusException(BAD_REQUEST, "endDate must be on or after startDate");
        }
    }
}
