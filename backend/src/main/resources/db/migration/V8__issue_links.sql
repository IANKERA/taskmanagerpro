-- M18: Issue linking (blocks / is-blocked-by / relates-to)
CREATE TABLE issue_links (
    id          BIGSERIAL PRIMARY KEY,
    source_id   BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    target_id   BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    link_type   VARCHAR(32) NOT NULL,  -- BLOCKS, IS_BLOCKED_BY, RELATES_TO, DUPLICATES, IS_DUPLICATED_BY
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_issue_link UNIQUE (source_id, target_id, link_type),
    CONSTRAINT chk_no_self_link CHECK (source_id <> target_id)
);

CREATE INDEX idx_issue_links_source ON issue_links(source_id);
CREATE INDEX idx_issue_links_target ON issue_links(target_id);
