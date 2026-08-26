CREATE TABLE simulation_sessions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    status VARCHAR(24) NOT NULL,
    current_tick BIGINT NOT NULL,
    tick_minutes INTEGER NOT NULL,
    deterministic_seed BIGINT NOT NULL,
    engine_version VARCHAR(40) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE ticks (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    tick_number BIGINT NOT NULL,
    simulation_time_minutes BIGINT NOT NULL,
    random_seed BIGINT NOT NULL,
    previous_state_hash VARCHAR(64),
    result_state_hash VARCHAR(64) NOT NULL,
    engine_version VARCHAR(40) NOT NULL,
    committed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_ticks_session FOREIGN KEY (session_id) REFERENCES simulation_sessions(id),
    CONSTRAINT uq_ticks_session_number UNIQUE (session_id, tick_number)
);

CREATE TABLE state_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    tick_id VARCHAR(36) NOT NULL,
    tick_number BIGINT NOT NULL,
    state_json TEXT NOT NULL,
    state_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_snapshots_session FOREIGN KEY (session_id) REFERENCES simulation_sessions(id),
    CONSTRAINT fk_snapshots_tick FOREIGN KEY (tick_id) REFERENCES ticks(id),
    CONSTRAINT uq_snapshots_session_tick UNIQUE (session_id, tick_number)
);

CREATE INDEX idx_ticks_session ON ticks(session_id);
CREATE INDEX idx_snapshots_session ON state_snapshots(session_id);
