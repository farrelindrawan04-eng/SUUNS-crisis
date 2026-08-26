package com.clec.economy.crisis.domain;

public class EngineState {
    private long tick;
    private long simulationTimeMinutes;
    private PublicIndicators publicIndicators;
    private HiddenVariables hiddenVariables;

    public EngineState() {
    }

    public EngineState(long tick, long simulationTimeMinutes, PublicIndicators publicIndicators,
                       HiddenVariables hiddenVariables) {
        this.tick = tick;
        this.simulationTimeMinutes = simulationTimeMinutes;
        this.publicIndicators = publicIndicators;
        this.hiddenVariables = hiddenVariables;
    }

    public long getTick() { return tick; }
    public long getSimulationTimeMinutes() { return simulationTimeMinutes; }
    public PublicIndicators getPublicIndicators() { return publicIndicators; }
    public HiddenVariables getHiddenVariables() { return hiddenVariables; }
}
