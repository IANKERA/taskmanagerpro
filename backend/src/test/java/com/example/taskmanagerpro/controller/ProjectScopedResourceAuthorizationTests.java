package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.SetFieldValueRequest;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.repository.CustomFieldDefinitionRepository;
import com.example.taskmanagerpro.repository.CustomFieldValueRepository;
import com.example.taskmanagerpro.repository.IssueTemplateRepository;
import com.example.taskmanagerpro.repository.RecurringRuleRepository;
import com.example.taskmanagerpro.repository.WorkflowRuleRepository;
import com.example.taskmanagerpro.service.ActivityService;
import com.example.taskmanagerpro.service.IssueService;
import com.example.taskmanagerpro.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectScopedResourceAuthorizationTests {

    @Mock private CustomFieldDefinitionRepository fieldRepository;
    @Mock private CustomFieldValueRepository fieldValueRepository;
    @Mock private IssueTemplateRepository templateRepository;
    @Mock private RecurringRuleRepository recurringRuleRepository;
    @Mock private WorkflowRuleRepository workflowRuleRepository;
    @Mock private ProjectService projectService;
    @Mock private IssueService issueService;
    @Mock private ActivityService activityService;

    private final Project project = Project.builder().id(1L).key("FIRST").build();

    @Test
    void customFieldDeleteCannotTargetAFieldInAnotherProject() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        CustomFieldController controller = customFieldController();
        when(fieldRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.deleteField("FIRST", 12L));

        assertEquals(404, exception.getStatusCode().value());
        verify(fieldValueRepository, never()).deleteByFieldId(12L);
        verify(fieldRepository, never()).delete(any());
    }

    @Test
    void issueCannotBeAssignedAFieldFromAnotherProject() {
        CustomFieldController controller = customFieldController();
        Task issue = new Task();
        issue.setId(5L);
        issue.setProject(project);
        when(issueService.getByIssueKey("FIRST-5")).thenReturn(issue);
        when(fieldRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.empty());
        SetFieldValueRequest request = new SetFieldValueRequest();
        request.setFieldId(12L);
        request.setValue("cross-project");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.setValues("FIRST-5", List.of(request)));

        assertEquals(400, exception.getStatusCode().value());
        verify(fieldValueRepository, never()).save(any());
    }

    @Test
    void recurringRuleIdsAreScopedToTheAuthorizedProject() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        RecurringRuleController controller =
                new RecurringRuleController(recurringRuleRepository, projectService);
        when(recurringRuleRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.delete("FIRST", 12L));

        assertEquals(404, exception.getStatusCode().value());
        verify(recurringRuleRepository, never()).deleteById(12L);
    }

    @Test
    void recurringRuleToggleCannotTargetAnotherProject() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        RecurringRuleController controller =
                new RecurringRuleController(recurringRuleRepository, projectService);
        when(recurringRuleRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.toggle("FIRST", 12L));

        assertEquals(404, exception.getStatusCode().value());
        verify(recurringRuleRepository, never()).save(any());
    }

    @Test
    void workflowRuleIdsAreScopedToTheAuthorizedProject() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        WorkflowRuleController controller =
                new WorkflowRuleController(workflowRuleRepository, projectService);
        when(workflowRuleRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.delete("FIRST", 12L));

        assertEquals(404, exception.getStatusCode().value());
        verify(workflowRuleRepository, never()).deleteById(12L);
    }

    @Test
    void workflowRuleToggleCannotTargetAnotherProject() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        WorkflowRuleController controller =
                new WorkflowRuleController(workflowRuleRepository, projectService);
        when(workflowRuleRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.toggle("FIRST", 12L));

        assertEquals(404, exception.getStatusCode().value());
        verify(workflowRuleRepository, never()).save(any());
    }

    @Test
    void templateIdsAreScopedToTheAuthorizedProject() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        IssueTemplateController controller =
                new IssueTemplateController(templateRepository, projectService);
        when(templateRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.delete("FIRST", 12L));

        assertEquals(404, exception.getStatusCode().value());
        verify(templateRepository, never()).deleteById(12L);
    }

    private CustomFieldController customFieldController() {
        return new CustomFieldController(
                fieldRepository, fieldValueRepository, projectService, issueService);
    }
}
