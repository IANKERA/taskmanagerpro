package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.TimeLog;
import com.example.taskmanagerpro.repository.TimeLogRepository;
import com.example.taskmanagerpro.service.ProjectService;
import com.example.taskmanagerpro.util.CsvUtils;
import lombok.Data;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects/{projectKey}/time-report")
public class TimeReportController {

    private final TimeLogRepository timeLogRepo;
    private final ProjectService projectService;

    public TimeReportController(TimeLogRepository timeLogRepo, ProjectService projectService) {
        this.timeLogRepo = timeLogRepo;
        this.projectService = projectService;
    }

    @GetMapping
    public TimeReportResponse getReport(@PathVariable String projectKey) {
        Project p = projectService.getByKey(projectKey);
        List<TimeLog> logs = timeLogRepo.findByProjectId(p.getId());

        TimeReportResponse r = new TimeReportResponse();
        r.totalMinutes = logs.stream().mapToInt(TimeLog::getMinutes).sum();
        r.totalEntries = logs.size();

        // Entries
        r.entries = logs.stream().map(tl -> {
            TimeEntry e = new TimeEntry();
            e.id = tl.getId();
            e.issueKey = tl.getTask().getIssueKey();
            e.issueTitle = tl.getTask().getTitle();
            e.username = tl.getUser().getUsername();
            e.minutes = tl.getMinutes();
            e.description = tl.getDescription();
            e.loggedAt = tl.getLoggedAt();
            return e;
        }).toList();

        // By user
        r.byUser = logs.stream()
                .collect(Collectors.groupingBy(
                        tl -> tl.getUser().getUsername(),
                        Collectors.summingInt(TimeLog::getMinutes)))
                .entrySet().stream()
                .map(e -> { UserTime ut = new UserTime(); ut.username = e.getKey(); ut.minutes = e.getValue(); return ut; })
                .sorted(Comparator.comparingInt((UserTime u) -> u.minutes).reversed())
                .toList();

        // By issue
        r.byIssue = logs.stream()
                .collect(Collectors.groupingBy(
                        tl -> tl.getTask().getIssueKey(),
                        Collectors.summingInt(TimeLog::getMinutes)))
                .entrySet().stream()
                .map(e -> { IssueTime it = new IssueTime(); it.issueKey = e.getKey(); it.minutes = e.getValue(); return it; })
                .sorted(Comparator.comparingInt((IssueTime i) -> i.minutes).reversed())
                .toList();

        // By day (last 30 days)
        r.byDay = logs.stream()
                .filter(tl -> tl.getLoggedAt() != null && tl.getLoggedAt().isAfter(LocalDate.now().minusDays(30)))
                .collect(Collectors.groupingBy(
                        TimeLog::getLoggedAt,
                        Collectors.summingInt(TimeLog::getMinutes)))
                .entrySet().stream()
                .map(e -> { DayTime dt = new DayTime(); dt.date = e.getKey(); dt.minutes = e.getValue(); return dt; })
                .sorted(Comparator.comparing(d -> d.date))
                .toList();

        return r;
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(@PathVariable String projectKey) {
        Project p = projectService.getByKey(projectKey);
        List<TimeLog> logs = timeLogRepo.findByProjectId(p.getId());

        StringBuilder csv = new StringBuilder();
        csv.append("Issue Key,Issue Title,User,Minutes,Hours,Description,Date\n");
        for (TimeLog tl : logs) {
            csv.append(CsvUtils.escape(tl.getTask().getIssueKey())).append(",");
            csv.append(CsvUtils.escape(tl.getTask().getTitle())).append(",");
            csv.append(CsvUtils.escape(tl.getUser().getUsername())).append(",");
            csv.append(tl.getMinutes()).append(",");
            csv.append(String.format("%.1f", tl.getMinutes() / 60.0)).append(",");
            csv.append(CsvUtils.escape(tl.getDescription())).append(",");
            csv.append(tl.getLoggedAt()).append("\n");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + projectKey + "-time-report.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString().getBytes());
    }

    @Data public static class TimeReportResponse {
        int totalMinutes;
        int totalEntries;
        List<TimeEntry> entries;
        List<UserTime> byUser;
        List<IssueTime> byIssue;
        List<DayTime> byDay;
    }
    @Data public static class TimeEntry {
        Long id; String issueKey; String issueTitle; String username;
        int minutes; String description; LocalDate loggedAt;
    }
    @Data public static class UserTime { String username; int minutes; }
    @Data public static class IssueTime { String issueKey; int minutes; }
    @Data public static class DayTime { LocalDate date; int minutes; }
}
