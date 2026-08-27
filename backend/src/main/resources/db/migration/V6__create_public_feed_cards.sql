CREATE TABLE public_feed_cards (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    headline VARCHAR(180) NOT NULL,
    summary TEXT NOT NULL,
    category VARCHAR(40) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_public_feed_session FOREIGN KEY (session_id) REFERENCES simulation_sessions(id),
    CONSTRAINT fk_public_feed_creator FOREIGN KEY (created_by) REFERENCES staff_users(id)
);

CREATE INDEX idx_public_feed_session_published ON public_feed_cards(session_id, published_at);
