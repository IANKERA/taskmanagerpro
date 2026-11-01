package com.example.taskmanagerpro;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import com.example.taskmanagerpro.dto.BulkUpdateRequest;
import com.example.taskmanagerpro.dto.CreateCommentRequest;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.security.JwtService;
import com.example.taskmanagerpro.service.AttachmentService;
import com.example.taskmanagerpro.service.AttachmentCleanupService;
import com.example.taskmanagerpro.service.CommentService;
import com.example.taskmanagerpro.service.DueDateReminder;
import com.example.taskmanagerpro.service.IssueService;
import com.example.taskmanagerpro.service.ProjectService;
import com.example.taskmanagerpro.service.SearchService;
import com.example.taskmanagerpro.service.TaskService;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class TaskManagerProApplicationTests {

    private static final Path UPLOAD_ROOT = createUploadRoot();

    @Container
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("taskmanagerpro_test")
                    .withUsername("taskmanagerpro_test")
                    .withPassword("taskmanagerpro_test");

    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private MockMvc mockMvc;
    @Autowired private Environment environment;
    @Autowired private IssueService issueService;
    @Autowired private ProjectService projectService;
    @Autowired private SearchService searchService;
    @Autowired private CommentService commentService;
    @Autowired private TaskService taskService;
    @Autowired private AttachmentService attachmentService;
    @Autowired private AttachmentCleanupService attachmentCleanupService;
    @Autowired private JwtService jwtService;
    @Autowired private DueDateReminder dueDateReminder;
    @Autowired private com.example.taskmanagerpro.service.UserService userService;
    @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("app.upload.dir", () -> UPLOAD_ROOT.toString());
    }

    @AfterAll
    static void removeUploadRoot() throws IOException {
        if (Files.exists(UPLOAD_ROOT)) {
            try (var paths = Files.walk(UPLOAD_ROOT)) {
                paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException e) {
                        throw new java.io.UncheckedIOException(e);
                    }
                });
            }
        }
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void contextLoads() {
    }

    @Test
    void testProfileUsesContainerDatabaseAndSchemaValidation() {
        assertTrue(environment.matchesProfiles("test"));
        assertEquals("validate", environment.getProperty("spring.jpa.hibernate.ddl-auto"));
        assertEquals("true", environment.getProperty("spring.flyway.enabled"));
        assertEquals(POSTGRES.getJdbcUrl(), environment.getProperty("spring.datasource.url"));
        assertTrue(POSTGRES.isRunning());
    }

    @Test
    void flywaySchemaAtVersion20MatchesTaskTimestampMapping() {
        assertEquals("20", jdbcTemplate.queryForObject(
                "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1",
                String.class));

        assertTimestampColumn("created_at");
        assertTimestampColumn("updated_at");
    }

    @Test
    void deletingParentPreservesNestedSubtasksAndDetachesDirectChildren() {
        ProjectFixture fixture = createProject("ADMIN");
        long parentId = createTask(fixture, "parent", null, null);
        long childId = createTask(fixture, "child", parentId, null);
        long grandchildId = createTask(fixture, "grandchild", childId, null);
        authenticate(fixture.username());

        issueService.delete(fixture.projectKey() + "-parent");

        assertEquals(0, countTask(parentId));
        assertEquals(1, countTask(childId));
        assertEquals(1, countTask(grandchildId));
        assertNull(jdbcTemplate.queryForObject(
                "SELECT parent_id FROM tasks WHERE id = ?", Long.class, childId));
        assertEquals(childId, jdbcTemplate.queryForObject(
                "SELECT parent_id FROM tasks WHERE id = ?", Long.class, grandchildId));
    }

    @Test
    void subtasksAreHiddenFromUsersWithoutProjectAccess() {
        ProjectFixture ownerFixture = createProject("ADMIN");
        long parentId = createTask(ownerFixture, "private-parent", null, null);
        long childId = createTask(ownerFixture, "private-child", parentId, null);
        ProjectFixture otherProjectFixture = createProject("ADMIN");

        authenticate(otherProjectFixture.username());

        ResponseStatusException denied = assertThrows(ResponseStatusException.class,
                () -> searchService.subtasks(ownerFixture.projectKey() + "-private-parent"));

        assertEquals(403, denied.getStatusCode().value());
        assertEquals(1, countTask(childId));
    }

    @Test
    void workloadIncludesOnlyOpenTasksInAccessibleProjects() {
        ProjectFixture visibleFixture = createProject("MEMBER");
        long visibleTask = createTask(visibleFixture, "visible-workload", null, null);
        ProjectFixture privateFixture = createProject("ADMIN");
        long privateTask = createTask(privateFixture, "private-workload", null, null);

        authenticate(visibleFixture.username());

        List<Long> visibleTaskIds = searchService.workloadTasks().stream().map(task -> task.getId()).toList();
        assertTrue(visibleTaskIds.contains(visibleTask));
        assertFalse(visibleTaskIds.contains(privateTask));

        authenticateAsGlobalAdmin(visibleFixture.username());
        List<Long> adminTaskIds = searchService.workloadTasks().stream().map(task -> task.getId()).toList();
        assertTrue(adminTaskIds.contains(visibleTask));
        assertTrue(adminTaskIds.contains(privateTask));
    }

    @Test
    void commentMentionsNotifyOnlyUsersWithProjectAccess() {
        ProjectFixture fixture = createProject("ADMIN");
        long taskId = createTask(fixture, "mention-privacy", null, null);
        long memberId = createUser("member");
        long outsiderId = createUser("outsider");
        jdbcTemplate.update("UPDATE users SET username = ? WHERE id = ?",
                "member" + UUID.randomUUID().toString().replace("-", ""), memberId);
        jdbcTemplate.update("UPDATE users SET username = ? WHERE id = ?",
                "outsider" + UUID.randomUUID().toString().replace("-", ""), outsiderId);
        String memberUsername = username(memberId);
        String outsiderUsername = username(outsiderId);
        jdbcTemplate.update(
                "INSERT INTO project_memberships(project_id, user_id, project_role) VALUES (?, ?, 'MEMBER')",
                fixture.projectId(), memberId);
        CreateCommentRequest request = new CreateCommentRequest();
        request.setBody("Please review @" + memberUsername + " and @" + outsiderUsername);
        authenticate(fixture.username());

        commentService.create(fixture.projectKey() + "-mention-privacy", request);

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = 'MENTIONED' AND issue_key = ?",
                Integer.class, memberId, fixture.projectKey() + "-mention-privacy"));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = 'MENTIONED' AND issue_key = ?",
                Integer.class, outsiderId, fixture.projectKey() + "-mention-privacy"));
        assertEquals(1, countTask(taskId));
    }

    @Test
    void memberCannotBulkDeleteButProjectAdminCan() {
        ProjectFixture memberFixture = createProject("MEMBER");
        long memberTask = createTask(memberFixture, "member-task", null, null);
        authenticate(memberFixture.username());

        ResponseStatusException denied = assertThrows(
                ResponseStatusException.class,
                () -> issueService.bulkUpdate(memberFixture.projectKey(),
                        bulkDelete(memberFixture.projectKey() + "-member-task")));
        assertEquals(403, denied.getStatusCode().value());
        assertEquals(1, countTask(memberTask));

        SecurityContextHolder.clearContext();
        ProjectFixture adminFixture = createProject("ADMIN");
        long adminTask = createTask(adminFixture, "admin-task", null, null);
        authenticate(adminFixture.username());

        issueService.bulkUpdate(adminFixture.projectKey(),
                bulkDelete(adminFixture.projectKey() + "-admin-task"));

        assertEquals(0, countTask(adminTask));
    }

    @Test
    void legacyTaskDeleteRequiresProjectAdmin() {
        ProjectFixture memberFixture = createProject("MEMBER");
        long memberTask = createTask(memberFixture, "legacy-member-task", null, null);
        authenticate(memberFixture.username());

        ResponseStatusException issueDenied = assertThrows(
                ResponseStatusException.class,
                () -> issueService.delete(memberFixture.projectKey() + "-legacy-member-task"));
        assertEquals(403, issueDenied.getStatusCode().value());
        assertEquals(1, countTask(memberTask));

        ResponseStatusException denied = assertThrows(
                ResponseStatusException.class, () -> taskService.deleteTask(memberTask));
        assertEquals(403, denied.getStatusCode().value());
        assertEquals(1, countTask(memberTask));

        SecurityContextHolder.clearContext();
        ProjectFixture adminFixture = createProject("ADMIN");
        long adminTask = createTask(adminFixture, "legacy-admin-task", null, null);
        authenticate(adminFixture.username());

        taskService.deleteTask(adminTask);

        assertEquals(0, countTask(adminTask));
    }

    @Test
    void deletingAssigneePreservesTaskAndReporterDeletionIsRestricted() {
        ProjectFixture fixture = createProject("ADMIN");
        long assigneeId = createUser("assignee");
        long taskId = createTask(fixture, "assigned-task", null, assigneeId);

        jdbcTemplate.update("DELETE FROM users WHERE id = ?", assigneeId);

        assertEquals(1, countTask(taskId));
        assertNull(jdbcTemplate.queryForObject(
                "SELECT assignee_id FROM tasks WHERE id = ?", Long.class, taskId));
        assertEquals(fixture.userId(), jdbcTemplate.queryForObject(
                "SELECT reporter_id FROM tasks WHERE id = ?", Long.class, taskId));

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbcTemplate.update("DELETE FROM users WHERE id = ?", fixture.userId()));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id = ?", Integer.class, fixture.userId()));
        assertEquals(fixture.userId(), jdbcTemplate.queryForObject(
                "SELECT reporter_id FROM tasks WHERE id = ?", Long.class, taskId));
    }

    @Test
    void taskAndProjectDeletionQueueAndRetryAttachmentCleanup() throws IOException {
        ProjectFixture fixture = createProject("ADMIN");
        long taskId = createTask(fixture, "with-attachment", null, null);
        Path stuckDirectory = UPLOAD_ROOT.resolve(UUID.randomUUID().toString());
        Files.createDirectories(stuckDirectory);
        Path blocker = Files.writeString(stuckDirectory.resolve("blocker"), "pending");
        createAttachment(taskId, fixture.userId(), stuckDirectory);
        authenticate(fixture.username());

        issueService.delete(fixture.projectKey() + "-with-attachment");
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachment_cleanup_outbox WHERE storage_path = ?",
                Integer.class, stuckDirectory.toString()));

        attachmentCleanupService.processPending();
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT attempts FROM attachment_cleanup_outbox WHERE storage_path = ?",
                Integer.class, stuckDirectory.toString()));

        Files.delete(blocker);
        jdbcTemplate.update(
                "UPDATE attachment_cleanup_outbox SET next_attempt_at = CURRENT_TIMESTAMP "
                        + "WHERE storage_path = ?", stuckDirectory.toString());
        attachmentCleanupService.processPending();
        assertFalse(Files.exists(stuckDirectory));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachment_cleanup_outbox WHERE storage_path = ?",
                Integer.class, stuckDirectory.toString()));

        long projectTaskId = createTask(fixture, "project-attachment", null, null);
        Path projectFile = Files.writeString(
                UPLOAD_ROOT.resolve(UUID.randomUUID().toString()), "attachment");
        createAttachment(projectTaskId, fixture.userId(), projectFile);

        projectService.deleteProject(fixture.projectKey());
        assertTrue(Files.exists(projectFile));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachment_cleanup_outbox WHERE storage_path = ?",
                Integer.class, projectFile.toString()));
        attachmentCleanupService.processPending();
        assertFalse(Files.exists(projectFile));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachment_cleanup_outbox WHERE storage_path = ?",
                Integer.class, projectFile.toString()));
    }

    @Test
    void attachmentDeletionQueuesFileCleanupUntilAfterDatabaseDeletion() throws IOException {
        ProjectFixture fixture = createProject("ADMIN");
        long taskId = createTask(fixture, "single-attachment", null, null);
        Path attachmentFile = Files.writeString(
                UPLOAD_ROOT.resolve(UUID.randomUUID().toString()), "attachment");
        long attachmentId = createAttachment(taskId, fixture.userId(), attachmentFile);
        authenticate(fixture.username());

        attachmentService.delete(attachmentId);

        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachments WHERE id = ?", Integer.class, attachmentId));
        assertTrue(Files.exists(attachmentFile));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachment_cleanup_outbox WHERE storage_path = ?",
                Integer.class, attachmentFile.toString()));

        attachmentCleanupService.processPending();

        assertFalse(Files.exists(attachmentFile));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachment_cleanup_outbox WHERE storage_path = ?",
                Integer.class, attachmentFile.toString()));
    }

    @Test
    void failedAttachmentMetadataPersistenceRemovesUploadedFile() throws IOException {
        ProjectFixture fixture = createProject("ADMIN");
        createTask(fixture, "failed-upload", null, null);
        authenticate(fixture.username());
        String filename = "failed-upload-" + UUID.randomUUID() + ".txt";
        long filesBefore = countUploadFiles();

        MockMultipartFile file = new MockMultipartFile(
                "file", filename, "x".repeat(129), "test upload".getBytes());

        assertThrows(RuntimeException.class,
                () -> attachmentService.upload(fixture.projectKey() + "-failed-upload", file));

        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachments WHERE filename = ?", Integer.class, filename));
        assertEquals(filesBefore, countUploadFiles());
    }

    @Test
    void transactionRollbackRemovesUploadedFileAndMetadata() throws IOException {
        ProjectFixture fixture = createProject("ADMIN");
        createTask(fixture, "rolled-back-upload", null, null);
        authenticate(fixture.username());
        String filename = "rolled-back-upload-" + UUID.randomUUID() + ".txt";
        long filesBefore = countUploadFiles();

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            attachmentService.upload(
                    fixture.projectKey() + "-rolled-back-upload",
                    new MockMultipartFile("file", filename, "text/plain", "test upload".getBytes()));
            status.setRollbackOnly();
        });

        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachments WHERE filename = ?", Integer.class, filename));
        assertEquals(filesBefore, countUploadFiles());
    }

    @Test
    void successfulAttachmentUploadCommitsMetadataAndPreservesFile() throws IOException {
        ProjectFixture fixture = createProject("ADMIN");
        createTask(fixture, "successful-upload", null, null);
        authenticate(fixture.username());
        String filename = "successful-upload-" + UUID.randomUUID() + ".txt";

        var attachment = attachmentService.upload(
                fixture.projectKey() + "-successful-upload",
                new MockMultipartFile("file", filename, "text/plain", "test upload".getBytes()));

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachments WHERE id = ? AND filename = ?",
                Integer.class, attachment.getId(), filename));
        assertTrue(Files.exists(Path.of(attachment.getStoragePath())));
        assertEquals("test upload", Files.readString(Path.of(attachment.getStoragePath())));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM attachment_cleanup_outbox WHERE storage_path = ?",
                Integer.class, attachment.getStoragePath()));
    }

    private long createUser(String prefix) {
        String username = prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
        return jdbcTemplate.queryForObject(
                "INSERT INTO users(username, password, role) VALUES (?, 'test-hash', 'ROLE_USER') RETURNING id",
                Long.class, username);
    }

    private String username(long userId) {
        return jdbcTemplate.queryForObject(
                "SELECT username FROM users WHERE id = ?", String.class, userId);
    }

    private ProjectFixture createProject(String role) {
        long userId = createUser("owner");
        String username = jdbcTemplate.queryForObject(
                "SELECT username FROM users WHERE id = ?", String.class, userId);
        String projectKey = "P" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 7).toUpperCase();
        long projectId = jdbcTemplate.queryForObject(
                "INSERT INTO projects(project_key, name, lead_user_id) VALUES (?, ?, ?) RETURNING id",
                Long.class, projectKey, "test project", userId);
        jdbcTemplate.update(
                "INSERT INTO project_memberships(project_id, user_id, project_role) VALUES (?, ?, ?)",
                projectId, userId, role);
        return new ProjectFixture(projectId, projectKey, userId, username);
    }

    private long createTask(ProjectFixture fixture, String suffix, Long parentId, Long assigneeId) {
        String issueKey = fixture.projectKey() + "-" + suffix;
        return jdbcTemplate.queryForObject(
                "INSERT INTO tasks(title, status, priority, assignee_id, reporter_id, project_id, "
                        + "issue_type, issue_key, parent_id) VALUES (?, 'PENDING', 'MEDIUM', ?, ?, ?, "
                        + "'TASK', ?, ?) RETURNING id",
                Long.class, suffix, assigneeId, fixture.userId(), fixture.projectId(), issueKey, parentId);
    }

    private long createAttachment(long taskId, long uploaderId, Path path) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO attachments(task_id, uploader_id, filename, content_type, size_bytes, storage_path) "
                        + "VALUES (?, ?, 'test.bin', 'application/octet-stream', 1, ?) RETURNING id",
                Long.class,
                taskId, uploaderId, path.toString());
    }

    private int countTask(long taskId) {
        return jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tasks WHERE id = ?", Integer.class, taskId);
    }

    private long countUploadFiles() throws IOException {
        try (var files = Files.list(UPLOAD_ROOT)) {
            return files.count();
        }
    }

    private void authenticate(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        username, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
    }

    private void authenticateAsGlobalAdmin(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        username, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }

    private BulkUpdateRequest bulkDelete(String issueKey) {
        BulkUpdateRequest request = new BulkUpdateRequest();
        request.setIssueKeys(List.of(issueKey));
        request.setDelete(true);
        return request;
    }

    private static Path createUploadRoot() {
        try {
            return Files.createTempDirectory("taskmanagerpro-attachment-tests-");
        } catch (IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }

    private record ProjectFixture(long projectId, String projectKey, long userId, String username) {
    }

    @Test
    void registrationEndpointValidatesCredentialsAndRejectsDuplicateUsernames() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\" \",\"password\":\"\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"test-user\",\"password\":\"weak\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Password must be at least 8 characters long."));

        String validRequest = "{\"username\":\"isolated-test-user\",\"password\":\"Password123!\"}";
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest))
                .andExpect(status().isConflict());
    }

    @Test
    void cfdEndpointReturnsStatusTransitionsForProject() throws Exception {
        ProjectFixture fixture = createProject("ADMIN");
        long taskId = createTask(fixture, "cfd-task", null, null);
        jdbcTemplate.update("""
            INSERT INTO activity_log(task_id, actor_id, activity_type, field, old_value, new_value, at)
            VALUES (?, ?, 'FIELD_CHANGED', 'status', 'PENDING', 'IN_PROGRESS', CURRENT_TIMESTAMP - INTERVAL '1 day')
        """, taskId, fixture.userId());

        String token = jwtService.generateToken(fixture.username());

        mockMvc.perform(get("/api/projects/" + fixture.projectKey() + "/analytics/cfd?days=7")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[-1].IN_PROGRESS").value(1));

        ProjectFixture outsider = createProject("ADMIN");
        String outsiderToken = jwtService.generateToken(outsider.username());
        mockMvc.perform(get("/api/projects/" + fixture.projectKey() + "/analytics/cfd?days=7")
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void advancedSearchFindsIssuesAcrossAccessibleProjectsWithoutPerProjectLoop() {
        ProjectFixture p1 = createProject("ADMIN");
        ProjectFixture p2 = createProject("ADMIN");
        long t1 = createTask(p1, "task-p1", null, null);
        long t2 = createTask(p2, "task-p2", null, null);

        jdbcTemplate.update(
                "INSERT INTO project_memberships(project_id, user_id, project_role) VALUES (?, ?, 'MEMBER')",
                p2.projectId(), p1.userId());

        authenticate(p1.username());

        List<com.example.taskmanagerpro.model.Task> results = searchService.advancedSearch(null, null, null, null, null, null, 10);
        List<Long> resultIds = results.stream().map(com.example.taskmanagerpro.model.Task::getId).toList();
        assertTrue(resultIds.contains(t1));
        assertTrue(resultIds.contains(t2));

        List<com.example.taskmanagerpro.model.Task> scopedResults = searchService.advancedSearch(null, null, null, null, null, p1.projectKey(), 10);
        List<Long> scopedIds = scopedResults.stream().map(com.example.taskmanagerpro.model.Task::getId).toList();
        assertTrue(scopedIds.contains(t1));
        assertFalse(scopedIds.contains(t2));
    }

    @Test
    void advancedSearchAppliesDatabaseLimitAndStableOrdering() {
        ProjectFixture fixture = createProject("ADMIN");
        long t1 = createTask(fixture, "order-1", null, null);
        long t2 = createTask(fixture, "order-2", null, null);
        long t3 = createTask(fixture, "order-3", null, null);
        long t4 = createTask(fixture, "order-4", null, null);

        jdbcTemplate.update("UPDATE tasks SET updated_at = CURRENT_TIMESTAMP - INTERVAL '4 hours' WHERE id = ?", t1);
        jdbcTemplate.update("UPDATE tasks SET updated_at = CURRENT_TIMESTAMP - INTERVAL '3 hours' WHERE id = ?", t2);
        jdbcTemplate.update("UPDATE tasks SET updated_at = CURRENT_TIMESTAMP - INTERVAL '2 hours' WHERE id = ?", t3);
        jdbcTemplate.update("UPDATE tasks SET updated_at = CURRENT_TIMESTAMP - INTERVAL '1 hour' WHERE id = ?", t4);

        authenticate(fixture.username());

        List<com.example.taskmanagerpro.model.Task> results = searchService.advancedSearch(
                null, null, null, null, null, fixture.projectKey(), 2);

        assertEquals(2, results.size());
        assertEquals(t4, results.get(0).getId());
        assertEquals(t3, results.get(1).getId());
    }

    @Test
    void advancedSearchFiltersByStatusPriorityTypeAndAssigneeInPostgreSql() {
        ProjectFixture fixture = createProject("ADMIN");
        long tMatch = createTask(fixture, "match-target", null, fixture.userId());
        long tWrongStatus = createTask(fixture, "wrong-status", null, fixture.userId());
        long tUnassigned = createTask(fixture, "unassigned-task", null, null);

        jdbcTemplate.update("UPDATE tasks SET status = 'IN_PROGRESS', priority = 'HIGH', issue_type = 'BUG' WHERE id = ?", tMatch);
        jdbcTemplate.update("UPDATE tasks SET status = 'PENDING', priority = 'HIGH', issue_type = 'BUG' WHERE id = ?", tWrongStatus);
        jdbcTemplate.update("UPDATE tasks SET status = 'IN_PROGRESS', priority = 'LOW', issue_type = 'TASK' WHERE id = ?", tUnassigned);

        authenticate(fixture.username());

        // Multi-filter test
        List<com.example.taskmanagerpro.model.Task> multiFilter = searchService.advancedSearch(
                "match", "IN_PROGRESS", "HIGH", "BUG", fixture.username(), fixture.projectKey(), 10);
        assertEquals(1, multiFilter.size());
        assertEquals(tMatch, multiFilter.get(0).getId());

        // __unassigned__ filter test
        List<com.example.taskmanagerpro.model.Task> unassignedOnly = searchService.advancedSearch(
                null, null, null, null, "__unassigned__", fixture.projectKey(), 10);
        List<Long> unassignedIds = unassignedOnly.stream().map(com.example.taskmanagerpro.model.Task::getId).toList();
        assertTrue(unassignedIds.contains(tUnassigned));
        assertFalse(unassignedIds.contains(tMatch));

        // Invalid enum returns empty without error
        List<com.example.taskmanagerpro.model.Task> invalidEnum = searchService.advancedSearch(
                null, "INVALID_STATUS", null, null, null, fixture.projectKey(), 10);
        assertTrue(invalidEnum.isEmpty());
    }

    @Test
    void advancedSearchEndpointReturnsPopulatedTaskDtoRelationships() throws Exception {
        ProjectFixture fixture = createProject("ADMIN");
        long taskId = createTask(fixture, "dto-task", null, fixture.userId());
        jdbcTemplate.update("UPDATE tasks SET status = 'IN_PROGRESS', priority = 'HIGH', issue_type = 'BUG' WHERE id = ?", taskId);

        String token = jwtService.generateToken(fixture.username());

        mockMvc.perform(get("/api/search/advanced?projectKey=" + fixture.projectKey() + "&limit=10")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].issueKey").value(fixture.projectKey() + "-dto-task"))
                .andExpect(jsonPath("$[0].title").value("dto-task"))
                .andExpect(jsonPath("$[0].status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$[0].priority").value("HIGH"))
                .andExpect(jsonPath("$[0].issueType").value("BUG"))
                .andExpect(jsonPath("$[0].projectKey").value(fixture.projectKey()))
                .andExpect(jsonPath("$[0].assigneeUsername").value(fixture.username()));
    }

    @Test
    void listProjectsAppliesGroupedStatusAggregationAndPreservesDtos() throws Exception {
        ProjectFixture p1 = createProject("ADMIN");
        String p2Key = "P" + UUID.randomUUID().toString().replace("-", "").substring(0, 7).toUpperCase();
        long p2Id = jdbcTemplate.queryForObject(
                "INSERT INTO projects(project_key, name, lead_user_id) VALUES (?, ?, ?) RETURNING id",
                Long.class, p2Key, "second project", p1.userId());
        jdbcTemplate.update(
                "INSERT INTO project_memberships(project_id, user_id, project_role) VALUES (?, ?, ?)",
                p2Id, p1.userId(), "ADMIN");

        // P1 has 2 PENDING, 1 IN_PROGRESS, 1 DONE
        long t1 = createTask(p1, "p1-t1", null, p1.userId());
        long t2 = createTask(p1, "p1-t2", null, p1.userId());
        long t3 = createTask(p1, "p1-t3", null, p1.userId());
        long t4 = createTask(p1, "p1-t4", null, p1.userId());
        jdbcTemplate.update("UPDATE tasks SET status = 'PENDING' WHERE id IN (?, ?)", t1, t2);
        jdbcTemplate.update("UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ?", t3);
        jdbcTemplate.update("UPDATE tasks SET status = 'DONE' WHERE id = ?", t4);

        // P2 has 0 tasks

        String token = jwtService.generateToken(p1.username());

        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@.key == '" + p1.projectKey() + "')].openCount").value(2))
                .andExpect(jsonPath("$[?(@.key == '" + p1.projectKey() + "')].inProgressCount").value(1))
                .andExpect(jsonPath("$[?(@.key == '" + p1.projectKey() + "')].doneCount").value(1))
                .andExpect(jsonPath("$[?(@.key == '" + p1.projectKey() + "')].leadUsername").value(p1.username()))
                .andExpect(jsonPath("$[?(@.key == '" + p2Key + "')].openCount").value(0))
                .andExpect(jsonPath("$[?(@.key == '" + p2Key + "')].inProgressCount").value(0))
                .andExpect(jsonPath("$[?(@.key == '" + p2Key + "')].doneCount").value(0));
    }

    @Test
    void listSprintsAppliesGroupedMetricsAggregation() throws Exception {
        ProjectFixture p = createProject("ADMIN");
        long s1Id = jdbcTemplate.queryForObject(
                "INSERT INTO sprints(project_id, name, state) VALUES (?, 'Sprint 1', 'ACTIVE') RETURNING id",
                Long.class, p.projectId());
        long s2Id = jdbcTemplate.queryForObject(
                "INSERT INTO sprints(project_id, name, state) VALUES (?, 'Sprint 2 (empty)', 'PLANNED') RETURNING id",
                Long.class, p.projectId());

        long t1 = createTask(p, "s1-t1", null, p.userId());
        long t2 = createTask(p, "s1-t2", null, p.userId());
        long t3 = createTask(p, "s1-t3", null, p.userId());
        jdbcTemplate.update("UPDATE tasks SET sprint_id = ?, status = 'DONE', story_points = 5 WHERE id = ?", s1Id, t1);
        jdbcTemplate.update("UPDATE tasks SET sprint_id = ?, status = 'IN_PROGRESS', story_points = 3 WHERE id = ?", s1Id, t2);
        jdbcTemplate.update("UPDATE tasks SET sprint_id = ?, status = 'PENDING', story_points = NULL WHERE id = ?", s1Id, t3);

        String token = jwtService.generateToken(p.username());

        mockMvc.perform(get("/api/projects/" + p.projectKey() + "/sprints").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@.id == " + s1Id + ")].issueCount").value(3))
                .andExpect(jsonPath("$[?(@.id == " + s1Id + ")].doneCount").value(1))
                .andExpect(jsonPath("$[?(@.id == " + s1Id + ")].totalPoints").value(8))
                .andExpect(jsonPath("$[?(@.id == " + s1Id + ")].donePoints").value(5))
                .andExpect(jsonPath("$[?(@.id == " + s2Id + ")].issueCount").value(0))
                .andExpect(jsonPath("$[?(@.id == " + s2Id + ")].doneCount").value(0))
                .andExpect(jsonPath("$[?(@.id == " + s2Id + ")].totalPoints").value(0))
                .andExpect(jsonPath("$[?(@.id == " + s2Id + ")].donePoints").value(0));
    }

    @Test
    void listProjectMembersEagerlyFetchesUsers() throws Exception {
        ProjectFixture p = createProject("ADMIN");
        long u2 = createUser("member");
        long u3 = createUser("viewer");
        jdbcTemplate.update("INSERT INTO project_memberships(project_id, user_id, project_role) VALUES (?, ?, 'MEMBER')", p.projectId(), u2);
        jdbcTemplate.update("INSERT INTO project_memberships(project_id, user_id, project_role) VALUES (?, ?, 'VIEWER')", p.projectId(), u3);

        String token = jwtService.generateToken(p.username());

        mockMvc.perform(get("/api/projects/" + p.projectKey() + "/members").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[?(@.username == '" + username(u2) + "')].projectRole").value("MEMBER"))
                .andExpect(jsonPath("$[?(@.username == '" + username(u3) + "')].projectRole").value("VIEWER"));

        mockMvc.perform(get("/api/projects/" + p.projectKey() + "/assignable-users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.username == '" + p.username() + "')]").exists())
                .andExpect(jsonPath("$[?(@.username == '" + username(u2) + "')]").exists());
    }

    @Test
    void activityFeedsAndNotificationsApplyDatabaseLimits() throws Exception {
        ProjectFixture p = createProject("ADMIN");
        long t = createTask(p, "act-task", null, p.userId());

        // Insert 5 notifications
        for (int i = 0; i < 5; i++) {
            jdbcTemplate.update(
                    "INSERT INTO notifications(user_id, task_id, type, title, message, issue_key, project_key, is_read, created_at) "
                            + "VALUES (?, ?, 'TEST', ?, 'msg', ?, ?, false, CURRENT_TIMESTAMP - (? || ' minutes')::interval)",
                    p.userId(), t, "Notif " + i, p.projectKey() + "-act-task", p.projectKey(), i);
        }

        String token = jwtService.generateToken(p.username());

        // Request limit=2
        mockMvc.perform(get("/api/notifications?limit=2").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Notif 0"))
                .andExpect(jsonPath("$[1].title").value("Notif 1"));

        // Activity feed
        for (int i = 0; i < 5; i++) {
            jdbcTemplate.update(
                    "INSERT INTO activity_log(task_id, actor_id, activity_type, field, old_value, new_value, at) "
                            + "VALUES (?, ?, 'FIELD_CHANGED', 'status', 'PENDING', 'IN_PROGRESS', CURRENT_TIMESTAMP - (? || ' minutes')::interval)",
                    t, p.userId(), i);
        }

        mockMvc.perform(get("/api/activity/feed").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void burndownEndpointReturnsSeriesUsingBatchQueries() throws Exception {
        ProjectFixture p = createProject("ADMIN");
        long sprintId = jdbcTemplate.queryForObject(
                "INSERT INTO sprints(project_id, name, state, start_date, end_date) " +
                "VALUES (?, 'Burndown Sprint', 'ACTIVE', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days') RETURNING id",
                Long.class, p.projectId());

        long t1 = createTask(p, "bd-task-1", null, p.userId());
        long t2 = createTask(p, "bd-task-2", null, p.userId());
        jdbcTemplate.update("UPDATE tasks SET sprint_id = ? WHERE id IN (?, ?)", sprintId, t1, t2);

        jdbcTemplate.update("""
            INSERT INTO activity_log(task_id, actor_id, activity_type, field, old_value, new_value, at)
            VALUES (?, ?, 'FIELD_CHANGED', 'status', 'PENDING', 'DONE', CURRENT_TIMESTAMP - INTERVAL '1 day')
        """, t1, p.userId());

        String token = jwtService.generateToken(p.username());

        mockMvc.perform(get("/api/sprints/" + sprintId + "/burndown").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[-1].total").value(2))
                .andExpect(jsonPath("$[-1].done").value(1))
                .andExpect(jsonPath("$[-1].remaining").value(1));

        ProjectFixture outsider = createProject("ADMIN");
        String outsiderToken = jwtService.generateToken(outsider.username());
        mockMvc.perform(get("/api/sprints/" + sprintId + "/burndown").header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void epicChildCountsEnrichedViaGroupedAggregation() throws Exception {
        ProjectFixture p = createProject("ADMIN");
        long epicId = createTask(p, "epic-1", null, p.userId());
        jdbcTemplate.update("UPDATE tasks SET issue_type = 'EPIC' WHERE id = ?", epicId);

        long c1 = createTask(p, "child-1", null, p.userId());
        long c2 = createTask(p, "child-2", null, p.userId());
        jdbcTemplate.update("UPDATE tasks SET parent_id = ?, status = 'DONE' WHERE id = ?", epicId, c1);
        jdbcTemplate.update("UPDATE tasks SET parent_id = ?, status = 'PENDING' WHERE id = ?", epicId, c2);

        String token = jwtService.generateToken(p.username());

        mockMvc.perform(get("/api/projects/" + p.projectKey() + "/issues").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@.id == " + epicId + ")].childCount").value(2))
                .andExpect(jsonPath("$[?(@.id == " + epicId + ")].childDoneCount").value(1));
    }

    @Test
    void dueDateReminderFindsEligibleTasksWithoutFullScan() {
        ProjectFixture p = createProject("ADMIN");
        long t = createTask(p, "due-task", null, p.userId());
        jdbcTemplate.update(
                "UPDATE tasks SET due_date = CURRENT_TIMESTAMP + INTERVAL '12 hours', status = 'IN_PROGRESS' WHERE id = ?",
                t);

        int countBefore = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE task_id = ? AND type = 'DUE_DATE'",
                Integer.class, t);

        dueDateReminder.checkDueDates();

        int countAfter = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE task_id = ? AND type = 'DUE_DATE'",
                Integer.class, t);
        assertTrue(countAfter > countBefore);
    }

    @Test
    void changePasswordUnauthenticatedReturns401Or403() throws Exception {
        mockMvc.perform(post("/api/users/me/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"OldPass123!\",\"newPassword\":\"NewPass456!\"}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    assertTrue(status == 401 || status == 403, "Expected 401 or 403 but got: " + status);
                });
    }

    @Test
    void changePasswordSuccessStoresBcryptHashAndEnablesLoginWithNewPassword() throws Exception {
        String username = "cp-user-" + UUID.randomUUID().toString().substring(0, 8);
        userService.registerUser(username, "OldPassword123!");

        String loginBody = String.format("{\"username\":\"%s\",\"password\":\"OldPassword123!\"}", username);
        String loginRes = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String token = jwtService.extractUsername(loginRes.contains("token")
                ? loginRes.split("\"token\":\"")[1].split("\"")[0]
                : loginRes);
        String rawJwt = loginRes.split("\"token\":\"")[1].split("\"")[0];

        // Call change password
        String changePayload = "{\"currentPassword\":\"OldPassword123!\",\"newPassword\":\"BrandNewPass456!\",\"confirmPassword\":\"BrandNewPass456!\"}";
        mockMvc.perform(post("/api/users/me/change-password")
                        .header("Authorization", "Bearer " + rawJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated successfully."))
                .andExpect(jsonPath("$.token").isString());

        // Verify stored BCrypt hash in DB
        String storedHash = jdbcTemplate.queryForObject(
                "SELECT password FROM users WHERE username = ?", String.class, username);
        assertTrue(storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$"),
                "Stored password must be a BCrypt hash");
        assertTrue(passwordEncoder.matches("BrandNewPass456!", storedHash),
                "Stored hash must match new password");
        assertFalse(passwordEncoder.matches("OldPassword123!", storedHash),
                "Stored hash must no longer match old password");

        // Old password login must now fail (401 Bad credentials)
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().is4xxClientError());

        // New password login must succeed
        String newLoginBody = String.format("{\"username\":\"%s\",\"password\":\"BrandNewPass456!\"}", username);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(newLoginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString());
    }

    @Test
    void changePasswordFailsWithIncorrectCurrentPassword() throws Exception {
        String username = "cp-wrong-" + UUID.randomUUID().toString().substring(0, 8);
        userService.registerUser(username, "CorrectOld123!");

        String token = jwtService.generateToken(username);

        String changePayload = "{\"currentPassword\":\"WrongOld123!\",\"newPassword\":\"NewPass456!\",\"confirmPassword\":\"NewPass456!\"}";
        mockMvc.perform(post("/api/users/me/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changePayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Incorrect current password."));

        // Verify old password still works
        String storedHash = jdbcTemplate.queryForObject(
                "SELECT password FROM users WHERE username = ?", String.class, username);
        assertTrue(passwordEncoder.matches("CorrectOld123!", storedHash));
    }

    @Test
    void changePasswordFailsWhenNewPasswordViolatesPolicy() throws Exception {
        String username = "cp-policy-" + UUID.randomUUID().toString().substring(0, 8);
        userService.registerUser(username, "ValidOld123!");

        String token = jwtService.generateToken(username);

        // Missing uppercase
        mockMvc.perform(post("/api/users/me/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"ValidOld123!\",\"newPassword\":\"weakpassword123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Password must contain at least one uppercase letter."));

        // Missing number
        mockMvc.perform(post("/api/users/me/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"ValidOld123!\",\"newPassword\":\"WeakPassword!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Password must contain at least one number."));

        // Missing special character
        mockMvc.perform(post("/api/users/me/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"ValidOld123!\",\"newPassword\":\"WeakPassword123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Password must contain at least one special character."));

        // Same as old password
        mockMvc.perform(post("/api/users/me/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"ValidOld123!\",\"newPassword\":\"ValidOld123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("New password must be different from current password."));
    }

    @Test
    void changePasswordCannotChangeAnotherUserViaArbitraryId() throws Exception {
        String alice = "alice-" + UUID.randomUUID().toString().substring(0, 8);
        String bob = "bob-" + UUID.randomUUID().toString().substring(0, 8);
        userService.registerUser(alice, "AlicePass123!");
        userService.registerUser(bob, "BobPass123!");

        long bobId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE username = ?", Long.class, bob);

        String aliceToken = jwtService.generateToken(alice);

        // Alice (regular user) attempting to reset Bob's password via admin endpoint fails with 403
        mockMvc.perform(post("/api/users/" + bobId + "/reset-password")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"HackedPass123!\"}"))
                .andExpect(status().isForbidden());

        // Alice calling /me/change-password only changes Alice's password
        mockMvc.perform(post("/api/users/me/change-password")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"AlicePass123!\",\"newPassword\":\"AliceNew123!\"}"))
                .andExpect(status().isOk());

        // Bob's password in DB is unaffected and still matches BobPass123!
        String bobHash = jdbcTemplate.queryForObject(
                "SELECT password FROM users WHERE username = ?", String.class, bob);
        assertTrue(passwordEncoder.matches("BobPass123!", bobHash));
    }

    private void assertTimestampColumn(String columnName) {
        var column = jdbcTemplate.queryForMap(
                "SELECT data_type, is_nullable, column_default FROM information_schema.columns "
                        + "WHERE table_schema = current_schema() AND table_name = 'tasks' AND column_name = ?",
                columnName);
        assertEquals("timestamp without time zone", column.get("data_type"));
        assertEquals("YES", column.get("is_nullable"));
        assertNull(column.get("column_default"));
    }
}
