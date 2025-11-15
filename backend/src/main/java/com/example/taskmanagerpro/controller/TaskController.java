package com.example.taskmanagerpro.controller;

import com.example.taskmanagerpro.dto.Mapper;
import com.example.taskmanagerpro.dto.TaskDTO;
import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import org.springframework.data.domain.Page;
import com.example.taskmanagerpro.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:5173")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    // Get task by ID
    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> getTaskById(@PathVariable Long id) {
        return taskService.getTaskById(id)
                .map(Mapper::toTaskDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Create new task
    @PostMapping
    public TaskDTO createTask(@RequestBody TaskDTO taskDTO) {
        Task saved = taskService.saveTask(taskService.convertToEntity(taskDTO));
        return Mapper.toTaskDTO(saved);
    }

    // Get tasks by status
    @GetMapping("/status/{status}")
    public List<TaskDTO> getTasksByStatus(@PathVariable TaskStatus status) {
        return Mapper.toTaskDTOList(taskService.getTasksByStatus(status));
    }

    // Get tasks by priority
    @GetMapping("/priority/{priority}")
    public List<TaskDTO> getTasksByPriority(@PathVariable TaskPriority priority) {
        return Mapper.toTaskDTOList(taskService.getTasksByPriority(priority));
    }

    // Get tasks by user ID
    @GetMapping("/user/{userId}")
    public List<TaskDTO> getTasksByUser(@PathVariable Long userId) {
        return Mapper.toTaskDTOList(taskService.getTasksByUserId(userId));
    }

    @GetMapping
    public ResponseEntity<Page<TaskDTO>> getTasks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,asc") String[] sort) {

        Page<TaskDTO> tasks = taskService.getTasks(status, priority, userId, keyword, page, size, sort);
        return ResponseEntity.ok(tasks);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTask(@PathVariable Long id, @RequestBody TaskDTO dto) {
        Task task = taskService.getTaskById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!taskService.canModifyTask(task)) {
            return ResponseEntity.status(403).body("You are not allowed to modify this task");
        }

        Task updatedTask = taskService.updateTask(task, dto);
        return ResponseEntity.ok(Mapper.toTaskDTO(updatedTask));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {
        Task task = taskService.getTaskById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!taskService.canModifyTask(task)) {
            return ResponseEntity.status(403).body("You are not allowed to delete this task");
        }

        taskService.deleteTask(id);
        return ResponseEntity.ok("Task deleted successfully");
    }
}



//    // Update task
//    @PutMapping("/{id}")
//    public ResponseEntity<TaskDTO> updateTask(@PathVariable Long id, @RequestBody TaskDTO taskDTO) {
//        return taskService.getTaskById(id)
//                .map(existing -> {
//                    taskDTO.setId(id); // ensure ID is set
//                    return ResponseEntity.ok(taskService.convertToDTO(taskService.saveTask(taskService.convertToEntity(taskDTO))));
//                })
//                .orElse(ResponseEntity.notFound().build());
//    }

//    // Delete task
//    @DeleteMapping("/{id}")
//    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
//        taskService.deleteTask(id);
//        return ResponseEntity.noContent().build();
//    }
//
//    //Get all tasks
//    @GetMapping
//    public List<TaskDTO> getAllTasks() {
//        return taskService.convertToDTOList(taskService.getAllTasks());
//    }