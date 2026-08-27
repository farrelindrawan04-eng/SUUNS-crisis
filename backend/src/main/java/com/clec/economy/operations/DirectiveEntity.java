package com.clec.economy.operations;

import javax.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "directives")
public class DirectiveEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "session_id", nullable = false, length = 36) private String sessionId;
    @Column(name = "delegate_id", nullable = false, length = 36) private String delegateId;
    @Column(nullable = false, length = 180) private String title;
    @Column(nullable = false, columnDefinition = "TEXT") private String body;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private DirectivePriority priority;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 24) private DirectiveStatus status;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "last_action_by", length = 36) private String lastActionBy;

    protected DirectiveEntity() { }
    public DirectiveEntity(String id, String sessionId, String delegateId, String title, String body,
                           DirectivePriority priority, Instant now) {
        this.id = id; this.sessionId = sessionId; this.delegateId = delegateId; this.title = title;
        this.body = body; this.priority = priority; this.status = DirectiveStatus.SUBMITTED;
        this.createdAt = now; this.updatedAt = now;
    }
    public void updateStatus(DirectiveStatus value, String actorId, Instant now) { status = value; lastActionBy = actorId; updatedAt = now; }
    public void touch(Instant now) { updatedAt = now; }
    public String getId() { return id; }
    public String getSessionId() { return sessionId; }
    public String getDelegateId() { return delegateId; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public DirectivePriority getPriority() { return priority; }
    public DirectiveStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getLastActionBy() { return lastActionBy; }
}
