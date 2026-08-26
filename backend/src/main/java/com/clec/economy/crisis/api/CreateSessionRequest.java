package com.clec.economy.crisis.api;

public class CreateSessionRequest {
    private String name;
    private Long seed;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Long getSeed() { return seed; }
    public void setSeed(Long seed) { this.seed = seed; }
}
