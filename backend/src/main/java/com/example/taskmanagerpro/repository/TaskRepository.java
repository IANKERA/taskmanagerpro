package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.Task;
import com.example.taskmanagerpro.model.enums.TaskPriority;
import com.example.taskmanagerpro.model.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    // Legacy queries — "user" semantically means "assignee" since M2.
    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.assignee")
    List<Task> findAllWithUser();

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.assignee WHERE t.id = :id")
    Task findByIdWithUser(Long id);

    @Query("""
    SELECT t FROM Task t
    LEFT JOIN t.assignee u
    WHERE (:status IS NULL OR t.status = :status)
      AND (:priority IS NULL OR t.priority = :priority)
      AND (:userId IS NULL OR (u IS NOT NULL AND u.id = :userId))
      AND (:ownerId IS NULL OR (u IS NOT NULL AND u.id = :ownerId))
      AND (
            :keyword IS NULL
            OR LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
    """)
    Page<Task> findAllWithFilters(@Param("status") TaskStatus status,
                                  @Param("priority") TaskPriority priority,
                                  @Param("userId") Long userId,
                                  @Param("ownerId") Long ownerId,
                                  @Param("keyword") String keyword,
                                  Pageable pageable);


    List<Task> findByStatus(TaskStatus status);

    List<Task> findByAssigneeIdAndStatus(Long assigneeId, TaskStatus status);

    List<Task> findByPriority(TaskPriority priority);

    List<Task> findByAssigneeIdAndPriority(Long assigneeId, TaskPriority priority);

    @Query("SELECT t FROM Task t WHERE t.assignee.id = :userId")
    List<Task> findByUserId(@Param("userId") Long userId);

    // ─── M2 additions for the /api/issues API ───

    // Two FETCH JOINs across @ManyToMany Sets is fine (no MultipleBagFetchException since neither is a List).
    @Query("""
        SELECT DISTINCT t FROM Task t
        LEFT JOIN FETCH t.assignee
        LEFT JOIN FETCH t.reporter
        LEFT JOIN FETCH t.project
        LEFT JOIN FETCH t.labels
        LEFT JOIN FETCH t.watchers
        LEFT JOIN FETCH t.sprint
        LEFT JOIN FETCH t.parent
        WHERE t.issueKey = :issueKey
    """)
    Optional<Task> findByIssueKeyWithRelations(@Param("issueKey") String issueKey);

    @Query("""
        SELECT DISTINCT t FROM Task t
        LEFT JOIN FETCH t.assignee
        LEFT JOIN FETCH t.reporter
        LEFT JOIN FETCH t.project
        LEFT JOIN FETCH t.labels
        LEFT JOIN FETCH t.watchers
        LEFT JOIN FETCH t.sprint
        LEFT JOIN FETCH t.parent
        WHERE t.project.id = :projectId
        ORDER BY t.id
    """)
    List<Task> findByProjectIdWithRelations(@Param("projectId") Long projectId);

    @Query("""
        SELECT DISTINCT t FROM Task t
        LEFT JOIN FETCH t.assignee
        LEFT JOIN FETCH t.project
        WHERE t.status <> com.example.taskmanagerpro.model.enums.TaskStatus.DONE
        ORDER BY t.id
    """)
    List<Task> findAllOpenWithRelations();

    @Query("""
        SELECT DISTINCT t FROM Task t
        LEFT JOIN FETCH t.assignee
        LEFT JOIN FETCH t.reporter
        LEFT JOIN FETCH t.project
        LEFT JOIN FETCH t.labels
        LEFT JOIN FETCH t.watchers
        WHERE t.project.id = :projectId AND t.sprint IS NULL
        ORDER BY t.sortOrder, t.id
    """)
    List<Task> findBacklog(@Param("projectId") Long projectId);

    @Query("""
        SELECT DISTINCT t FROM Task t
        LEFT JOIN FETCH t.assignee
        LEFT JOIN FETCH t.reporter
        LEFT JOIN FETCH t.project
        LEFT JOIN FETCH t.labels
        LEFT JOIN FETCH t.watchers
        WHERE t.sprint.id = :sprintId
        ORDER BY t.id
    """)
    List<Task> findBySprintIdWithRelations(@Param("sprintId") Long sprintId);

    @Query("""
        SELECT DISTINCT t FROM Task t
        LEFT JOIN FETCH t.assignee
        LEFT JOIN FETCH t.reporter
        LEFT JOIN FETCH t.project
        LEFT JOIN FETCH t.labels
        LEFT JOIN FETCH t.sprint
        WHERE t.assignee.id = :userId
          AND (:onlyOpen = false OR t.status <> com.example.taskmanagerpro.model.enums.TaskStatus.DONE)
        ORDER BY t.updatedAt DESC
    """)
    List<Task> findAssignedToUser(@Param("userId") Long userId, @Param("onlyOpen") boolean onlyOpen);

    @Query("""
        SELECT DISTINCT t FROM Task t
        LEFT JOIN FETCH t.assignee
        LEFT JOIN FETCH t.reporter
        LEFT JOIN FETCH t.project
        LEFT JOIN FETCH t.labels
        LEFT JOIN FETCH t.sprint
        WHERE (LOWER(t.title) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.issueKey) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(t.description) LIKE LOWER(CONCAT('%', :q, '%')))
          AND t.project.id IN :projectIds
        ORDER BY t.updatedAt DESC
    """)
    List<Task> searchInProjects(@Param("q") String query, @Param("projectIds") List<Long> projectIds);

    @Query("""
        SELECT DISTINCT t FROM Task t
        LEFT JOIN FETCH t.assignee
        LEFT JOIN FETCH t.project
        WHERE t.parent.id = :parentId
        ORDER BY t.id
    """)
    List<Task> findByParentId(@Param("parentId") Long parentId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.project.id = :projectId AND t.status = :status")
    long countByProjectAndStatus(@Param("projectId") Long projectId, @Param("status") TaskStatus status);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.sprint.id = :sprintId")
    long countBySprintId(@Param("sprintId") Long sprintId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.sprint.id = :sprintId AND t.status = :status")
    long countBySprintIdAndStatus(@Param("sprintId") Long sprintId, @Param("status") TaskStatus status);

    @Query("SELECT COALESCE(SUM(t.storyPoints), 0) FROM Task t WHERE t.sprint.id = :sprintId")
    int sumPointsBySprintId(@Param("sprintId") Long sprintId);

    @Query("SELECT COALESCE(SUM(t.storyPoints), 0) FROM Task t WHERE t.sprint.id = :sprintId AND t.status = :status")
    int sumPointsBySprintIdAndStatus(@Param("sprintId") Long sprintId, @Param("status") TaskStatus status);

    // Batch queries for dashboard stats (N+1 fix)
    @Query("SELECT COUNT(t) FROM Task t WHERE t.project.id IN :projectIds AND t.status = :status")
    long countByProjectIdsAndStatus(@Param("projectIds") List<Long> projectIds, @Param("status") TaskStatus status);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.assignee.id = :userId AND t.status <> com.example.taskmanagerpro.model.enums.TaskStatus.DONE")
    long countAssignedToUserOpen(@Param("userId") Long userId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.parent.id = :parentId")
    long countByParentId(@Param("parentId") Long parentId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.parent.id = :parentId AND t.status = :status")
    long countByParentIdAndStatus(@Param("parentId") Long parentId, @Param("status") TaskStatus status);
}
