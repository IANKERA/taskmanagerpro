package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.CreateCommentRequest;
import com.example.taskmanagerpro.model.Comment;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.repository.CommentRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.taskmanagerpro.repository.UserRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.springframework.http.HttpStatus.*;

@Service
public class CommentService {

    private static final Pattern MENTION_PATTERN = Pattern.compile("@(\\w+)");

    private final CommentRepository commentRepo;
    private final IssueService issueService;
    private final ProjectService projectService;
    private final ActivityService activityService;
    private final NotificationService notificationService;
    private final UserRepository userRepo;

    public CommentService(CommentRepository commentRepo,
                          IssueService issueService,
                          ProjectService projectService,
                          ActivityService activityService,
                          NotificationService notificationService,
                          UserRepository userRepo) {
        this.commentRepo = commentRepo;
        this.issueService = issueService;
        this.projectService = projectService;
        this.activityService = activityService;
        this.notificationService = notificationService;
        this.userRepo = userRepo;
    }

    @Transactional(readOnly = true)
    public List<Comment> listForIssue(String issueKey) {
        Task t = issueService.getByIssueKey(issueKey); // also enforces VIEWER+ membership
        return commentRepo.findByTaskIdWithAuthor(t.getId());
    }

    @Transactional
    public Comment create(String issueKey, CreateCommentRequest req) {
        Task t = issueService.getByIssueKey(issueKey);
        projectService.requireProjectRole(t.getProject().getId(),
                ProjectRole.MEMBER, ProjectRole.ADMIN);
        User author = projectService.currentUser();

        Comment c = Comment.builder()
                .task(t)
                .author(author)
                .body(req.getBody())
                .build();
        c = commentRepo.save(c);
        activityService.logComment(t, author, c.getId());

        // Notify watchers
        notificationService.notifyWatchers(t, author, "COMMENT",
                author.getUsername() + " commented on " + t.getIssueKey(),
                req.getBody());

        // Notify @mentioned users
        Set<String> mentioned = extractMentions(req.getBody());
        mentioned.remove(author.getUsername()); // don't notify self
        for (String username : mentioned) {
            userRepo.findByUsername(username).ifPresent(mentionedUser ->
                notificationService.notifyUser(mentionedUser, t, "MENTIONED",
                        author.getUsername() + " mentioned you in " + t.getIssueKey(),
                        req.getBody())
            );
        }

        return c;
    }

    private Set<String> extractMentions(String text) {
        Set<String> mentions = new HashSet<>();
        if (text == null) return mentions;
        Matcher m = MENTION_PATTERN.matcher(text);
        while (m.find()) mentions.add(m.group(1));
        return mentions;
    }

    @Transactional
    public Comment update(String issueKey, Long commentId, CreateCommentRequest req) {
        Comment c = mustOwnOrAdmin(issueKey, commentId);
        c.setBody(req.getBody());
        return commentRepo.save(c);
    }

    @Transactional
    public void delete(String issueKey, Long commentId) {
        Comment c = mustOwnOrAdmin(issueKey, commentId);
        commentRepo.delete(c);
    }

    /** Author or project ADMIN (or global ADMIN) may modify the comment. */
    private Comment mustOwnOrAdmin(String issueKey, Long commentId) {
        Task t = issueService.getByIssueKey(issueKey);
        Comment c = commentRepo.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Comment not found"));
        if (!c.getTask().getId().equals(t.getId())) {
            throw new ResponseStatusException(NOT_FOUND, "Comment not on this issue");
        }
        User caller = projectService.currentUser();
        boolean isAuthor = c.getAuthor().getId().equals(caller.getId());
        boolean isGlobalAdmin = SecurityContextHolder.getContext().getAuthentication().getAuthorities()
                .stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAuthor && !isGlobalAdmin) {
            // Allow project ADMIN to moderate.
            projectService.requireProjectRole(t.getProject().getId(), ProjectRole.ADMIN);
        }
        return c;
    }
}
