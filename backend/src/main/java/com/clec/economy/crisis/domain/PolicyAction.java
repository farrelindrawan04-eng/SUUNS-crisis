package com.clec.economy.crisis.domain;

public class PolicyAction {
    private final String id;
    private final PolicyActionType type;
    private final double scale;
    private final double resourceCommitment;
    private final double credibility;
    private final double coverage;
    private final long activationTick;
    private final long endTick;

    public PolicyAction(String id, PolicyActionType type, double scale, double resourceCommitment,
                        double credibility, double coverage, long activationTick, long endTick) {
        this.id = id;
        this.type = type;
        this.scale = scale;
        this.resourceCommitment = resourceCommitment;
        this.credibility = credibility;
        this.coverage = coverage;
        this.activationTick = activationTick;
        this.endTick = endTick;
    }

    public String getId() { return id; }
    public PolicyActionType getType() { return type; }
    public double getScale() { return scale; }
    public double getResourceCommitment() { return resourceCommitment; }
    public double getCredibility() { return credibility; }
    public double getCoverage() { return coverage; }
    public long getActivationTick() { return activationTick; }
    public long getEndTick() { return endTick; }
    public boolean isActive(long tick) { return tick >= activationTick && tick <= endTick; }
    public double effectiveStrength() { return scale * credibility * coverage; }
}
