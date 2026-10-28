package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.*;
import com.example.taskmanagerpro.model.IssueLink;
import com.example.taskmanagerpro.model.TimeLog;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.repository.TimeLogRepository;
import com.example.taskmanagerpro.repository.UserRepository;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.service.IssueService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Jira-shaped API. Use the issueKey ("DEMO-7") rather than the numeric id, which
 * matches what the UI will show users.
 */
@RestController
public class IssueController {

    private final IssueService issueService;
    private final TaskRepository taskRepo;
    private final TimeLogRepository timeLogRepo;
    private final UserRepository userRepo;

    public IssueController(IssueService issueService, TaskRepository taskRepo, TimeLogRepository timeLogRepo, UserRepository userRepo) {
        this.issueService = issueService;
        this.taskRepo = taskRepo;
        this.timeLogRepo = timeLogRepo;
        this.userRepo = userRepo;
    }

    @GetMapping("/api/projects/{projectKey}/issues")
    public List<TaskDTO> listForProject(@PathVariable String projectKey) {
        List<TaskDTO> dtos = Mapper.toTaskDTOList(issueService.listForProject(projectKey));
        // Enrich EPICs with child counts
        for (TaskDTO dto : dtos) {
            if ("EPIC".equals(dto.getIssueType() != null ? dto.getIssueType().name() : "")) {
                dto.setChildCount((int) taskRepo.countByParentId(dto.getId()));
                dto.setChildDoneCount((int) taskRepo.countByParentIdAndStatus(dto.getId(), TaskStatus.DONE));
            }
        }
        return dtos;
    }

    /** Issues in this project with no sprint assigned. */
    @GetMapping("/api/projects/{projectKey}/backlog")
    public List<TaskDTO> backlog(@PathVariable String projectKey) {
        return Mapper.toTaskDTOList(issueService.backlog(projectKey));
    }

    /** Issues attached to a given sprint. */
    @GetMapping("/api/sprints/{sprintId}/issues")
    public List<TaskDTO> sprintIssues(@PathVariable Long sprintId) {
        return Mapper.toTaskDTOList(issueService.issuesInSprint(sprintId));
    }

    @PostMapping("/api/projects/{projectKey}/issues")
    public ResponseEntity<TaskDTO> create(@PathVariable String projectKey,
                                          @Valid @RequestBody CreateIssueRequest req) {
        Task t = issueService.create(projectKey, req);
        return ResponseEntity.status(201).body(Mapper.toTaskDTO(t));
    }

    @GetMapping("/api/issues/{issueKey}")
    public TaskDTO get(@PathVariable String issueKey) {
        return Mapper.toTaskDTO(issueService.getByIssueKey(issueKey));
    }

    @PatchMapping("/api/issues/{issueKey}")
    public TaskDTO update(@PathVariable String issueKey,
                          @Valid @RequestBody UpdateIssueRequest req) {
        return Mapper.toTaskDTO(issueService.update(issueKey, req));
    }

