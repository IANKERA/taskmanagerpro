package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.WorkflowRule;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.UserRepository;
import com.example.taskmanagerpro.repository.WorkflowRuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Evaluates workflow rules after an issue field changes.
 * Called from IssueService.update() after each field change is applied.
 */
@Service
public class WorkflowEngine {

    private static final Logger log = LoggerFactory.getLogger(WorkflowEngine.class);

    private final WorkflowRuleRepository ruleRepo;
    private final UserRepository userRepo;
    private final ActivityService activityService;

    public WorkflowEngine(WorkflowRuleRepository ruleRepo,
                          UserRepository userRepo,
                          ActivityService activityService) {
        this.ruleRepo = ruleRepo;
        this.userRepo = userRepo;
        this.activityService = activityService;
    }

    /**
     * Evaluate all enabled rules for this project against the changed field.
     * @param task the issue (already updated with new values)
     * @param changedField which field changed (status, priority, issueType, assignee)
     * @param newValue the new value of the changed field
     * @param actor the user who made the change
     */
    public void evaluate(Task task, String changedField, String newValue, User actor) {
        List<WorkflowRule> rules = ruleRepo.findByProjectIdAndEnabledTrueOrderByCreatedAtAsc(
                task.getProject().getId());

        for (WorkflowRule rule : rules) {
            if (!rule.getTriggerField().equals(changedField)) continue;
            if (!rule.getTriggerValue().equals(newValue)) continue;

            try {
                applyAction(task, rule, actor);
                log.info("Workflow rule [{}] fired on {} for issue {}",
                        rule.getName(), changedField, task.getIssueKey());
            } catch (Exception e) {
                log.error("Workflow rule [{}] failed: {}", rule.getName(), e.getMessage());
            }
        }
    }

    private void applyAction(Task task, WorkflowRule rule, User actor) {
        switch (rule.getActionType()) {
            case "SET_FIELD" -> applySetField(task, rule, actor);
            case "ASSIGN" -> applyAssign(task, rule, actor);
            default -> log.warn("Unknown action type: {}", rule.getActionType());
        }
    }

    private void applySetField(Task task, WorkflowRule rule, User actor) {
        String field = rule.getActionField();
        String value = rule.getActionValue();

        switch (field) {
            case "priority" -> {
                TaskPriority oldPri = task.getPriority();
                TaskPriority newPri = TaskPriority.valueOf(value);
                if (oldPri != newPri) {
                    activityService.logFieldChange(task, actor, "priority", oldPri, newPri);
                    task.setPriority(newPri);
                }
            }
            case "status" -> {
                TaskStatus oldSt = task.getStatus();
                TaskStatus newSt = TaskStatus.valueOf(value);
                if (oldSt != newSt) {
                    activityService.logFieldChange(task, actor, "status", oldSt, newSt);
                    task.setStatus(newSt);
                }
            }
            default -> log.warn("Cannot set field: {}", field);
        }
    }

    private void applyAssign(Task task, WorkflowRule rule, User actor) {
        String username = rule.getActionValue();
        User oldAssignee = task.getAssignee();
        User newAssignee = userRepo.findByUsername(username).orElse(null);
        if (newAssignee == null) {
            log.warn("Workflow ASSIGN: user '{}' not found", username);
            return;
        }
        Long oldId = oldAssignee == null ? null : oldAssignee.getId();
        if (!newAssignee.getId().equals(oldId)) {
            activityService.logAssignment(task, actor, oldAssignee, newAssignee);
            task.setAssignee(newAssignee);
        }
    }
}
