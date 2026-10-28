package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Notification;
import com.example.taskmanagerpro.model.NotificationPreference;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.repository.NotificationPreferenceRepository;
import com.example.taskmanagerpro.repository.NotificationRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@Slf4j
public class NotificationService {

    private final NotificationRepository notifRepo;
    private final ProjectService projectService;
    private final JavaMailSender mailSender;
    private final NotificationPreferenceRepository prefRepo;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.mail.from:noreply@taskmanagerpro.local}")
    private String fromAddress;

    public NotificationService(NotificationRepository notifRepo, ProjectService projectService,
                               ObjectProvider<JavaMailSender> mailSenderProvider,
                               NotificationPreferenceRepository prefRepo) {
        this.notifRepo = notifRepo;
        this.projectService = projectService;
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.prefRepo = prefRepo;
    }

    @PostConstruct
    void validateMailConfiguration() {
        if (mailEnabled && mailSender == null) {
            throw new IllegalStateException(
                    "Email notifications are enabled but no JavaMailSender is configured. "
                            + "Configure spring.mail.host or set MAIL_ENABLED=false.");
        }
    }

    @Transactional(readOnly = true)
    public List<Notification> list(int limit) {
        User user = projectService.currentUser();
        List<Notification> all = notifRepo.findByUserId(user.getId());
        return all.size() > limit ? all.subList(0, limit) : all;
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        User user = projectService.currentUser();
        return notifRepo.countUnreadByUserId(user.getId());
    }

    @Transactional
    public void markRead(Long id) {
        User user = projectService.currentUser();
        notifRepo.markRead(id, user.getId());
    }

    @Transactional
    public void markAllRead() {
        User user = projectService.currentUser();
        notifRepo.markAllRead(user.getId());
    }

    /**
     * Send a notification to all watchers of a task (except the actor).
     */
    @Transactional
    public void notifyWatchers(Task task, User actor, String type, String title, String message) {
        Set<User> watchers = task.getWatchers();
        if (watchers == null || watchers.isEmpty()) return;

        for (User watcher : watchers) {
            // Don't notify the person who made the change
            if (watcher.getId().equals(actor.getId())) continue;

            Notification n = Notification.builder()
                    .user(watcher)
                    .task(task)
                    .type(type)
                    .title(title)
                    .message(message)
                    .issueKey(task.getIssueKey())
                    .projectKey(task.getProject().getKey())
                    .build();
            notifRepo.save(n);
            sendEmailAsync(watcher, type, title, message);
        }
    }

    /**
     * Notify a specific user (e.g. when assigned to an issue).
     */
    @Transactional
    public void notifyUser(User target, Task task, String type, String title, String message) {
        Notification n = Notification.builder()
                .user(target)
                .task(task)
                .type(type)
                .title(title)
                .message(message)
                .issueKey(task.getIssueKey())
                .projectKey(task.getProject().getKey())
                .build();
        notifRepo.save(n);
        sendEmailAsync(target, type, title, message);
    }

    /**
     * Send email asynchronously if mail is enabled and user wants it.
     */
    @Async
    public void sendEmailAsync(User target, String type, String subject, String body) {
        if (!mailEnabled || target.getEmail() == null || target.getEmail().isBlank()) return;
        if (!wantsEmail(target.getId(), type)) return;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromAddress);
            msg.setTo(target.getEmail());
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
            log.info("Email sent to {} — {}", target.getEmail(), subject);
        } catch (Exception e) {
            log.warn("Failed to send email to {}: {}", target.getEmail(), e.getMessage());
        }
    }

    private boolean wantsEmail(Long userId, String type) {
        NotificationPreference pref = prefRepo.findByUserId(userId).orElse(null);
        if (pref == null) return true; // default all on
        return switch (type) {
            case "ASSIGNED" -> pref.isNotifyAssigned();
            case "MENTIONED" -> pref.isNotifyMentioned();
            case "COMMENT" -> pref.isNotifyComment();
            default -> pref.isNotifyWatching(); // STATUS_CHANGE, etc.
        };
    }

    /** Get preferences for the current user. */
    @Transactional(readOnly = true)
    public NotificationPreference getPreferences() {
        User user = projectService.currentUser();
        return prefRepo.findByUserId(user.getId())
                .orElse(NotificationPreference.builder()
                        .user(user).notifyAssigned(true).notifyMentioned(true)
                        .notifyWatching(true).notifyComment(true).build());
    }

    /** Save preferences for the current user. */
    @Transactional
    public NotificationPreference savePreferences(boolean assigned, boolean mentioned, boolean watching, boolean comment) {
        User user = projectService.currentUser();
        NotificationPreference pref = prefRepo.findByUserId(user.getId())
                .orElse(NotificationPreference.builder().user(user).build());
        pref.setNotifyAssigned(assigned);
        pref.setNotifyMentioned(mentioned);
        pref.setNotifyWatching(watching);
        pref.setNotifyComment(comment);
        return prefRepo.save(pref);
    }
}
