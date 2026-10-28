package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.IssueLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IssueLinkRepository extends JpaRepository<IssueLink, Long> {

    @Query("""
        SELECT l FROM IssueLink l
        LEFT JOIN FETCH l.source
        LEFT JOIN FETCH l.target
        WHERE l.source.id = :taskId OR l.target.id = :taskId
        ORDER BY l.createdAt
    """)
    List<IssueLink> findByTaskId(@Param("taskId") Long taskId);

    @Query("SELECT COUNT(l) > 0 FROM IssueLink l WHERE l.source.id = :srcId AND l.target.id = :tgtId AND l.linkType = :type")
    boolean existsLink(@Param("srcId") Long srcId, @Param("tgtId") Long tgtId,
                       @Param("type") com.example.taskmanagerpro.model.enums.LinkType type);
}
