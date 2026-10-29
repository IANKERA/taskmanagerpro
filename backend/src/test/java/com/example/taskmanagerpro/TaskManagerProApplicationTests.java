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
import com.example.taskmanagerpro.service.AttachmentService;
import com.example.taskmanagerpro.service.AttachmentCleanupService;
import com.example.taskmanagerpro.service.CommentService;
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
