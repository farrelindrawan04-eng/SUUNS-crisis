CREATE TABLE delegate_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    title VARCHAR(160) NOT NULL,
    organization VARCHAR(160) NOT NULL,
    brief TEXT,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_delegate_profiles_user UNIQUE (user_id),
    CONSTRAINT fk_delegate_profile_user FOREIGN KEY (user_id) REFERENCES staff_users(id),
    CONSTRAINT fk_delegate_profile_session FOREIGN KEY (session_id) REFERENCES simulation_sessions(id),
    CONSTRAINT fk_delegate_profile_creator FOREIGN KEY (created_by) REFERENCES staff_users(id)
);

CREATE TABLE directives (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    delegate_id VARCHAR(36) NOT NULL,
    title VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(24) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_directive_session FOREIGN KEY (session_id) REFERENCES simulation_sessions(id),
    CONSTRAINT fk_directive_delegate FOREIGN KEY (delegate_id) REFERENCES delegate_profiles(id)
);

CREATE TABLE directive_messages (
    id VARCHAR(36) PRIMARY KEY,
    directive_id VARCHAR(36) NOT NULL,
    author_user_id VARCHAR(36) NOT NULL,
    direction VARCHAR(24) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_directive_message_directive FOREIGN KEY (directive_id) REFERENCES directives(id),
    CONSTRAINT fk_directive_message_author FOREIGN KEY (author_user_id) REFERENCES staff_users(id)
);

CREATE INDEX idx_delegate_profiles_session ON delegate_profiles(session_id);
CREATE INDEX idx_directives_session_updated ON directives(session_id, updated_at);
CREATE INDEX idx_directive_messages_directive_created ON directive_messages(directive_id, created_at);
