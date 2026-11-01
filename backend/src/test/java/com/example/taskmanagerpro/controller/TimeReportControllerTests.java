package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.TimeLog;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.repository.TimeLogRepository;
import com.example.taskmanagerpro.service.ProjectService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TimeReportControllerTests {

    @Mock
    private TimeLogRepository timeLogRepository;

    @Mock
    private ProjectService projectService;

    private TimeReportController controller;

    private Project project;
    private User alice;
    private User bob;
    private User charlie;
    private Task task1;
    private Task task2;
    private Task task3;

    @BeforeEach
    void setUp() {
        controller = new TimeReportController(timeLogRepository, projectService);

        project = Project.builder().id(10L).key("PROJ").name("Test Project").build();
        alice = User.builder().id(1L).username("alice").build();
        bob = User.builder().id(2L).username("bob").build();
        charlie = User.builder().id(3L).username("charlie").build();

        task1 = Task.builder().id(101L).issueKey("PROJ-1").title("Setup architecture").project(project).build();
        task2 = Task.builder().id(102L).issueKey("PROJ-2").title("Frontend components").project(project).build();
        task3 = Task.builder().id(103L).issueKey("PROJ-3").title("Old database migration").project(project).build();
    }

    @Test
    void getReportAggregatesTotalsAndGroupsByUserIssueAndDay() {
        when(projectService.getByKey("PROJ")).thenReturn(project);

        LocalDate today = LocalDate.now();
        TimeLog log1 = TimeLog.builder().id(1L).task(task1).user(alice).minutes(90)
                .description("Initial setup").loggedAt(today).build();
        TimeLog log2 = TimeLog.builder().id(2L).task(task1).user(bob).minutes(30)
                .description("Review setup").loggedAt(today).build();
        TimeLog log3 = TimeLog.builder().id(3L).task(task2).user(alice).minutes(60)
                .description("Build modals").loggedAt(today.minusDays(5)).build();
        TimeLog log4 = TimeLog.builder().id(4L).task(task3).user(charlie).minutes(45)
                .description("Old task").loggedAt(today.minusDays(35)).build();
        TimeLog log5 = TimeLog.builder().id(5L).task(task2).user(alice).minutes(15)
                .description("Day 30 boundary check").loggedAt(today.minusDays(30)).build();

        when(timeLogRepository.findByProjectId(10L)).thenReturn(List.of(log1, log2, log3, log4, log5));

        TimeReportController.TimeReportResponse report = controller.getReport("PROJ");

        assertNotNull(report);
        assertEquals(240, report.getTotalMinutes());
        assertEquals(5, report.getTotalEntries());
        assertEquals(5, report.getEntries().size());

        // Check entries detail
        assertEquals("PROJ-1", report.getEntries().get(0).getIssueKey());
        assertEquals("Setup architecture", report.getEntries().get(0).getIssueTitle());
        assertEquals("alice", report.getEntries().get(0).getUsername());
        assertEquals(90, report.getEntries().get(0).getMinutes());

        // Check byUser aggregation sorted descending
        assertEquals(3, report.getByUser().size());
        assertEquals("alice", report.getByUser().get(0).getUsername());
        assertEquals(165, report.getByUser().get(0).getMinutes());
        assertEquals("charlie", report.getByUser().get(1).getUsername());
        assertEquals(45, report.getByUser().get(1).getMinutes());
        assertEquals("bob", report.getByUser().get(2).getUsername());
        assertEquals(30, report.getByUser().get(2).getMinutes());

        // Check byIssue aggregation sorted descending
        assertEquals(3, report.getByIssue().size());
        assertEquals("PROJ-1", report.getByIssue().get(0).getIssueKey());
        assertEquals(120, report.getByIssue().get(0).getMinutes());
        assertEquals("PROJ-2", report.getByIssue().get(1).getIssueKey());
        assertEquals(75, report.getByIssue().get(1).getMinutes());
        assertEquals("PROJ-3", report.getByIssue().get(2).getIssueKey());
        assertEquals(45, report.getByIssue().get(2).getMinutes());

        // Check byDay aggregation: excludes day -35, includes day -30 boundary, sorted ascending
        assertEquals(3, report.getByDay().size());
        assertEquals(today.minusDays(30), report.getByDay().get(0).getDate());
        assertEquals(15, report.getByDay().get(0).getMinutes());
        assertEquals(today.minusDays(5), report.getByDay().get(1).getDate());
        assertEquals(60, report.getByDay().get(1).getMinutes());
        assertEquals(today, report.getByDay().get(2).getDate());
        assertEquals(120, report.getByDay().get(2).getMinutes());
    }

    @Test
    void exportCsvFormatsColumnsProperlyAndUsesDotDecimal() {
        when(projectService.getByKey("PROJ")).thenReturn(project);

        TimeLog log = TimeLog.builder()
                .id(1L)
                .task(task1)
                .user(alice)
                .minutes(90)
                .description("Initial setup, with \"quotes\" & commas")
                .loggedAt(LocalDate.of(2026, 11, 1))
                .build();

        when(timeLogRepository.findByProjectId(10L)).thenReturn(List.of(log));

        ResponseEntity<byte[]> response = controller.exportCsv("PROJ");

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getHeaders().getFirst("Content-Disposition")
                .contains("attachment; filename=PROJ-time-report.csv"));

        String csv = new String(response.getBody(), StandardCharsets.UTF_8);
        String[] lines = csv.split("\n");

        assertEquals(2, lines.length);
        assertEquals("Issue Key,Issue Title,User,Minutes,Hours,Description,Date", lines[0].trim());

        // Hours should format as 1.5 with dot, not comma
        assertTrue(lines[1].contains(",90,1.5,"));
        assertTrue(lines[1].contains("\"Initial setup, with \"\"quotes\"\" & commas\""));
        assertTrue(lines[1].endsWith(",2026-11-01"));
    }

    @Test
    void emptyTimeLogsReturnsZeroTotalsAndEmptyLists() {
        when(projectService.getByKey("PROJ")).thenReturn(project);
        when(timeLogRepository.findByProjectId(10L)).thenReturn(List.of());

        TimeReportController.TimeReportResponse report = controller.getReport("PROJ");

        assertNotNull(report);
        assertEquals(0, report.getTotalMinutes());
        assertEquals(0, report.getTotalEntries());
        assertTrue(report.getEntries().isEmpty());
        assertTrue(report.getByUser().isEmpty());
        assertTrue(report.getByIssue().isEmpty());
        assertTrue(report.getByDay().isEmpty());

        ResponseEntity<byte[]> response = controller.exportCsv("PROJ");
        String csv = new String(response.getBody(), StandardCharsets.UTF_8);
        assertEquals("Issue Key,Issue Title,User,Minutes,Hours,Description,Date\n", csv);
    }
}

