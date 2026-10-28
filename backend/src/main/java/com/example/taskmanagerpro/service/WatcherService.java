package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class WatcherService {

    private final TaskRepository taskRepo;
    private final IssueService issueService;
    private final ProjectService projectService;

    public WatcherService(TaskRepository taskRepo, IssueService issueService, ProjectService projectService) {
        this.taskRepo = taskRepo;
        this.issueService = issueService;
        this.projectService = projectService;
    }

    @Transactional(readOnly = true)
    public List<User> list(String issueKey) {
        Task t = issueService.getByIssueKey(issueKey); // membership enforced
        // Force lazy init while session is open.
        t.getWatchers().forEach(User::getUsername);
        return List.copyOf(t.getWatchers());
    }

    @Transactional
    public Set<User> watchSelf(String issueKey) {
        Task t = issueService.getByIssueKey(issueKey);
        User me = projectService.currentUser();
        t.getWatchers().add(me);
        taskRepo.save(t);
        return t.getWatchers();
    }

    @Transactional
    public void unwatchSelf(String issueKey) {
        Task t = issueService.getByIssueKey(issueKey);
        User me = projectService.currentUser();
        t.getWatchers().removeIf(w -> w.getId().equals(me.getId()));
        taskRepo.save(t);
    }
}
