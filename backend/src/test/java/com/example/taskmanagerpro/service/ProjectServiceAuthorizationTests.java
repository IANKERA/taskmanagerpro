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
import org.mockito.ArgumentCaptor;
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

    @Mock
    private AttachmentCleanupService attachmentCleanupService;

    private ProjectService projectService;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(
                projectRepository, membershipRepository, userRepository, attachmentCleanupService);
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

    @Test
    void authorizedAdminCanRemoveMember() {
        stubCurrentUser();
        Project project = new Project();
        project.setId(7L);
        User bob = new User();
        bob.setId(2L);
        bob.setUsername("bob");

        when(projectRepository.findByKey("SECRET")).thenReturn(Optional.of(project));
        when(membershipRepository.existsByProjectAndUserWithRoleIn(any(), any(), any()))
                .thenReturn(true);
        when(userRepository.findByUsername("bob")).thenReturn(Optional.of(bob));

        ProjectMembership pm = ProjectMembership.builder().project(project).user(bob).projectRole(ProjectRole.MEMBER).build();
        when(membershipRepository.findByProjectIdAndUserId(7L, 2L)).thenReturn(Optional.of(pm));

        projectService.removeMember("SECRET", "bob");

        verify(membershipRepository).delete(pm);
    }

    @Test
    void cannotRemoveProjectLeadFromMembership() {
        stubCurrentUser();
        User lead = new User();
        lead.setId(10L);
        lead.setUsername("leadUser");

        Project project = new Project();
        project.setId(7L);
        project.setLead(lead);

        when(projectRepository.findByKey("SECRET")).thenReturn(Optional.of(project));
        when(membershipRepository.existsByProjectAndUserWithRoleIn(any(), any(), any()))
                .thenReturn(true);
        when(userRepository.findByUsername("leadUser")).thenReturn(Optional.of(lead));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> projectService.removeMember("SECRET", "leadUser"));

        assertEquals(400, ex.getStatusCode().value());
        verify(membershipRepository, never()).delete(any());
    }

    @Test
    void nonAdminCannotRemoveMember() {
        stubCurrentUser();
        Project project = new Project();
        project.setId(7L);

        when(projectRepository.findByKey("SECRET")).thenReturn(Optional.of(project));
        when(membershipRepository.existsByProjectAndUserWithRoleIn(any(), any(), any()))
                .thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> projectService.removeMember("SECRET", "bob"));

        assertEquals(403, ex.getStatusCode().value());
        verify(membershipRepository, never()).delete(any());
    }

    @Test
    void authorizedAdminCanChangeProjectLead() {
        stubCurrentUser();
        Project project = new Project();
        project.setId(7L);

        User newLead = new User();
        newLead.setId(5L);
        newLead.setUsername("charlie");

        when(membershipRepository.existsByProjectAndUserWithRoleIn(any(), any(), any()))
                .thenReturn(true);
        when(userRepository.findByUsername("charlie")).thenReturn(Optional.of(newLead));
        when(membershipRepository.findByProjectIdAndUserId(7L, 5L)).thenReturn(Optional.empty());

        projectService.changeLead(project, "charlie");

        assertEquals(newLead, project.getLead());
        ArgumentCaptor<ProjectMembership> captor = ArgumentCaptor.forClass(ProjectMembership.class);
        verify(membershipRepository).save(captor.capture());
        assertEquals(ProjectRole.ADMIN, captor.getValue().getProjectRole());
        assertEquals(newLead, captor.getValue().getUser());
        verify(projectRepository).save(project);
    }

    @Test
    void globalAdminListsAllProjects() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "adminUser", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));

        Project p1 = Project.builder().id(1L).key("P1").build();
        Project p2 = Project.builder().id(2L).key("P2").build();
        when(projectRepository.findAllWithLead()).thenReturn(List.of(p1, p2));

        List<Project> result = projectService.listForCurrentUser();

        assertEquals(2, result.size());
        verify(projectRepository).findAllWithLead();
        verify(membershipRepository, never()).findByUserIdWithProjectAndLead(any());
    }

    @Test
    void authorizedProjectAdminCanDeleteProject() {
        stubCurrentUser();
        Project project = Project.builder().id(7L).key("SECRET").build();
        when(projectRepository.findByKey("SECRET")).thenReturn(Optional.of(project));
        when(membershipRepository.existsByProjectAndUserWithRoleIn(any(), any(), any())).thenReturn(true);

        projectService.deleteProject("SECRET");

        verify(attachmentCleanupService).enqueueForProject(7L);
        verify(projectRepository).delete(project);
    }

    @Test
    void globalAdminCanDeleteProjectWithoutProjectMembership() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "globalAdmin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));

        Project project = Project.builder().id(7L).key("SECRET").build();
        when(projectRepository.findByKey("SECRET")).thenReturn(Optional.of(project));

        projectService.deleteProject("SECRET");

        verify(attachmentCleanupService).enqueueForProject(7L);
        verify(projectRepository).delete(project);
        verify(membershipRepository, never()).existsByProjectAndUserWithRoleIn(any(), any(), any());
    }

    @Test
    void nonAdminCannotDeleteProject() {
        stubCurrentUser();
        Project project = Project.builder().id(7L).key("SECRET").build();
        when(projectRepository.findByKey("SECRET")).thenReturn(Optional.of(project));
        // First check in getByKey allows VIEWER/MEMBER/ADMIN; but second check in deleteProject requires ADMIN
        // Let's test when user is not an ADMIN (e.g. existsByProject returns false for ADMIN)
        when(membershipRepository.existsByProjectAndUserWithRoleIn(any(), any(), any())).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> projectService.deleteProject("SECRET"));

        assertEquals(403, ex.getStatusCode().value());
        verify(projectRepository, never()).delete(any());
        verify(attachmentCleanupService, never()).enqueueForProject(any());
    }

    @Test
    void deleteProjectThrowsNotFoundForNonExistentKey() {
        when(projectRepository.findByKey("NONEXISTENT")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> projectService.deleteProject("NONEXISTENT"));

        assertEquals(404, ex.getStatusCode().value());
        verify(projectRepository, never()).delete(any());
        verify(attachmentCleanupService, never()).enqueueForProject(any());
    }

    private ProjectMembership membership(Long userId, String username, ProjectRole role) {
        User user = new User();
        user.setId(userId);
        user.setUsername(username);
        return ProjectMembership.builder().user(user).projectRole(role).build();
    }
}
