package com.clec.economy.auth;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "staff_users")
public class StaffUserEntity {
    @Id @Column(length = 36) private String id;
    @Column(nullable = false, unique = true, length = 120) private String username;
    @Column(name = "display_name", nullable = false, length = 160) private String displayName;
    @Column(name = "password_hash", nullable = false, length = 100) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private StaffRole role;
    @Column(nullable = false) private boolean enabled;
    @Column(name = "created_by", length = 36) private String createdBy;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected StaffUserEntity() { }

    public StaffUserEntity(String id, String username, String displayName, String passwordHash,
                           StaffRole role, boolean enabled, String createdBy, Instant createdAt) {
        this.id = id;
        this.username = username;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.role = role;
        this.enabled = enabled;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getDisplayName() { return displayName; }
    public String getPasswordHash() { return passwordHash; }
    public StaffRole getRole() { return role; }
    public boolean isEnabled() { return enabled; }
    public Instant getCreatedAt() { return createdAt; }
}
