package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.service.WatcherService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class WatcherController {

    private final WatcherService watcherService;

    public WatcherController(WatcherService watcherService) {
        this.watcherService = watcherService;
    }

    @GetMapping("/api/issues/{issueKey}/watchers")
    public List<Map<String, Object>> list(@PathVariable String issueKey) {
        return watcherService.list(issueKey).stream()
                .map(u -> Map.<String, Object>of("id", u.getId(), "username", u.getUsername()))
                .toList();
    }

    @PostMapping("/api/issues/{issueKey}/watchers/me")
    public ResponseEntity<Void> watch(@PathVariable String issueKey) {
        watcherService.watchSelf(issueKey);
        return ResponseEntity.status(201).build();
    }

    @DeleteMapping("/api/issues/{issueKey}/watchers/me")
    public ResponseEntity<Void> unwatch(@PathVariable String issueKey) {
        watcherService.unwatchSelf(issueKey);
        return ResponseEntity.noContent().build();
    }
}
