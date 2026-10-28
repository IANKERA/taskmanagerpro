package com.example.taskmanagerpro.model;

import com.example.taskmanagerpro.model.enums.Role;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    /**
     * Tasks assigned to this user. Note: in M2 we split Task.user into
     * assignee (this side) + reporter. Cascading is removed because deleting
     * a user shouldn't delete issues — Jira's behaviour is to leave them
     * unassigned (assignee_id ON DELETE SET NULL handles it at the DB level).
     */
    @OneToMany(mappedBy = "assignee")
    @JsonManagedReference("assignee-tasks")
    @Builder.Default
    private Set<Task> tasks = new HashSet<>();
}