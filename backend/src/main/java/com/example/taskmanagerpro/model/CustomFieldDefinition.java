package com.example.taskmanagerpro.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "custom_field_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomFieldDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 64)
    private String name;

    /** TEXT, NUMBER, DATE, SELECT */
    @Column(name = "field_type", nullable = false, length = 16)
    private String fieldType;

    /** JSON array for SELECT options, e.g. ["S","M","L","XL"] */
    @Column(columnDefinition = "TEXT")
    private String options;

    @Column(nullable = false)
    @Builder.Default
    private Boolean required = false;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
