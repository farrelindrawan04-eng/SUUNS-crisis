package com.clec.economy.crisis.domain;

public class CrisisEvent {
    private final String id;
    private final CrisisEventType type;
    private final double magnitude;
    private final long activationTick;
    private final long endTick;

    public CrisisEvent(String id, CrisisEventType type, double magnitude, long activationTick, long endTick) {
        this.id = id;
        this.type = type;
        this.magnitude = magnitude;
        this.activationTick = activationTick;
        this.endTick = endTick;
    }

    public String getId() { return id; }
    public CrisisEventType getType() { return type; }
    public double getMagnitude() { return magnitude; }
    public long getActivationTick() { return activationTick; }
    public long getEndTick() { return endTick; }
    public boolean isActive(long tick) { return tick >= activationTick && tick <= endTick; }
}
