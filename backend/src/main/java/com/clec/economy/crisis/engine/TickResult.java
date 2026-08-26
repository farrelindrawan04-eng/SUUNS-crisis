package com.clec.economy.crisis.engine;

import com.clec.economy.crisis.domain.EngineState;

import java.util.List;

public class TickResult {
    private final EngineState state;
    private final List<CausalRecord> causalRecords;

    public TickResult(EngineState state, List<CausalRecord> causalRecords) {
        this.state = state;
        this.causalRecords = causalRecords;
    }

    public EngineState getState() { return state; }
    public List<CausalRecord> getCausalRecords() { return causalRecords; }
}
