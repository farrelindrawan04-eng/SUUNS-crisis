CREATE TABLE scenario_tracks (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    direction VARCHAR(32) NOT NULL,
    intensity DOUBLE PRECISION NOT NULL,
    duration_ticks INTEGER NOT NULL,
    config_json TEXT NOT NULL,
    built_in BOOLEAN NOT NULL,
    created_by VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_track_creator FOREIGN KEY (created_by) REFERENCES staff_users(id)
);

ALTER TABLE simulation_sessions ADD COLUMN track_id VARCHAR(36);
ALTER TABLE simulation_sessions ADD CONSTRAINT fk_session_track FOREIGN KEY (track_id) REFERENCES scenario_tracks(id);

CREATE INDEX idx_tracks_created_at ON scenario_tracks(created_at);
CREATE INDEX idx_sessions_track ON simulation_sessions(track_id);
