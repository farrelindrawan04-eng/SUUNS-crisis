package com.clec.economy.operations;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "delegate_profiles")
public class DelegateProfileEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "user_id", nullable = false, unique = true, length = 36) private String userId;
    @Column(name = "session_id", nullable = false, length = 36) private String sessionId;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 160) private String organization;
    @Column(columnDefinition = "TEXT") private String brief;
    @Column(name = "created_by", nullable = false, length = 36) private String createdBy;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected DelegateProfileEntity() { }
    public DelegateProfileEntity(String id, String userId, String sessionId, String title,
                                 String organization, String brief, String createdBy, Instant createdAt) {
        this.id = id; this.userId = userId; this.sessionId = sessionId; this.title = title;
        this.organization = organization; this.brief = brief; this.createdBy = createdBy; this.createdAt = createdAt;
    }
    public String getId() { return id; }
    public String getUserId() { return userId; }
    public String getSessionId() { return sessionId; }
    public String getTitle() { return title; }
    public String getOrganization() { return organization; }
    public String getBrief() { return brief; }
    public Instant getCreatedAt() { return createdAt; }
}
