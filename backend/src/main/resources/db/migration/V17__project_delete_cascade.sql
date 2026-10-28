-- Add ON DELETE CASCADE to all project_id and task_id foreign keys

-- Tables referencing projects
ALTER TABLE tasks DROP CONSTRAINT tasks_project_id_fkey,
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_memberships DROP CONSTRAINT project_memberships_project_id_fkey,
    ADD CONSTRAINT project_memberships_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE labels DROP CONSTRAINT labels_project_id_fkey,
    ADD CONSTRAINT labels_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE sprints DROP CONSTRAINT sprints_project_id_fkey,
    ADD CONSTRAINT sprints_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE custom_field_definitions DROP CONSTRAINT custom_field_definitions_project_id_fkey,
    ADD CONSTRAINT custom_field_definitions_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE issue_templates DROP CONSTRAINT issue_templates_project_id_fkey,
    ADD CONSTRAINT issue_templates_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE recurring_rules DROP CONSTRAINT recurring_rules_project_id_fkey,
    ADD CONSTRAINT recurring_rules_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE workflow_rules DROP CONSTRAINT workflow_rules_project_id_fkey,
    ADD CONSTRAINT workflow_rules_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Tables referencing tasks
ALTER TABLE comments DROP CONSTRAINT comments_task_id_fkey,
    ADD CONSTRAINT comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE attachments DROP CONSTRAINT attachments_task_id_fkey,
    ADD CONSTRAINT attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE activity_log DROP CONSTRAINT activity_log_task_id_fkey,
    ADD CONSTRAINT activity_log_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE notifications DROP CONSTRAINT notifications_task_id_fkey,
    ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE custom_field_values DROP CONSTRAINT custom_field_values_task_id_fkey,
    ADD CONSTRAINT custom_field_values_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE time_logs DROP CONSTRAINT time_logs_task_id_fkey,
    ADD CONSTRAINT time_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE issue_links DROP CONSTRAINT issue_links_source_id_fkey,
    ADD CONSTRAINT issue_links_source_id_fkey FOREIGN KEY (source_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE issue_links DROP CONSTRAINT issue_links_target_id_fkey,
    ADD CONSTRAINT issue_links_target_id_fkey FOREIGN KEY (target_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_labels DROP CONSTRAINT task_labels_task_id_fkey,
    ADD CONSTRAINT task_labels_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE task_labels DROP CONSTRAINT task_labels_label_id_fkey,
    ADD CONSTRAINT task_labels_label_id_fkey FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE;

ALTER TABLE watchers DROP CONSTRAINT watchers_task_id_fkey,
    ADD CONSTRAINT watchers_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Self-referencing parent tasks
ALTER TABLE tasks DROP CONSTRAINT tasks_parent_id_fkey,
    ADD CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE;
