package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.CreateLabelRequest;
import com.example.taskmanagerpro.dto.SetLabelsRequest;
import com.example.taskmanagerpro.model.Label;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.repository.LabelRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
public class LabelService {

    private final LabelRepository labelRepo;
    private final TaskRepository taskRepo;
    private final ProjectService projectService;
    private final IssueService issueService;
    private final ActivityService activityService;

    public LabelService(LabelRepository labelRepo,
                        TaskRepository taskRepo,
                        ProjectService projectService,
                        IssueService issueService,
                        ActivityService activityService) {
        this.labelRepo = labelRepo;
        this.taskRepo = taskRepo;
        this.projectService = projectService;
        this.issueService = issueService;
        this.activityService = activityService;
    }

    @Transactional(readOnly = true)
    public List<Label> list(String projectKey) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        return labelRepo.findByProjectIdOrderByNameAsc(p.getId());
    }

    @Transactional
    public Label create(String projectKey, CreateLabelRequest req) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);
        if (labelRepo.existsByProjectIdAndName(p.getId(), req.getName())) {
            throw new ResponseStatusException(CONFLICT, "Label already exists: " + req.getName());
        }
        Label l = Label.builder()
                .project(p)
                .name(req.getName())
                .color(req.getColor() == null ? "#6b7280" : req.getColor())
                .build();
        return labelRepo.save(l);
    }

    @Transactional
    public void delete(String projectKey, Long labelId) {
        Project p = projectService.getByKey(projectKey);
        projectService.requireProjectRole(p.getId(), ProjectRole.ADMIN);
        Label l = labelRepo.findById(labelId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Label not found"));
        if (!l.getProject().getId().equals(p.getId())) {
            throw new ResponseStatusException(NOT_FOUND, "Label not in this project");
        }
        labelRepo.delete(l);
    }

    /**
     * Replace the issue's label set with exactly the requested IDs.
     * All labels must belong to the issue's project. Diff is recorded in the activity log.
     */
    @Transactional
    public Set<Label> setLabelsOnIssue(String issueKey, SetLabelsRequest req) {
        Task t = issueService.getByIssueKey(issueKey);
        projectService.requireProjectRole(t.getProject().getId(), ProjectRole.MEMBER, ProjectRole.ADMIN);

        List<Long> ids = req.getLabelIds() == null ? List.of() : req.getLabelIds();
        List<Label> requested = ids.isEmpty()
                ? List.of()
                : labelRepo.findByProjectIdAndIdIn(t.getProject().getId(), ids);
        if (requested.size() != ids.size()) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "One or more label IDs are unknown or belong to a different project");
        }

        Set<String> before = t.getLabels().stream().map(Label::getName).collect(Collectors.toCollection(java.util.TreeSet::new));
        Set<String> after  = requested.stream().map(Label::getName).collect(Collectors.toCollection(java.util.TreeSet::new));

        t.getLabels().clear();
        t.getLabels().addAll(requested);
        taskRepo.save(t);

        if (!before.equals(after)) {
            User actor = projectService.currentUser();
            activityService.logFieldChange(t, actor, "labels",
                    before.isEmpty() ? "(none)" : String.join(", ", before),
                    after.isEmpty()  ? "(none)" : String.join(", ", after));
        }
        return new HashSet<>(requested);
    }
}
