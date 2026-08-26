package com.clec.economy.crisis.persistence;

import com.clec.economy.crisis.engine.CausalRecord;
import com.clec.economy.crisis.engine.TickStage;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "causal_entries")
public class CausalEntryEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "session_id", nullable = false, length = 36) private String sessionId;
    @Column(name = "tick_id", nullable = false, length = 36) private String tickId;
    @Column(name = "tick_number", nullable = false) private long tickNumber;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 48) private TickStage stage;
    @Column(name = "sequence_number", nullable = false) private int sequenceNumber;
    @Column(name = "source_type", nullable = false, length = 32) private String sourceType;
    @Column(name = "source_id", length = 36) private String sourceId;
    @Column(nullable = false, columnDefinition = "TEXT") private String message;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected CausalEntryEntity() { }

    public CausalEntryEntity(String id, String sessionId, String tickId, long tickNumber,
                             int sequenceNumber, CausalRecord record, Instant createdAt) {
        this.id = id; this.sessionId = sessionId; this.tickId = tickId; this.tickNumber = tickNumber;
        this.stage = record.getStage(); this.sequenceNumber = sequenceNumber;
        this.sourceType = record.getSourceType(); this.sourceId = record.getSourceId();
        this.message = record.getMessage(); this.createdAt = createdAt;
    }

    public TickStage getStage() { return stage; }
    public int getSequenceNumber() { return sequenceNumber; }
    public String getSourceType() { return sourceType; }
    public String getSourceId() { return sourceId; }
    public String getMessage() { return message; }
}
