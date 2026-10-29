package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.SetFieldValueRequest;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.CustomFieldDefinition;
import com.example.taskmanagerpro.model.CustomFieldValue;
import com.example.taskmanagerpro.model.IssueTemplate;
import com.example.taskmanagerpro.model.RecurringRule;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.WorkflowRule;
import com.example.taskmanagerpro.model.enums.IssueType;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.model.enums.TaskPriority;
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
import static org.mockito.Mockito.doThrow;
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
    void authorizedProjectAdminCanDeleteOwnCustomFieldAndValues() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        CustomFieldDefinition field = customField();
        when(fieldRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.of(field));

        assertEquals(204, customFieldController().deleteField("FIRST", 12L)
                .getStatusCode().value());

        verify(fieldValueRepository).deleteByFieldId(12L);
        verify(fieldRepository).delete(field);
    }

    @Test
    void nonAdminCannotDeleteCustomField() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN))
                .when(projectService).requireProjectRole(1L, ProjectRole.ADMIN);

        assertThrows(ResponseStatusException.class,
                () -> customFieldController().deleteField("FIRST", 12L));

        verify(fieldRepository, never()).findByIdAndProject_Id(12L, 1L);
        verify(fieldValueRepository, never()).deleteByFieldId(12L);
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
    void projectMemberCanWriteValuesForAnIssueInTheirProject() {
        CustomFieldController controller = customFieldController();
        Task issue = taskInProject();
        CustomFieldDefinition field = customField();
        CustomFieldValue savedValue = CustomFieldValue.builder()
                .task(issue).field(field).value("test value").build();
        when(issueService.getByIssueKey("FIRST-5")).thenReturn(issue);
        when(fieldRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.of(field));
        when(fieldValueRepository.findByTaskIdAndFieldId(5L, 12L)).thenReturn(Optional.empty());
        when(fieldValueRepository.save(any())).thenReturn(savedValue);
        when(fieldRepository.findByProjectIdOrderBySortOrder(1L)).thenReturn(List.of(field));
        when(fieldValueRepository.findByTaskId(5L)).thenReturn(List.of(savedValue));
        SetFieldValueRequest request = new SetFieldValueRequest();
        request.setFieldId(12L);
        request.setValue("test value");

        var result = controller.setValues("FIRST-5", List.of(request));

        assertEquals("test value", result.getFirst().getValue());
        verify(fieldValueRepository).save(any(CustomFieldValue.class));
    }

    @Test
    void nonMemberCannotWriteCustomFieldValues() {
        Task issue = taskInProject();
        when(issueService.getByIssueKey("FIRST-5")).thenReturn(issue);
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN))
                .when(projectService).requireProjectRole(
                        1L, ProjectRole.MEMBER, ProjectRole.ADMIN);
        SetFieldValueRequest request = new SetFieldValueRequest();
        request.setFieldId(12L);
        request.setValue("unauthorized");

        assertThrows(ResponseStatusException.class,
                () -> customFieldController().setValues("FIRST-5", List.of(request)));

        verify(fieldRepository, never()).findByIdAndProject_Id(12L, 1L);
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
    void authorizedProjectAdminCanDeleteOwnRecurringRule() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        RecurringRule rule = recurringRule();
        when(recurringRuleRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.of(rule));

        assertEquals(204, new RecurringRuleController(recurringRuleRepository, projectService)
                .delete("FIRST", 12L).getStatusCode().value());

        verify(recurringRuleRepository).delete(rule);
    }

    @Test
    void nonAdminCannotMutateRecurringRule() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN))
                .when(projectService).requireProjectRole(1L, ProjectRole.ADMIN);

        assertThrows(ResponseStatusException.class,
                () -> new RecurringRuleController(recurringRuleRepository, projectService)
                        .delete("FIRST", 12L));

        verify(recurringRuleRepository, never()).findByIdAndProject_Id(12L, 1L);
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
    void authorizedProjectAdminCanToggleOwnWorkflowRule() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        WorkflowRule rule = WorkflowRule.builder()
                .id(12L).project(project).name("workflow").enabled(true).build();
        when(workflowRuleRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.of(rule));

        new WorkflowRuleController(workflowRuleRepository, projectService).toggle("FIRST", 12L);

        assertEquals(false, rule.isEnabled());
        verify(workflowRuleRepository).save(rule);
    }

    @Test
    void nonAdminCannotToggleWorkflowRule() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN))
                .when(projectService).requireProjectRole(1L, ProjectRole.ADMIN);

        assertThrows(ResponseStatusException.class,
                () -> new WorkflowRuleController(workflowRuleRepository, projectService)
                        .toggle("FIRST", 12L));

        verify(workflowRuleRepository, never()).findByIdAndProject_Id(12L, 1L);
        verify(workflowRuleRepository, never()).save(any());
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

    @Test
    void authorizedProjectAdminCanDeleteOwnTemplate() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        IssueTemplate template = IssueTemplate.builder()
                .id(12L).project(project).name("template")
                .issueType(IssueType.TASK).priority(TaskPriority.MEDIUM).build();
        when(templateRepository.findByIdAndProject_Id(12L, 1L)).thenReturn(Optional.of(template));

        assertEquals(204, new IssueTemplateController(templateRepository, projectService)
                .delete("FIRST", 12L).getStatusCode().value());

        verify(templateRepository).delete(template);
    }

    @Test
    void nonAdminCannotDeleteTemplate() {
        when(projectService.getByKey("FIRST")).thenReturn(project);
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN))
                .when(projectService).requireProjectRole(1L, ProjectRole.ADMIN);

        assertThrows(ResponseStatusException.class,
                () -> new IssueTemplateController(templateRepository, projectService)
                        .delete("FIRST", 12L));

        verify(templateRepository, never()).findByIdAndProject_Id(12L, 1L);
        verify(templateRepository, never()).deleteById(12L);
    }

    private CustomFieldController customFieldController() {
        return new CustomFieldController(
                fieldRepository, fieldValueRepository, projectService, issueService);
    }

    private Task taskInProject() {
        Task task = new Task();
        task.setId(5L);
        task.setProject(project);
        return task;
    }

    private CustomFieldDefinition customField() {
        return CustomFieldDefinition.builder()
                .id(12L).project(project).name("text").fieldType("TEXT").build();
    }

    private RecurringRule recurringRule() {
        User creator = new User();
        creator.setId(2L);
        return RecurringRule.builder()
                .id(12L).project(project).createdBy(creator).name("weekly")
                .titleTemplate("Recurring").issueType(IssueType.TASK)
                .priority(TaskPriority.MEDIUM).cronExpression("0 0 * * *")
                .createdAt(java.time.LocalDateTime.now()).build();
    }
}
