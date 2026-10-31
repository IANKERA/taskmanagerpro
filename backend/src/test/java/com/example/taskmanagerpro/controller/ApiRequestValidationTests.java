package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.repository.*;
import com.example.taskmanagerpro.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class ApiRequestValidationTests {

    private MockMvc mockMvc;
    private TaskService taskService;
    private RecurringRuleRepository recurringRuleRepository;
    private WorkflowRuleRepository workflowRuleRepository;
    private CustomFieldDefinitionRepository customFieldDefinitionRepository;
    private IssueService issueService;
    private UserService userService;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        taskService = mock(TaskService.class);
        recurringRuleRepository = mock(RecurringRuleRepository.class);
        workflowRuleRepository = mock(WorkflowRuleRepository.class);
        customFieldDefinitionRepository = mock(CustomFieldDefinitionRepository.class);
        issueService = mock(IssueService.class);
        userService = mock(UserService.class);
        notificationService = mock(NotificationService.class);

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = standaloneSetup(
                new TaskController(taskService),
                new RecurringRuleController(recurringRuleRepository, mock(ProjectService.class)),
                new WorkflowRuleController(workflowRuleRepository, mock(ProjectService.class)),
                new CustomFieldController(customFieldDefinitionRepository,
                        mock(CustomFieldValueRepository.class), mock(ProjectService.class), issueService),
                new IssueController(issueService, mock(TaskRepository.class),
                        mock(TimeLogRepository.class), mock(UserRepository.class)),
                new UserController(userService, notificationService))
                .setValidator(validator)
                .setControllerAdvice(new ApiValidationExceptionHandler())
                .build();
    }

    @Test
    void taskCreateReturnsFieldErrorsInsteadOfDatabaseFailure() throws Exception {
        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("title: must not be blank")))
                .andExpect(jsonPath("$.message", containsString("status: must not be null")));

        verifyNoInteractions(taskService);
    }

    @Test
    void recurringRuleCreateValidatesRequiredAndColumnBoundedFields() throws Exception {
        mockMvc.perform(post("/api/projects/TEST/recurring-rules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("name: must not be blank")))
                .andExpect(jsonPath("$.message", containsString("titleTemplate: must not be blank")))
                .andExpect(jsonPath("$.message", containsString("cronExpression: must not be blank")));

        verifyNoInteractions(recurringRuleRepository);
    }

    @Test
    void workflowRuleCreateValidatesRequiredFieldsBeforePersistence() throws Exception {
        mockMvc.perform(post("/api/projects/TEST/workflow-rules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("name: must not be blank")))
                .andExpect(jsonPath("$.message", containsString("triggerField: must not be blank")))
                .andExpect(jsonPath("$.message", containsString("actionValue: must not be blank")));

        verifyNoInteractions(workflowRuleRepository);
    }

    @Test
    void customFieldTypeRejectsUnsupportedValues() throws Exception {
        mockMvc.perform(post("/api/projects/TEST/custom-fields")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"priority\",\"fieldType\":\"UNKNOWN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("fieldType: must be one of TEXT, NUMBER, DATE, or SELECT")));

        verifyNoInteractions(customFieldDefinitionRepository);
    }

    @Test
    void issueLinkRejectsBlankTargetAsValidationError() throws Exception {
        mockMvc.perform(post("/api/issues/TEST-1/links")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetIssueKey\":\" \",\"linkType\":\"BLOCKS\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("targetIssueKey: must not be blank")));

        verifyNoInteractions(issueService);
    }

    @Test
    void selfPasswordResetRejectsMissingCurrentPasswordAsValidationError() throws Exception {
        mockMvc.perform(post("/api/users/me/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"Password123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("oldPassword: must not be blank")));

        verifyNoInteractions(userService);
    }

    @Test
    void nullNotificationPreferenceDoesNotBecomeServerError() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/users/me/notification-preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notifyAssigned\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Notification preferences must be boolean values."));

        verifyNoInteractions(userService);
        verifyNoInteractions(notificationService);
    }
}
