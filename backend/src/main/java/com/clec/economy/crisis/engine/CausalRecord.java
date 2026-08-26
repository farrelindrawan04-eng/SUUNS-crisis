package com.clec.economy.crisis.engine;

public class CausalRecord {
    private final TickStage stage;
    private final String sourceType;
    private final String sourceId;
    private final String message;

    public CausalRecord(TickStage stage, String sourceType, String sourceId, String message) {
        this.stage = stage;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.message = message;
    }

    public TickStage getStage() { return stage; }
    public String getSourceType() { return sourceType; }
    public String getSourceId() { return sourceId; }
    public String getMessage() { return message; }
}
