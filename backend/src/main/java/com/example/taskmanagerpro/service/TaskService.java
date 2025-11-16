package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.Mapper;
import com.example.taskmanagerpro.dto.TaskDTO;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class TaskService {
    private final UserService userService;
    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository, UserService userService) {
        this.taskRepository = taskRepository;
        this.userService = userService;
    }

    // Get all tasks with user
    public List<Task> getAllTasks() {
        return taskRepository.findAllWithUser();
    }

    // Get task by ID with user
    public Optional<Task> getTaskById(Long id) {
        return Optional.ofNullable(taskRepository.findByIdWithUser(id));
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
        return taskRepository.findByStatus(status);
    }

    // Get tasks by priority
    public List<Task> getTasksByPriority(TaskPriority priority) {
        return taskRepository.findByPriority(priority);
    }

    // Get tasks by user ID
    public List<Task> getTasksByUserId(Long userId) {
        return taskRepository.findByUserId(userId);
    }

    // Convert TaskDTO -> Task
    public Task convertToEntity(TaskDTO dto) {
        Task task = new Task();

        // If we are updating
        if (dto.getId() != null) {
            task = taskRepository.findById(dto.getId()).orElse(new Task());
        }

        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setStatus(dto.getStatus());
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : TaskPriority.MEDIUM);

        //LocalDateTime if date exist
        if (dto.getDueDate() != null) {
            task.setDueDate(dto.getDueDate().atStartOfDay());
        }


        if (isCurrentUserAdmin()) {
            // Admin can assign ANY user
            User assignedUser = null;

            if (dto.getUserId() != null) {
                assignedUser = userService.getUserById(dto.getUserId()).orElse(null);
            } else if (dto.getUsername() != null) {
                assignedUser = userService.getUserByUsername(dto.getUsername()).orElse(null);
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


        return taskRepository.findAllWithFilters(taskStatus, taskPriority, userId,keyword, pageable)
                .map(Mapper::toTaskDTO);
    }



    public boolean canModifyTask(Task task) {

        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String currentUsername;

        if (principal instanceof UserDetails) {
            currentUsername = ((UserDetails) principal).getUsername();
        } else {
            currentUsername = principal.toString();
        }

        // User is owner can modify  task
        if (task.getUser() != null && currentUsername.equals(task.getUser().getUsername())) {
            return true;
        }

        // Check for ROLE_ADMIN
        return SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities()
                .stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
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
                .orElse(null);
    }

    private boolean isCurrentUserAdmin() {
        return SecurityContextHolder.getContext()
                .getAuthentication()
                .getAuthorities()
                .stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
    }
}
