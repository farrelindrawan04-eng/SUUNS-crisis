package com.clec.economy.crisis.api;

import com.clec.economy.crisis.domain.EngineState;
import com.clec.economy.crisis.persistence.SessionStatus;

public class SessionStateResponse {
    private final String id;
    private final String name;
    private final SessionStatus status;
    private final long deterministicSeed;
    private final String engineVersion;
    private final EngineState state;

    public SessionStateResponse(String id, String name, SessionStatus status, long deterministicSeed,
                                String engineVersion, EngineState state) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.deterministicSeed = deterministicSeed;
        this.engineVersion = engineVersion;
        this.state = state;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public SessionStatus getStatus() { return status; }
    public long getDeterministicSeed() { return deterministicSeed; }
    public String getEngineVersion() { return engineVersion; }
    public EngineState getState() { return state; }
}
