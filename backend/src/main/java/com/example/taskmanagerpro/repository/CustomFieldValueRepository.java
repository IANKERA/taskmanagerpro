package com.example.taskmanagerpro.repository;

import com.example.taskmanagerpro.model.CustomFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomFieldValueRepository extends JpaRepository<CustomFieldValue, Long> {
    @Query("SELECT v FROM CustomFieldValue v LEFT JOIN FETCH v.field WHERE v.task.id = :taskId ORDER BY v.field.sortOrder")
    List<CustomFieldValue> findByTaskId(@Param("taskId") Long taskId);

    Optional<CustomFieldValue> findByTaskIdAndFieldId(Long taskId, Long fieldId);

    void deleteByFieldId(Long fieldId);
}
