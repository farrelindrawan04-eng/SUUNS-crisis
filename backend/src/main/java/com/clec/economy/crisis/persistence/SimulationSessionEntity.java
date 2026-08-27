package com.clec.economy.crisis.persistence;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "simulation_sessions")
public class SimulationSessionEntity {
    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 160)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private SessionStatus status;

    @Column(name = "current_tick", nullable = false)
    private long currentTick;

    @Column(name = "tick_minutes", nullable = false)
    private int tickMinutes;

    @Column(name = "deterministic_seed", nullable = false)
    private long deterministicSeed;

    @Column(name = "engine_version", nullable = false, length = 40)
    private String engineVersion;

    @Column(name = "track_id", length = 36)
    private String trackId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SimulationSessionEntity() {
    }

    public SimulationSessionEntity(String id, String name, long deterministicSeed, Instant now) {
        this(id, name, deterministicSeed, null, now);
    }

    public SimulationSessionEntity(String id, String name, long deterministicSeed, String trackId, Instant now) {
        this.id = id;
        this.name = name;
        this.status = SessionStatus.READY;
        this.currentTick = 0;
        this.tickMinutes = 5;
        this.deterministicSeed = deterministicSeed;
        this.engineVersion = "0.1.0";
        this.trackId = trackId;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public SessionStatus getStatus() { return status; }
    public long getCurrentTick() { return currentTick; }
    public int getTickMinutes() { return tickMinutes; }
    public long getDeterministicSeed() { return deterministicSeed; }
    public String getEngineVersion() { return engineVersion; }
    public String getTrackId() { return trackId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void commitTick(long tick, Instant now) {
        this.currentTick = tick;
        this.status = SessionStatus.RUNNING;
        this.updatedAt = now;
    }
}
