package com.clec.economy.crisis.api;

import com.clec.economy.crisis.track.TrackDirection;

public class CreateTrackRequest {
    private String name;
    private String description;
    private TrackDirection direction;
    private double intensity = 1.0;
    private int durationTicks = 36;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TrackDirection getDirection() { return direction; }
    public void setDirection(TrackDirection direction) { this.direction = direction; }
    public double getIntensity() { return intensity; }
    public void setIntensity(double intensity) { this.intensity = intensity; }
    public int getDurationTicks() { return durationTicks; }
    public void setDurationTicks(int durationTicks) { this.durationTicks = durationTicks; }
}
