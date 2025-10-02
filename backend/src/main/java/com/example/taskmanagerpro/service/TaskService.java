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

        // Use DTO value if provided, otherwise Task entity default (MEDIUM) will apply
        if (dto.getPriority() != null) {
            task.setPriority(dto.getPriority());
        }

        task.setStatus(dto.getStatus());

        if (dto.getDueDate() != null) {
            task.setDueDate(dto.getDueDate().atStartOfDay());
        } else {
            task.setDueDate(null); // or keep as null if no default
        }

        task.setUser(getUserById(dto.getUserId()).orElse(null));

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

    public Page<TaskDTO> getTasks(String status, String priority, Long userId,
                                  int page, int size, String[] sort) {

        Sort.Direction direction = Sort.Direction.ASC;
        String sortBy = "id";

        if (sort.length == 2) {
            sortBy = sort[0];
            direction = sort[1].equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        return taskRepository.findAllWithFilters(status, priority, userId, pageable)
                .map(this::convertToDTO);
    }



    public boolean canModifyTask(Task task) {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String currentUsername;

        if (principal instanceof UserDetails) {
            currentUsername = ((UserDetails) principal).getUsername();
        } else {
            currentUsername = principal.toString();
        }

        // Admin can modify any task
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


}
