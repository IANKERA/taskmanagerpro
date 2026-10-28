package com.example.taskmanagerpro.dto;

import com.example.taskmanagerpro.model.enums.LinkType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueLinkDTO {
    private Long id;
    private String linkType;       // e.g. "BLOCKS"
    private String linkLabel;      // e.g. "blocks"
    /** The "other" issue in the relationship (relative to the queried issue). */
    private String issueKey;
    private String title;
    private String status;
    private String issueType;
}
