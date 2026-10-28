package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.ProjectMembership;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.ProjectRole;
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
    }

    private void stubCurrentUser() {
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
        stubCurrentUser();
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
        stubCurrentUser();
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

    @Test
    void assignableMembersIncludesOnlyProjectMembersAndAdmins() {
        stubCurrentUser();
        Project project = new Project();
        project.setId(7L);
        when(projectRepository.findByKey("SECRET")).thenReturn(Optional.of(project));
        when(membershipRepository.existsByProjectAndUserWithRoleIn(any(), any(), any()))
                .thenReturn(true);
        when(membershipRepository.findByProjectId(7L)).thenReturn(List.of(
                membership(2L, "member", ProjectRole.MEMBER),
                membership(3L, "admin", ProjectRole.ADMIN),
                membership(4L, "viewer", ProjectRole.VIEWER)
        ));

        List<ProjectMembership> eligible = projectService.listAssignableMembers("SECRET");

        assertEquals(List.of("member", "admin"),
                eligible.stream().map(m -> m.getUser().getUsername()).toList());
    }

    @Test
    void rejectsAssigneeWhoIsNotAMemberOrProjectAdmin() {
        when(membershipRepository.existsByProjectAndUserWithRoleIn(7L, 9L, List.of(
                ProjectRole.MEMBER, ProjectRole.ADMIN))).thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> projectService.requireAssignableMember(7L, 9L));

        assertEquals(400, exception.getStatusCode().value());
    }

    private ProjectMembership membership(Long userId, String username, ProjectRole role) {
        User user = new User();
        user.setId(userId);
        user.setUsername(username);
        return ProjectMembership.builder().user(user).projectRole(role).build();
    }
}
