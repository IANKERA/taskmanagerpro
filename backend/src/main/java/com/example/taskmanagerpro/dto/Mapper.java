package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.User;

import java.util.List;
import java.util.stream.Collectors;

public class Mapper {

    public static UserDTO toUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());

        try {
            if (user.getTasks() != null) {
                List<Long> taskIds = user.getTasks().stream()
                        .map(Task::getId)
                        .collect(Collectors.toList());
                dto.setTaskIds(taskIds);
            }
        } catch (org.hibernate.LazyInitializationException ignore) { /* tasks not loaded */ }
        return dto;
    }

    public static TaskDTO toTaskDTO(Task task) {
        TaskDTO.TaskDTOBuilder b = TaskDTO.builder()
                .id(task.getId())
                .issueKey(task.getIssueKey())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .issueType(task.getIssueType())
                .dueDate(task.getDueDate() != null ? task.getDueDate().toLocalDate() : null);

        if (task.getAssignee() != null) {
            b.assigneeId(task.getAssignee().getId());
            b.assigneeUsername(task.getAssignee().getUsername());
            // Legacy aliases for the old frontend.
            b.userId(task.getAssignee().getId());
            b.username(task.getAssignee().getUsername());
        }
        if (task.getReporter() != null) {
            b.reporterId(task.getReporter().getId());
            b.reporterUsername(task.getReporter().getUsername());
        }
        if (task.getProject() != null) {
            b.projectId(task.getProject().getId());
            b.projectKey(task.getProject().getKey());
        }
        // M5
        b.storyPoints(task.getStoryPoints());
        b.estimateMinutes(task.getEstimateMinutes());
        try {
            if (task.getSprint() != null) {
                b.sprintId(task.getSprint().getId());
                b.sprintName(task.getSprint().getName());
                b.sprintState(task.getSprint().getState());
            }
        } catch (org.hibernate.LazyInitializationException ignore) { /* legacy fetcher */ }
        try {
            if (task.getParent() != null) {
                b.parentIssueKey(task.getParent().getIssueKey());
            }
        } catch (org.hibernate.LazyInitializationException ignore) { /* legacy fetcher */ }
        // M4 — labels & watcher count. Best-effort: if the collection wasn't fetched
        // (e.g. caller is using a legacy query), we swallow LazyInitializationException
        // rather than failing the response.
        try {
            if (task.getLabels() != null) {
                b.labels(task.getLabels().stream().map(LabelDTO::from).collect(Collectors.toList()));
            }
        } catch (org.hibernate.LazyInitializationException ignore) { /* legacy fetcher */ }
        try {
            if (task.getWatchers() != null) {
                b.watcherCount(task.getWatchers().size());
                b.watcherUsernames(task.getWatchers().stream().map(User::getUsername).collect(Collectors.toList()));
            }
        } catch (org.hibernate.LazyInitializationException ignore) { /* legacy fetcher */ }
        return b.build();
    }

    public static List<UserDTO> toUserDTOList(List<User> users) {
        return users.stream().map(Mapper::toUserDTO).collect(Collectors.toList());
    }

    public static List<TaskDTO> toTaskDTOList(List<Task> tasks) {
        return tasks.stream().map(Mapper::toTaskDTO).collect(Collectors.toList());
    }
}
