package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.Role;
import com.example.taskmanagerpro.repository.ProjectMembershipRepository;
import com.example.taskmanagerpro.repository.ProjectRepository;
import com.example.taskmanagerpro.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceAuthorizationTests {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private ProjectMembershipRepository membershipRepository;

    @Mock
    private UserRepository userRepository;

    private ProjectService projectService;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(projectRepository, membershipRepository, userRepository);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "alice", null, List.of(new SimpleGrantedAuthority(Role.ROLE_USER.name()))));
        User alice = new User();
        alice.setId(1L);
        alice.setUsername("alice");
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(alice));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void deniesProjectLookupToANonMember() {
        Project project = new Project();
        project.setId(7L);
        when(projectRepository.findByKey("SECRET")).thenReturn(Optional.of(project));
        when(membershipRepository.existsByProjectAndUserWithRoleIn(any(), any(), any()))
                .thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> projectService.getByKey("SECRET"));

        assertEquals(403, exception.getStatusCode().value());
    }

    @Test
    void deniesProjectChangesByNonAdmins() {
        Project project = new Project();
        project.setId(7L);
        when(membershipRepository.existsByProjectAndUserWithRoleIn(any(), any(), any()))
                .thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> projectService.save(project));

        assertEquals(403, exception.getStatusCode().value());
        verify(projectRepository, never()).save(any(Project.class));
    }
}
