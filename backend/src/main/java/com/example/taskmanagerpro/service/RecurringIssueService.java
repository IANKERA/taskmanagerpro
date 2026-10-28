package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.RecurringRule;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.RecurringRuleRepository;
import com.example.taskmanagerpro.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class RecurringIssueService {

    private static final Logger log = LoggerFactory.getLogger(RecurringIssueService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final RecurringRuleRepository ruleRepo;
    private final IssueService issueService;
    private final UserRepository userRepo;
    private final IssueKeyAllocator issueKeyAllocator;

    public RecurringIssueService(RecurringRuleRepository ruleRepo,
                                  IssueService issueService,
                                  UserRepository userRepo,
                                  IssueKeyAllocator issueKeyAllocator) {
        this.ruleRepo = ruleRepo;
        this.issueService = issueService;
        this.userRepo = userRepo;
        this.issueKeyAllocator = issueKeyAllocator;
    }

    /** Runs every minute, picks up due recurring rules and creates issues. */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void processDueRules() {
        LocalDateTime now = LocalDateTime.now();
        List<RecurringRule> dueRules = ruleRepo.findDueRules(now);
        for (RecurringRule rule : dueRules) {
            try {
                createIssueFromRule(rule, now);
                rule.setLastRunAt(now);
                rule.setNextRunAt(computeNext(rule.getCronExpression(), now));
                ruleRepo.save(rule);
                log.info("Recurring rule [{}] fired → created issue in project {}",
                        rule.getName(), rule.getProject().getKey());
            } catch (Exception e) {
                log.error("Failed to process recurring rule {}: {}", rule.getId(), e.getMessage(), e);
            }
        }
    }

    private void createIssueFromRule(RecurringRule rule, LocalDateTime now) {
        String title = rule.getTitleTemplate()
                .replace("{{date}}", now.format(DATE_FMT))
                .replace("{{name}}", rule.getName());

        String projectKey = rule.getProject().getKey();
        String issueKey = issueKeyAllocator.allocate(rule.getProject().getId());
        User creator = rule.getCreatedBy();

        User assignee = null;
        if (rule.getAssigneeUsername() != null) {
            assignee = userRepo.findByUsername(rule.getAssigneeUsername()).orElse(null);
        }

        Task t = Task.builder()
                .project(rule.getProject())
                .issueKey(issueKey)
                .title(title)
                .description(rule.getDescription())
                .issueType(rule.getIssueType())
                .priority(rule.getPriority())
                .status(TaskStatus.PENDING)
                .reporter(creator)
                .assignee(assignee)
                .build();

        // Use the repository directly to avoid security context issues in scheduled tasks
        issueService.saveDirectly(t, creator);
    }

    public static LocalDateTime computeNext(String cron, LocalDateTime from) {
        try {
            CronExpression expr = CronExpression.parse(cron);
            return expr.next(from);
        } catch (Exception e) {
            // Fallback: next day
            return from.plusDays(1);
        }
    }

    public List<RecurringRule> listForProject(Long projectId) {
        return ruleRepo.findByProjectIdOrderByCreatedAtDesc(projectId);
    }
}