    @DeleteMapping("/api/issues/{issueKey}")
    public ResponseEntity<Void> delete(@PathVariable String issueKey) {
        issueService.delete(issueKey);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/projects/{projectKey}/issues/export")
    public void exportCsv(@PathVariable String projectKey, HttpServletResponse response) throws Exception {
        List<TaskDTO> issues = Mapper.toTaskDTOList(issueService.listForProject(projectKey));
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + projectKey + "-issues.csv\"");

        var writer = response.getWriter();
        writer.println("Key,Title,Status,Priority,Type,Assignee,Story Points,Due Date,Sprint");
        for (TaskDTO t : issues) {
            writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s%n",
                    csvEscape(t.getIssueKey()),
                    csvEscape(t.getTitle()),
                    t.getStatus(),
                    t.getPriority(),
                    t.getIssueType(),
                    csvEscape(t.getAssigneeUsername()),
                    t.getStoryPoints() != null ? t.getStoryPoints() : "",
                    t.getDueDate() != null ? t.getDueDate() : "",
                    csvEscape(t.getSprintName())
            );
        }
        writer.flush();
    }

    // ───── Reorder ─────

    @PostMapping("/api/projects/{projectKey}/issues/reorder")
    public ResponseEntity<Void> reorder(@PathVariable String projectKey,
                                         @RequestBody java.util.List<String> issueKeys) {
        issueService.reorder(projectKey, issueKeys);
        return ResponseEntity.ok().build();
    }

    // ───── CSV Import ─────

    @PostMapping("/api/projects/{projectKey}/issues/import")
    public ResponseEntity<java.util.Map<String, Object>> importCsv(
            @PathVariable String projectKey,
            @RequestParam("file") MultipartFile file) throws Exception {
        if (file.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "File is empty");

        var reader = new java.io.BufferedReader(new java.io.InputStreamReader(file.getInputStream()));
        String headerLine = reader.readLine();
        if (headerLine == null) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "CSV file is empty");

        // Parse header — support flexible column names
        String[] headers = headerLine.split(",");
        java.util.Map<String, Integer> colIdx = new java.util.HashMap<>();
        for (int i = 0; i < headers.length; i++) {
            colIdx.put(headers[i].trim().toLowerCase().replaceAll("[\"']", ""), i);
        }

        int created = 0;
        List<String> errors = new java.util.ArrayList<>();
        String line;
        int lineNum = 1;
        while ((line = reader.readLine()) != null) {
            lineNum++;
            if (line.isBlank()) continue;
            try {
                String[] cols = parseCsvLine(line);
                String title = getCol(cols, colIdx, "title");
                if (title == null || title.isBlank()) { errors.add("Line " + lineNum + ": missing title"); continue; }

                CreateIssueRequest req = new CreateIssueRequest();
                req.setTitle(title);
                req.setDescription(getCol(cols, colIdx, "description"));

                String typeStr = getCol(cols, colIdx, "type");
                if (typeStr == null) typeStr = getCol(cols, colIdx, "issuetype");
                if (typeStr != null) {
                    try { req.setIssueType(com.example.taskmanagerpro.model.enums.IssueType.valueOf(typeStr.toUpperCase())); } catch (IllegalArgumentException ignored) {}
                }

                String prioStr = getCol(cols, colIdx, "priority");
                if (prioStr != null) {
                    try { req.setPriority(com.example.taskmanagerpro.model.enums.TaskPriority.valueOf(prioStr.toUpperCase())); } catch (IllegalArgumentException ignored) {}
                }

                String assignee = getCol(cols, colIdx, "assignee");
                if (assignee == null) assignee = getCol(cols, colIdx, "assigneeusername");
                if (assignee != null) req.setAssigneeUsername(assignee);

                String dueDate = getCol(cols, colIdx, "duedate");
                if (dueDate == null) dueDate = getCol(cols, colIdx, "due date");
                if (dueDate != null) {
                    try { req.setDueDate(java.time.LocalDate.parse(dueDate.trim())); } catch (Exception ignored) {}
                }

                issueService.create(projectKey, req);
                created++;
            } catch (Exception e) {
                errors.add("Line " + lineNum + ": " + e.getMessage());
            }
        }

        var result = new java.util.LinkedHashMap<String, Object>();
        result.put("created", created);
        result.put("errors", errors);
        return ResponseEntity.ok(result);
    }

    private String getCol(String[] cols, java.util.Map<String, Integer> idx, String name) {
        Integer i = idx.get(name);
        if (i == null || i >= cols.length) return null;
        String v = cols[i].trim();
        if (v.startsWith("\"") && v.endsWith("\"")) v = v.substring(1, v.length() - 1).replace("\"\"", "\"");
        return v.isEmpty() ? null : v;
    }

    private String[] parseCsvLine(String line) {
        List<String> fields = new java.util.ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    sb.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                fields.add(sb.toString());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        fields.add(sb.toString());
        return fields.toArray(new String[0]);
    }

    // ───── M19: Time tracking ─────

    @GetMapping("/api/issues/{issueKey}/time-logs")
    public java.util.Map<String, Object> timeLogs(@PathVariable String issueKey) {
        Task t = issueService.getByIssueKey(issueKey);
        List<TimeLogDTO> logs = timeLogRepo.findByTaskId(t.getId()).stream()
                .map(tl -> TimeLogDTO.builder()
                        .id(tl.getId())
                        .minutes(tl.getMinutes())
                        .description(tl.getDescription())
                        .loggedAt(tl.getLoggedAt())
                        .username(tl.getUser().getUsername())
                        .build())
                .toList();
        int totalMinutes = timeLogRepo.sumMinutesByTaskId(t.getId());
        return java.util.Map.of("logs", logs, "totalMinutes", totalMinutes,
                "estimateMinutes", t.getEstimateMinutes() != null ? t.getEstimateMinutes() : 0);
    }

    @PostMapping("/api/issues/{issueKey}/time-logs")
    public ResponseEntity<TimeLogDTO> logTime(@PathVariable String issueKey,
                                               @Valid @RequestBody LogTimeRequest req) {
        Task t = issueService.getByIssueKeyForMember(issueKey);
        String username = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        com.example.taskmanagerpro.model.User user = userRepo.findByUsername(username)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found"));

        TimeLog tl = TimeLog.builder()
                .task(t)
                .user(user)
                .minutes(req.getMinutes())
                .description(req.getDescription())
                .loggedAt(req.getLoggedAt() != null ? req.getLoggedAt() : java.time.LocalDate.now())
                .build();
        tl = timeLogRepo.save(tl);

        return ResponseEntity.status(201).body(TimeLogDTO.builder()
                .id(tl.getId()).minutes(tl.getMinutes())
                .description(tl.getDescription()).loggedAt(tl.getLoggedAt())
                .username(user.getUsername()).build());
    }

    @DeleteMapping("/api/issues/{issueKey}/time-logs/{logId}")
    public ResponseEntity<Void> deleteTimeLog(@PathVariable String issueKey, @PathVariable Long logId) {
        issueService.deleteTimeLog(issueKey, logId);
        return ResponseEntity.noContent().build();
    }

    // ───── M65: Move issue between projects ─────

    @PostMapping("/api/issues/{issueKey}/move")
    public TaskDTO move(@PathVariable String issueKey,
                        @RequestBody java.util.Map<String, String> body) {
        String targetProjectKey = body.get("targetProjectKey");
        if (targetProjectKey == null || targetProjectKey.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "targetProjectKey is required");
        }
        return Mapper.toTaskDTO(issueService.moveToProject(issueKey, targetProjectKey));
    }

    // ───── M18: Issue linking ─────

    @GetMapping("/api/issues/{issueKey}/links")
    public List<IssueLinkDTO> listLinks(@PathVariable String issueKey) {
        Task task = issueService.getByIssueKey(issueKey);
        return issueService.listLinks(issueKey).stream().map(l -> {
            boolean isSource = l.getSource().getId().equals(task.getId());
            Task other = isSource ? l.getTarget() : l.getSource();
            String linkType = isSource ? l.getLinkType().name() : l.getLinkType().inverse().name();
            String label = linkType.toLowerCase().replace('_', ' ');
            return IssueLinkDTO.builder()
                    .id(l.getId())
                    .linkType(linkType)
                    .linkLabel(label)
                    .issueKey(other.getIssueKey())
                    .title(other.getTitle())
                    .status(other.getStatus().name())
                    .issueType(other.getIssueType().name())
                    .build();
        }).toList();
    }

    @PostMapping("/api/issues/{issueKey}/links")
    public ResponseEntity<IssueLinkDTO> createLink(@PathVariable String issueKey,
                                                    @Valid @RequestBody CreateLinkRequest req) {
        IssueLink l = issueService.createLink(issueKey, req);
        Task other = l.getTarget();
        IssueLinkDTO dto = IssueLinkDTO.builder()
                .id(l.getId())
                .linkType(l.getLinkType().name())
                .linkLabel(l.getLinkType().name().toLowerCase().replace('_', ' '))
                .issueKey(other.getIssueKey())
                .title(other.getTitle())
                .status(other.getStatus().name())
                .issueType(other.getIssueType().name())
                .build();
        return ResponseEntity.status(201).body(dto);
    }

    @DeleteMapping("/api/issues/links/{linkId}")
    public ResponseEntity<Void> deleteLink(@PathVariable Long linkId) {
        issueService.deleteLink(linkId);
        return ResponseEntity.noContent().build();
    }

    // ───── M48: Watchers ─────

    @PostMapping("/api/issues/{issueKey}/watch")
    public TaskDTO toggleWatch(@PathVariable String issueKey) {
        return Mapper.toTaskDTO(issueService.toggleWatch(issueKey));
    }

    // ───── M18: Bulk update ─────

    @PostMapping("/api/projects/{projectKey}/issues/bulk-update")
    public List<TaskDTO> bulkUpdate(@PathVariable String projectKey,
                                    @Valid @RequestBody BulkUpdateRequest req) {
        return Mapper.toTaskDTOList(issueService.bulkUpdate(projectKey, req));
    }

    private String csvEscape(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
