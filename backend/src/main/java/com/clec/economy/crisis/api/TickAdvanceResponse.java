package com.clec.economy.crisis.api;

import com.clec.economy.crisis.engine.CausalRecord;
import java.util.List;

public class TickAdvanceResponse {
    private final SessionStateResponse session;
    private final List<CausalRecord> causalRecords;

    public TickAdvanceResponse(SessionStateResponse session, List<CausalRecord> causalRecords) {
        this.session = session;
        this.causalRecords = causalRecords;
    }

    public SessionStateResponse getSession() { return session; }
    public List<CausalRecord> getCausalRecords() { return causalRecords; }
}
