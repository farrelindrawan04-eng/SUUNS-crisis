package com.clec.economy.crisis.persistence;

import com.clec.economy.crisis.domain.CrisisEvent;
import com.clec.economy.crisis.domain.CrisisEventType;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "crisis_events")
public class CrisisEventEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "session_id", nullable = false, length = 36) private String sessionId;
    @Enumerated(EnumType.STRING) @Column(name = "event_type", nullable = false, length = 40) private CrisisEventType eventType;
    @Column(nullable = false) private double magnitude;
    @Column(name = "activation_tick", nullable = false) private long activationTick;
    @Column(name = "end_tick", nullable = false) private long endTick;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected CrisisEventEntity() { }

    public CrisisEventEntity(String id, String sessionId, CrisisEventType eventType, double magnitude,
                             long activationTick, long endTick, String description, Instant createdAt) {
        this.id = id; this.sessionId = sessionId; this.eventType = eventType; this.magnitude = magnitude;
        this.activationTick = activationTick; this.endTick = endTick; this.description = description;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public CrisisEvent toDomain() { return new CrisisEvent(id, eventType, magnitude, activationTick, endTick); }
}
