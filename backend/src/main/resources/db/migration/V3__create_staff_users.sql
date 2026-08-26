CREATE TABLE staff_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(120) NOT NULL,
    display_name VARCHAR(160) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    enabled BOOLEAN NOT NULL,
    created_by VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uq_staff_users_username UNIQUE (username),
    CONSTRAINT fk_staff_users_creator FOREIGN KEY (created_by) REFERENCES staff_users(id)
);

CREATE INDEX idx_staff_users_role ON staff_users(role);
