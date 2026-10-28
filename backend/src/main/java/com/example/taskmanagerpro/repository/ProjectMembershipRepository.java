package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.ProjectMembership;
import com.example.taskmanagerpro.model.enums.ProjectRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectMembershipRepository extends JpaRepository<ProjectMembership, Long> {

    Optional<ProjectMembership> findByProjectIdAndUserId(Long projectId, Long userId);

    List<ProjectMembership> findByProjectId(Long projectId);

    List<ProjectMembership> findByUserId(Long userId);

    @Query("""
        SELECT CASE WHEN COUNT(pm) > 0 THEN true ELSE false END
        FROM ProjectMembership pm
        WHERE pm.project.id = :projectId
          AND pm.user.id = :userId
          AND pm.projectRole IN :roles
    """)
    boolean existsByProjectAndUserWithRoleIn(@Param("projectId") Long projectId,
                                             @Param("userId") Long userId,
                                             @Param("roles") List<ProjectRole> roles);
}
