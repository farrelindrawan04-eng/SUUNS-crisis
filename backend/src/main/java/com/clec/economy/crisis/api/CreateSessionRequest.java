package com.clec.economy.crisis.api;

public class CreateSessionRequest {
    private String name;
    private Long seed;
    private String trackId;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getSeed() { return seed; }
    public void setSeed(Long seed) { this.seed = seed; }
    public String getTrackId() { return trackId; }
    public void setTrackId(String trackId) { this.trackId = trackId; }
}
