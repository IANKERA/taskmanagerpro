package com.example.taskmanagerpro.service;

import com.example.taskmanagerpro.model.Project;
import com.example.taskmanagerpro.repository.ProjectRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Allocates the next issue key for a project (e.g. "DEMO-7") and atomically
 * increments {@link Project#getNextIssueNum()}.
 *
 * <p>Uses a pessimistic row lock so concurrent issue creation in the same
 * project doesn't produce duplicate keys. The unique constraint on
 * {@code tasks.issue_key} is the belt-and-braces backstop.
 *
 * <p>Runs in a dedicated REQUIRES_NEW transaction so the lock is released
 * the moment the number is allocated, even if the surrounding business
 * transaction is long.
 */
@Service
public class IssueKeyAllocator {

    private final EntityManager em;
    private final ProjectRepository projectRepo;

    public IssueKeyAllocator(EntityManager em, ProjectRepository projectRepo) {
        this.em = em;
        this.projectRepo = projectRepo;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String allocate(Long projectId) {
        Project p = em.find(Project.class, projectId, LockModeType.PESSIMISTIC_WRITE);
        if (p == null) {
            throw new IllegalStateException("Project not found for issue-key allocation: " + projectId);
        }
        Long n = p.getNextIssueNum();
        p.setNextIssueNum(n + 1);
        projectRepo.save(p);
        return p.getKey() + "-" + n;
    }
}
