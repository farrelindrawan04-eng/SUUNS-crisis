ALTER TABLE directives ADD COLUMN last_action_by VARCHAR(36);
ALTER TABLE directives ADD CONSTRAINT fk_directive_last_actor FOREIGN KEY (last_action_by) REFERENCES staff_users(id);

ALTER TABLE public_feed_cards ADD COLUMN updated_by VARCHAR(36);
ALTER TABLE public_feed_cards ADD CONSTRAINT fk_public_feed_updater FOREIGN KEY (updated_by) REFERENCES staff_users(id);
