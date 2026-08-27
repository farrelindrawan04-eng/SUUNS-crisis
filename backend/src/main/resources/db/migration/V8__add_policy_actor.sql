ALTER TABLE policy_actions ADD COLUMN submitted_by VARCHAR(36);
ALTER TABLE policy_actions ADD CONSTRAINT fk_policy_submitted_by FOREIGN KEY (submitted_by) REFERENCES staff_users(id);
CREATE INDEX idx_policy_source_directive ON policy_actions(source_directive_id);
