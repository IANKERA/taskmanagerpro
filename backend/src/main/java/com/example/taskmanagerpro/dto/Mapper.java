package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;

import java.util.List;
import java.util.stream.Collectors;

public class Mapper {

    // User → UserDTO
    public static UserDTO toUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setRole(user.getRole());

        if (user.getTasks() != null) {
            List<Long> taskIds = user.getTasks().stream()
                    .map(Task::getId)
                    .collect(Collectors.toList());
            dto.setTaskIds(taskIds);
        }
        return dto;
    }

    // Task → TaskDTO
    public static TaskDTO toTaskDTO(Task task) {
        TaskDTO dto = new TaskDTO();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setStatus(task.getStatus());
        dto.setPriority(task.getPriority());
        dto.setDueDate(task.getDueDate() != null ? task.getDueDate().toLocalDate() : null);

        if (task.getUser() != null) {
            dto.setUserId(task.getUser().getId());
        }
        return dto;
    }

    // List<User> → List<UserDTO>
    public static List<UserDTO> toUserDTOList(List<User> users) {
        return users.stream().map(Mapper::toUserDTO).collect(Collectors.toList());
    }

    // List<Task> → List<TaskDTO>
    public static List<TaskDTO> toTaskDTOList(List<Task> tasks) {
        return tasks.stream().map(Mapper::toTaskDTO).collect(Collectors.toList());
    }
}
