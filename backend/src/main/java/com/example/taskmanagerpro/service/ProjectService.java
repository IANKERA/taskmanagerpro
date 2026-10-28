package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.dto.AddMemberRequest;
import com.example.taskmanagerpro.dto.CreateProjectRequest;
import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.model.ProjectMembership;
import com.example.taskmanagerpro.model.User;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import com.example.taskmanagerpro.repository.ProjectMembershipRepository;
import com.example.taskmanagerpro.repository.ProjectRepository;
import com.example.taskmanagerpro.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.springframework.http.HttpStatus.*;

@Service
public class ProjectService {

    private final ProjectRepository projectRepo;
    private final ProjectMembershipRepository membershipRepo;
    private final UserRepository userRepo;

    public ProjectService(ProjectRepository projectRepo,
                          ProjectMembershipRepository membershipRepo,
                          UserRepository userRepo) {
        this.projectRepo = projectRepo;
        this.membershipRepo = membershipRepo;
        this.userRepo = userRepo;
    }

    @Transactional(readOnly = true)
    public List<Project> listAll() {
        return projectRepo.findAll();
    }

    @Transactional(readOnly = true)
    public List<Project> listForCurrentUser() {
        Long uid = currentUser().getId();
        // Touch lead inside the tx so ProjectDTO.from can read it after the session closes.
        return membershipRepo.findByUserId(uid).stream()
                .map(pm -> {
                    Project p = pm.getProject();
                    if (p.getLead() != null) p.getLead().getUsername(); // force init
                    return p;
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public Project getByKey(String key) {
        Project p = projectRepo.findByKey(key)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Project not found: " + key));
        requireProjectRole(p.getId(),
                ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        if (p.getLead() != null) p.getLead().getUsername(); // force init for DTO mapping
        return p;
    }

    @Transactional
    public Project save(Project p) {
        requireProjectRole(p.getId(), ProjectRole.ADMIN);
        return projectRepo.save(p);
    }

    @Transactional
    public void deleteProject(String key) {
        Project p = getByKey(key);
        requireProjectRole(p.getId(), ProjectRole.ADMIN);
        projectRepo.delete(p);
    }

    /** Creator becomes project ADMIN automatically. */
    @Transactional
    public Project create(CreateProjectRequest req) {
        if (projectRepo.existsByKey(req.getKey())) {
            throw new ResponseStatusException(CONFLICT, "Project key already in use: " + req.getKey());
        }
        User creator = currentUser();

        Project p = Project.builder()
                .key(req.getKey())
                .name(req.getName())
                .description(req.getDescription())
                .lead(creator)
                .nextIssueNum(1L)
                .build();
        p = projectRepo.save(p);

        ProjectMembership pm = ProjectMembership.builder()
                .project(p)
                .user(creator)
                .projectRole(ProjectRole.ADMIN)
                .build();
        membershipRepo.save(pm);

        return p;
    }

    @Transactional
    public ProjectMembership addMember(String projectKey, AddMemberRequest req) {
        Project p = getByKey(projectKey);
        requireProjectRole(p.getId(), ProjectRole.ADMIN);

        User u = userRepo.findByUsername(req.getUsername())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found: " + req.getUsername()));

        Optional<ProjectMembership> existing = membershipRepo.findByProjectIdAndUserId(p.getId(), u.getId());
        if (existing.isPresent()) {
            ProjectMembership pm = existing.get();
            pm.setProjectRole(req.getProjectRole());
            return membershipRepo.save(pm);
        }

        ProjectMembership pm = ProjectMembership.builder()
                .project(p)
                .user(u)
                .projectRole(req.getProjectRole())
                .build();
        return membershipRepo.save(pm);
    }

    @Transactional(readOnly = true)
    public List<ProjectMembership> listMembers(String projectKey) {
        Project p = getByKey(projectKey);
        requireProjectRole(p.getId(), ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.ADMIN);
        List<ProjectMembership> ms = membershipRepo.findByProjectId(p.getId());
        ms.forEach(m -> m.getUser().getUsername()); // force lazy user init
        return ms;
    }

    @Transactional(readOnly = true)
    public List<ProjectMembership> listAssignableMembers(String projectKey) {
        return listMembers(projectKey).stream()
                .filter(m -> m.getProjectRole() == ProjectRole.MEMBER
                        || m.getProjectRole() == ProjectRole.ADMIN)
                .toList();
    }

    @Transactional(readOnly = true)
    public void requireAssignableMember(Long projectId, Long userId) {
        boolean eligible = membershipRepo.existsByProjectAndUserWithRoleIn(
                projectId, userId, List.of(ProjectRole.MEMBER, ProjectRole.ADMIN));
        if (!eligible) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Assignee must be a MEMBER or ADMIN of the task's project");
        }
    }

    // ───────── Authorization helpers (used here and by future controllers) ─────────

    /** Throws 403 unless the current user has one of the given roles on the project (or is a global ADMIN). */
    @Transactional(readOnly = true)
    public void requireProjectRole(Long projectId, ProjectRole... allowed) {
        if (isCurrentUserGlobalAdmin()) return;
        User u = currentUser();
        boolean ok = membershipRepo.existsByProjectAndUserWithRoleIn(projectId, u.getId(), List.of(allowed));
        if (!ok) {
            throw new ResponseStatusException(FORBIDDEN, "You don't have access to this project");
        }
    }

    @Transactional(readOnly = true)
    public User currentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username = (principal instanceof UserDetails ud) ? ud.getUsername() : principal.toString();
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "User not found"));
    }

    public boolean hasProjectRole(Long projectId, ProjectRole... roles) {
        if (isCurrentUserGlobalAdmin()) return true;
        User u = currentUser();
        return membershipRepo.existsByProjectAndUserWithRoleIn(projectId, u.getId(), List.of(roles));
    }

    private boolean isCurrentUserGlobalAdmin() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
