CREATE TABLE policy_actions (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    action_type VARCHAR(40) NOT NULL,
    authority VARCHAR(120) NOT NULL,
    scale DOUBLE PRECISION NOT NULL,
    resource_commitment DOUBLE PRECISION NOT NULL,
    credibility DOUBLE PRECISION NOT NULL,
    coverage DOUBLE PRECISION NOT NULL,
    submitted_tick BIGINT NOT NULL,
    activation_tick BIGINT NOT NULL,
    end_tick BIGINT NOT NULL,
    conditions_text TEXT,
    source_directive_id VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_policy_session FOREIGN KEY (session_id) REFERENCES simulation_sessions(id)
);

CREATE TABLE crisis_events (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    magnitude DOUBLE PRECISION NOT NULL,
    activation_tick BIGINT NOT NULL,
    end_tick BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_event_session FOREIGN KEY (session_id) REFERENCES simulation_sessions(id)
);

CREATE TABLE causal_entries (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    tick_id VARCHAR(36) NOT NULL,
    tick_number BIGINT NOT NULL,
    stage VARCHAR(48) NOT NULL,
    sequence_number INTEGER NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    source_id VARCHAR(36),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_causal_session FOREIGN KEY (session_id) REFERENCES simulation_sessions(id),
    CONSTRAINT fk_causal_tick FOREIGN KEY (tick_id) REFERENCES ticks(id),
    CONSTRAINT uq_causal_tick_sequence UNIQUE (tick_id, sequence_number)
);

CREATE INDEX idx_policy_session_activation ON policy_actions(session_id, activation_tick, end_tick);
CREATE INDEX idx_event_session_activation ON crisis_events(session_id, activation_tick, end_tick);
CREATE INDEX idx_causal_session_tick ON causal_entries(session_id, tick_number);
