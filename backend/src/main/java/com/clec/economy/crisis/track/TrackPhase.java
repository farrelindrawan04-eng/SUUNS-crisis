package com.clec.economy.crisis.track;

public class TrackPhase {
    private int startTick;
    private int endTick;
    private String narrative;
    private TrackDelta perTickDelta;

    public TrackPhase() { }

    public TrackPhase(int startTick, int endTick, String narrative, TrackDelta perTickDelta) {
        this.startTick = startTick;
        this.endTick = endTick;
        this.narrative = narrative;
        this.perTickDelta = perTickDelta;
    }

    public int getStartTick() { return startTick; }
    public int getEndTick() { return endTick; }
    public String getNarrative() { return narrative; }
    public TrackDelta getPerTickDelta() { return perTickDelta; }
    public boolean includes(long tick) { return tick >= startTick && tick <= endTick; }
}
