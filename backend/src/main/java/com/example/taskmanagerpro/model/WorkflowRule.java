package com.example.taskmanagerpro.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "workflow_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "trigger_field", nullable = false, length = 64)
    private String triggerField;

    @Column(name = "trigger_value", nullable = false, length = 128)
    private String triggerValue;

    @Column(name = "action_type", nullable = false, length = 64)
    private String actionType; // SET_FIELD, ADD_LABEL, ASSIGN

    @Column(name = "action_field", length = 64)
    private String actionField;

    @Column(name = "action_value", nullable = false, length = 256)
    private String actionValue;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
