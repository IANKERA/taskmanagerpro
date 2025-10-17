package com.example.taskmanagerpro.service;

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

    // Get all tasks with user eagerly fetched
    public List<Task> getAllTasks() {
        return taskRepository.findAllWithUser();
    }

    // Get task by ID with user eagerly fetched
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
        task.setId(dto.getId());
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setStatus(dto.getStatus());
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : TaskPriority.MEDIUM);
        task.setDueDate(dto.getDueDate() != null ? dto.getDueDate().atStartOfDay() : null);

        if (isCurrentUserAdmin()) {
            // Admin can assign any user
            User user = null;
            if (dto.getUserId() != null) {
                user = userService.getUserById(dto.getUserId()).orElse(null);
            } else if (dto.getUsername() != null) {
                user = userService.getUserByUsername(dto.getUsername()).orElse(null);
            }
            task.setUser(user);
        } else {
            // Normal user → always assign to themselves
            User currentUser = userService.getUserByUsername(getCurrentUsername()).orElse(null);
            task.setUser(currentUser);
        }

        return task;
    }



    public Optional<User> getUserById(Long id) {
        return userService.getUserById(id);
    }

    // Convert Task -> TaskDTO
    public TaskDTO convertToDTO(Task task) {
        TaskDTO dto = new TaskDTO();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setStatus(task.getStatus());
        dto.setPriority(task.getPriority());

        if (task.getDueDate() != null) {
            dto.setDueDate(task.getDueDate().toLocalDate());
        } else {
            dto.setDueDate(null);
        }

        if (task.getUser() != null) {
            dto.setUserId(task.getUser().getId());
        } else {
            dto.setUserId(null);
        }

        return dto;
    }


    public List<TaskDTO> convertToDTOList(List<Task> tasks) {
        return tasks.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Page<TaskDTO> getTasks(String status, String priority, Long userId, String keyword,
                                  int page, int size, String[] sort) {

        // Sort handling
        Sort.Direction direction = Sort.Direction.ASC;
        String sortBy = "id";

        if (sort.length == 2) {
            sortBy = sort[0];
            direction = sort[1].equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        // Convert String to Enum
        TaskStatus taskStatus = null;
        TaskPriority taskPriority = null;

        if (status != null) {
            try { taskStatus = TaskStatus.valueOf(status.toUpperCase()); } catch (IllegalArgumentException ignored) {}
        }

        if (priority != null) {
            try { taskPriority = TaskPriority.valueOf(priority.toUpperCase()); } catch (IllegalArgumentException ignored) {}
        }

        // If user is **NOT** admin, force userId = currentUserId
        if (!isCurrentUserAdmin()) {
            userId = getCurrentUserId();
        }

        //  Empty keyword → treat as null
        if (keyword != null && keyword.isBlank()) {
            keyword = null;
        }

        return taskRepository.findAllWithFilters(taskStatus, taskPriority, userId, keyword, pageable)
                .map(this::convertToDTO);
    }

    private String getCurrentUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
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
        return SecurityContextHolder.getContext().getAuthentication()
                .getAuthorities()
                .stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
    }

    public boolean canViewTask(Task task) {
        if(isCurrentUserAdmin()) return true;

        String currentUsername = getCurrentUsername();
        return  task.getUser() != null && currentUsername.equals(task.getUser().getUsername());
    }

    public boolean canModifyTask(Task task) {
        // Admin can modify any task
        if (isCurrentUserAdmin()) {
            return true;
        }

        // Normal user can only modify own tasks
        String currentUsername = getCurrentUsername();
        return task.getUser() != null && currentUsername.equals(task.getUser().getUsername());
    }

    private Optional<User> getCurrentUser() {
        return userService.getUserByUsername(getCurrentUsername());
    }



    public Task updateTask(Task task, TaskDTO dto) {
        if (dto.getTitle() != null) task.setTitle(dto.getTitle());
        if (dto.getDescription() != null) task.setDescription(dto.getDescription());
        if (dto.getStatus() != null) task.setStatus(dto.getStatus());
        if (dto.getPriority() != null) task.setPriority(dto.getPriority());
        if (dto.getDueDate() != null) task.setDueDate(dto.getDueDate().atStartOfDay());
        return taskRepository.save(task);
    }


}
