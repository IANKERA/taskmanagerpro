package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.ActivityDTO;
import com.example.taskmanagerpro.model.ActivityLog;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.repository.ActivityLogRepository;
import com.example.taskmanagerpro.service.IssueService;
import com.example.taskmanagerpro.service.ActivityService;
import com.example.taskmanagerpro.service.ProjectService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ActivityController {

    private final ActivityService activityService;
    private final ActivityLogRepository activityLogRepo;
    private final ProjectService projectService;
    private final IssueService issueService;

    public ActivityController(ActivityService activityService,
                              ActivityLogRepository activityLogRepo,
                              ProjectService projectService,
                              IssueService issueService) {
        this.activityService = activityService;
        this.activityLogRepo = activityLogRepo;
        this.projectService = projectService;
        this.issueService = issueService;
    }

    /** Activity for a single issue */
    @GetMapping("/api/projects/{projectKey}/issues/{issueKey}/activity")
    public List<ActivityDTO> issueActivity(@PathVariable String projectKey, @PathVariable String issueKey) {
        var issue = issueService.getByIssueKey(issueKey);
        return activityService.listForTask(issue.getId())
                .stream().map(ActivityDTO::from).toList();
    }

    /** Global activity feed across all user's projects (last 50) */
    @GetMapping("/api/activity/feed")
    public List<ActivityDTO> globalFeed() {
        List<Long> projectIds = projectService.listForCurrentUser().stream()
                .map(p -> p.getId()).toList();
        if (projectIds.isEmpty()) return List.of();
        return activityLogRepo.findRecentByProjects(projectIds)
                .stream().limit(50).map(ActivityDTO::from).toList();
    }

    /** Recent activity across entire project (last 100) */
    @GetMapping("/api/projects/{projectKey}/activity")
    public List<ActivityDTO> projectActivity(@PathVariable String projectKey) {
        Project p = projectService.getByKey(projectKey);
        return activityLogRepo.findRecentByProjects(List.of(p.getId()))
                .stream().limit(100).map(ActivityDTO::from).toList();
    }
}
