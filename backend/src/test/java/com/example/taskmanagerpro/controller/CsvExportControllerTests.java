package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.TimeLog;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import com.example.taskmanagerpro.repository.TimeLogRepository;
import com.example.taskmanagerpro.repository.UserRepository;
import com.example.taskmanagerpro.service.IssueService;
import com.example.taskmanagerpro.service.ProjectService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CsvExportControllerTests {

    @Mock private IssueService issueService;
    @Mock private TaskRepository taskRepository;
    @Mock private TimeLogRepository timeLogRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProjectService projectService;

    @Test
    void issueExportEscapesFormulaAndCsvSpecialCharacters() throws Exception {
        Task issue = new Task();
        issue.setIssueKey("PROJ-1");
        issue.setTitle("=SUM(1,2)\r\n\"quoted\"");
        issue.setStatus(TaskStatus.PENDING);
        issue.setPriority(TaskPriority.HIGH);
        issue.setIssueType(IssueType.TASK);
        User assignee = new User();
        assignee.setUsername("@formula");
        issue.setAssignee(assignee);
        when(issueService.listForProject("PROJ")).thenReturn(List.of(issue));

        StringWriter content = new StringWriter();
        HttpServletResponse response = org.mockito.Mockito.mock(HttpServletResponse.class);
        when(response.getWriter()).thenReturn(new PrintWriter(content));

        new IssueController(issueService, taskRepository, timeLogRepository, userRepository)
                .exportCsv("PROJ", response);

        String csv = content.toString();
        assertTrue(csv.contains("\"'=SUM(1,2)\r\n\"\"quoted\"\"\""));
        assertTrue(csv.contains(",'@formula,"));
    }

    @Test
    void timeReportExportUsesTheSameFormulaAndCsvEscaping() {
        Project project = Project.builder().id(1L).key("PROJ").build();
        Task issue = new Task();
        issue.setIssueKey("PROJ-2");
        issue.setTitle("ordinary issue");
        User user = new User();
        user.setUsername("+SUM(A1:A2)");
        TimeLog timeLog = TimeLog.builder()
                .task(issue)
                .user(user)
                .minutes(30)
                .description("=1+1,\r\n\"quoted\"")
                .loggedAt(LocalDate.of(2026, 1, 2))
                .build();
        when(projectService.getByKey("PROJ")).thenReturn(project);
        when(timeLogRepository.findByProjectId(1L)).thenReturn(List.of(timeLog));

        byte[] response = new TimeReportController(timeLogRepository, projectService)
                .exportCsv("PROJ").getBody();

        String csv = new String(response, StandardCharsets.UTF_8);
        assertTrue(csv.contains(",'+SUM(A1:A2),"));
        assertTrue(csv.contains("\"'=1+1,\r\n\"\"quoted\"\"\""));
    }
}
