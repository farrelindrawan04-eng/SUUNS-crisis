package com.clec.economy.crisis.persistence;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "ticks")
public class TickEntity {
    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "session_id", nullable = false, length = 36)
    private String sessionId;

    @Column(name = "tick_number", nullable = false)
    private long tickNumber;

    @Column(name = "simulation_time_minutes", nullable = false)
    private long simulationTimeMinutes;

    @Column(name = "random_seed", nullable = false)
    private long randomSeed;

    @Column(name = "previous_state_hash", length = 64)
    private String previousStateHash;

    @Column(name = "result_state_hash", nullable = false, length = 64)
    private String resultStateHash;

    @Column(name = "engine_version", nullable = false, length = 40)
    private String engineVersion;

    @Column(name = "committed_at", nullable = false)
    private Instant committedAt;

    protected TickEntity() {
    }

    public TickEntity(String id, String sessionId, long randomSeed, String resultStateHash, Instant committedAt) {
        this(id, sessionId, 0, 0, randomSeed, null, resultStateHash, committedAt);
    }

    public TickEntity(String id, String sessionId, long tickNumber, long simulationTimeMinutes,
                      long randomSeed, String previousStateHash, String resultStateHash, Instant committedAt) {
        this.id = id;
        this.sessionId = sessionId;
        this.tickNumber = tickNumber;
        this.simulationTimeMinutes = simulationTimeMinutes;
        this.randomSeed = randomSeed;
        this.previousStateHash = previousStateHash;
        this.resultStateHash = resultStateHash;
        this.engineVersion = "0.1.0";
        this.committedAt = committedAt;
    }

    public String getId() { return id; }
}
