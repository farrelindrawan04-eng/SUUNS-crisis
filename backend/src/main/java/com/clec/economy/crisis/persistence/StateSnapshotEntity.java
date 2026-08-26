package com.clec.economy.crisis.persistence;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "state_snapshots")
public class StateSnapshotEntity {
    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "session_id", nullable = false, length = 36)
    private String sessionId;

    @Column(name = "tick_id", nullable = false, length = 36)
    private String tickId;

    @Column(name = "tick_number", nullable = false)
    private long tickNumber;

    @Column(name = "state_json", nullable = false, columnDefinition = "TEXT")
    private String stateJson;

    @Column(name = "state_hash", nullable = false, length = 64)
    private String stateHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected StateSnapshotEntity() {
    }

    public StateSnapshotEntity(String id, String sessionId, String tickId, String stateJson,
                               String stateHash, Instant createdAt) {
        this(id, sessionId, tickId, 0, stateJson, stateHash, createdAt);
    }

    public StateSnapshotEntity(String id, String sessionId, String tickId, long tickNumber,
                               String stateJson, String stateHash, Instant createdAt) {
        this.id = id;
        this.sessionId = sessionId;
        this.tickId = tickId;
        this.tickNumber = tickNumber;
        this.stateJson = stateJson;
        this.stateHash = stateHash;
        this.createdAt = createdAt;
    }

    public String getStateJson() { return stateJson; }
    public String getStateHash() { return stateHash; }
}
