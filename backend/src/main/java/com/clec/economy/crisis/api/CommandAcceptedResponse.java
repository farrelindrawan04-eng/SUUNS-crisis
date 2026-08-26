package com.clec.economy.crisis.api;

public class CommandAcceptedResponse {
    private final String id;
    private final long activationTick;
    private final long endTick;

    public CommandAcceptedResponse(String id, long activationTick, long endTick) {
        this.id = id;
        this.activationTick = activationTick;
        this.endTick = endTick;
    }

    public String getId() { return id; }
    public long getActivationTick() { return activationTick; }
    public long getEndTick() { return endTick; }
}
