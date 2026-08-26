package com.clec.economy.crisis.persistence;

import com.clec.economy.crisis.domain.PolicyAction;
import com.clec.economy.crisis.domain.PolicyActionType;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "policy_actions")
public class PolicyActionEntity {
    @Id @Column(length = 36) private String id;
    @Column(name = "session_id", nullable = false, length = 36) private String sessionId;
    @Enumerated(EnumType.STRING) @Column(name = "action_type", nullable = false, length = 40) private PolicyActionType actionType;
    @Column(nullable = false, length = 120) private String authority;
    @Column(nullable = false) private double scale;
    @Column(name = "resource_commitment", nullable = false) private double resourceCommitment;
    @Column(nullable = false) private double credibility;
    @Column(nullable = false) private double coverage;
    @Column(name = "submitted_tick", nullable = false) private long submittedTick;
    @Column(name = "activation_tick", nullable = false) private long activationTick;
    @Column(name = "end_tick", nullable = false) private long endTick;
    @Column(name = "conditions_text", columnDefinition = "TEXT") private String conditions;
    @Column(name = "source_directive_id", length = 120) private String sourceDirectiveId;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected PolicyActionEntity() { }

    public PolicyActionEntity(String id, String sessionId, PolicyActionType actionType, String authority,
                              double scale, double resourceCommitment, double credibility, double coverage,
                              long submittedTick, long activationTick, long endTick, String conditions,
                              String sourceDirectiveId, Instant createdAt) {
        this.id = id; this.sessionId = sessionId; this.actionType = actionType; this.authority = authority;
        this.scale = scale; this.resourceCommitment = resourceCommitment; this.credibility = credibility;
        this.coverage = coverage; this.submittedTick = submittedTick; this.activationTick = activationTick;
        this.endTick = endTick; this.conditions = conditions; this.sourceDirectiveId = sourceDirectiveId;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public PolicyAction toDomain() {
        return new PolicyAction(id, actionType, scale, resourceCommitment, credibility, coverage,
                activationTick, endTick);
    }
}
