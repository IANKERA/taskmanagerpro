package com.example.taskmanagerpro.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "custom_field_values")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomFieldValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "field_id", nullable = false)
    private CustomFieldDefinition field;

    @Column(columnDefinition = "TEXT")
    private String value;
}
