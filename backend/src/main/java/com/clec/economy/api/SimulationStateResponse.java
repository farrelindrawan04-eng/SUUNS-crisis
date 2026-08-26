package com.clec.economy.api;

import java.util.Map;

public final class SimulationStateResponse {
    private final long tick;
    private final EconomyNodeResponse root;
    private final Map<String, Double> totals;

    public SimulationStateResponse(long tick, EconomyNodeResponse root, Map<String, Double> totals) {
        this.tick = tick;
        this.root = root;
        this.totals = totals;
    }

    public long getTick() {
        return tick;
    }

    public EconomyNodeResponse getRoot() {
        return root;
    }

    public Map<String, Double> getTotals() {
        return totals;
    }
}
