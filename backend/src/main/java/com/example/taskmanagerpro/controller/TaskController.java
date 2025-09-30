package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.TaskDTO;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import com.example.taskmanagerpro.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    // Get all tasks
    @GetMapping
    public List<TaskDTO> getAllTasks() {
        return taskService.convertToDTOList(taskService.getAllTasks());
    }

    // Get task by ID
    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> getTaskById(@PathVariable Long id) {
        return taskService.getTaskById(id)
                .map(taskService::convertToDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Create new task
    @PostMapping
    public TaskDTO createTask(@RequestBody TaskDTO taskDTO) {
        return taskService.convertToDTO(taskService.saveTask(taskService.convertToEntity(taskDTO)));
    }

    // Update task
    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> updateTask(@PathVariable Long id, @RequestBody TaskDTO taskDTO) {
        return taskService.getTaskById(id)
                .map(existing -> {
                    taskDTO.setId(id); // ensure ID is set
                    return ResponseEntity.ok(taskService.convertToDTO(taskService.saveTask(taskService.convertToEntity(taskDTO))));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Delete task
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }

    // Get tasks by status
    @GetMapping("/status/{status}")
    public List<TaskDTO> getTasksByStatus(@PathVariable TaskStatus status) {
        return taskService.convertToDTOList(taskService.getTasksByStatus(status));
    }

    // Get tasks by priority
    @GetMapping("/priority/{priority}")
    public List<TaskDTO> getTasksByPriority(@PathVariable TaskPriority priority) {
        return taskService.convertToDTOList(taskService.getTasksByPriority(priority));
    }

    // Get tasks by user ID
    @GetMapping("/user/{userId}")
    public List<TaskDTO> getTasksByUser(@PathVariable Long userId) {
        return taskService.convertToDTOList(taskService.getTasksByUserId(userId));
    }
}
