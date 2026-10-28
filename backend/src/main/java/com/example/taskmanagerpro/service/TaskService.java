package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.Mapper;
import com.example.taskmanagerpro.dto.TaskDTO;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.ProjectRepository;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class TaskService {
    private final UserService userService;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final IssueKeyAllocator issueKeyAllocator;

    public TaskService(TaskRepository taskRepository, UserService userService,
                       ProjectRepository projectRepository, IssueKeyAllocator issueKeyAllocator) {
        this.taskRepository = taskRepository;
        this.userService = userService;
        this.projectRepository = projectRepository;
        this.issueKeyAllocator = issueKeyAllocator;
    }

    /** Fallback project for tasks created without an explicit project (M1 transitional). */
    private Project inboxProject() {
        return projectRepository.findByKey("INB")
                .orElseThrow(() -> new RuntimeException("INBOX project missing — Flyway migration didn't run?"));
    }

    // Get all tasks with user
    public List<Task> getAllTasks() {
        return taskRepository.findAllWithUser();
    }

    // Get task by ID with user
    public Optional<Task> getTaskById(Long id) {
        Task task = taskRepository.findByIdWithUser(id);
        if (task == null || isCurrentUserAdmin() || isCurrentUserAssignee(task)) {
            return Optional.ofNullable(task);
        }
        return Optional.empty();
    }

    // Create or update task
    public Task saveTask(Task task) {
        return taskRepository.save(task);
    }

    // Delete task
    public void deleteTask(Long id) {
        taskRepository.deleteById(id);
    }

    // Get tasks by status
    public List<Task> getTasksByStatus(TaskStatus status) {
        return isCurrentUserAdmin()
                ? taskRepository.findByStatus(status)
                : taskRepository.findByAssigneeIdAndStatus(getCurrentUserId(), status);
    }

    // Get tasks by priority
    public List<Task> getTasksByPriority(TaskPriority priority) {
        return isCurrentUserAdmin()
                ? taskRepository.findByPriority(priority)
                : taskRepository.findByAssigneeIdAndPriority(getCurrentUserId(), priority);
    }

    // Get tasks by user ID
    public List<Task> getTasksByUserId(Long userId) {
        if (isCurrentUserAdmin()) {
            return taskRepository.findByUserId(userId);
        }
        Long currentUserId = getCurrentUserId();
        if (!currentUserId.equals(userId)) {
            throw new ResponseStatusException(FORBIDDEN, "You cannot access another user's tasks");
        }
        return taskRepository.findByUserId(currentUserId);
    }

    // Convert TaskDTO -> Task
    @SuppressWarnings("deprecation")
    public Task convertToEntity(TaskDTO dto) {
        Task task = new Task();

        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setStatus(dto.getStatus());
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : TaskPriority.MEDIUM);

        // M1: default to INBOX project; M2 will require an explicit project on the DTO.
        if (task.getProject() == null) {
            task.setProject(inboxProject());
        }

        // M2: every Task must have a reporter and an issueKey. For the legacy /api/tasks API,
        // the reporter is whoever is creating the row, and the key is auto-allocated.
        if (task.getReporter() == null) {
            User caller = userService.getUserByUsername(getCurrentUsername())
                    .orElseThrow(() -> new RuntimeException("Current user not found"));
            task.setReporter(caller);
        }
        if (task.getIssueKey() == null) {
            task.setIssueKey(issueKeyAllocator.allocate(task.getProject().getId()));
        }
        if (task.getIssueType() == null) {
            task.setIssueType(com.example.taskmanagerpro.model.enums.IssueType.TASK);
        }

        //LocalDateTime if date exist
        if (dto.getDueDate() != null) {
            task.setDueDate(dto.getDueDate().atStartOfDay());
        }


        if (isCurrentUserAdmin()) {
            // Admin can assign ANY user
            User assignedUser = null;

            Long assigneeId = dto.getAssigneeId() != null ? dto.getAssigneeId() : dto.getUserId();
            String assigneeUsername = dto.getAssigneeUsername() != null
                    ? dto.getAssigneeUsername()
                    : dto.getUsername();
            if (assigneeId != null) {
                assignedUser = userService.getUserById(assigneeId).orElse(null);
            } else if (assigneeUsername != null) {
                assignedUser = userService.getUserByUsername(assigneeUsername).orElse(null);
            }

            if (assignedUser == null) {
                assignedUser = userService.getUserByUsername(getCurrentUsername()).orElse(null);
            }

            task.setUser(assignedUser);

        } else {
            // Normal user
            User currentUser = userService
                    .getUserByUsername(getCurrentUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            task.setUser(currentUser);
        }

        return task;
    }



    public Optional<User> getUserById(Long id) {
        return userService.getUserById(id);
    }


    public Page<TaskDTO> getTasks(String status, String priority, Long userId,String keyword,
                                  int page, int size, String[] sort) {

        Sort.Direction direction = Sort.Direction.ASC;
        String sortBy = "id";

        if (sort.length == 2) {
            sortBy = sort[0];
            direction = sort[1].equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        if (keyword == null) {
            keyword = "";
        }

        TaskStatus taskStatus = null;
        TaskPriority taskPriority = null;

        if (status != null) {
            try {
                taskStatus = TaskStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        if (priority != null) {
            try {
                taskPriority = TaskPriority.valueOf(priority.toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        Long ownerId = null;
        if (!isCurrentUserAdmin()) {
            Long currentUserId = getCurrentUserId();
            if (userId != null && !userId.equals(currentUserId)) {
                throw new ResponseStatusException(FORBIDDEN, "You cannot access another user's tasks");
            }
            ownerId = currentUserId;
        }

        return taskRepository.findAllWithFilters(taskStatus, taskPriority, userId, ownerId, keyword, pageable)
                .map(Mapper::toTaskDTO);
    }



    public boolean canModifyTask(Task task) {

        return isCurrentUserAdmin() || isCurrentUserAssignee(task);
    }

    public Task updateTask(Task task, TaskDTO dto) {
        if (dto.getTitle() != null) task.setTitle(dto.getTitle());
        if (dto.getDescription() != null) task.setDescription(dto.getDescription());
        if (dto.getStatus() != null) task.setStatus(dto.getStatus());
        if (dto.getPriority() != null) task.setPriority(dto.getPriority());
        if (dto.getDueDate() != null) task.setDueDate(dto.getDueDate().atStartOfDay());
        return taskRepository.save(task);
    }

    private String getCurrentUsername() {
        Object principal = SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal();

        if (principal instanceof UserDetails) {
            return ((UserDetails) principal).getUsername();
        }
        return principal.toString();
    }

    private Long getCurrentUserId() {
        return userService.findByUsername(getCurrentUsername())
                .map(User::getId)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Current user not found"));
    }

    private boolean isCurrentUserAdmin() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
    }

    private boolean isCurrentUserAssignee(Task task) {
        return task.getAssignee() != null
                && getCurrentUsername().equals(task.getAssignee().getUsername());
    }
}
