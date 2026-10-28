package com.example.taskmanagerpro.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_preferences")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Builder.Default
    private boolean notifyAssigned = true;

    @Builder.Default
    private boolean notifyMentioned = true;

    @Builder.Default
    private boolean notifyWatching = true;

    @Builder.Default
    private boolean notifyComment = true;
}
