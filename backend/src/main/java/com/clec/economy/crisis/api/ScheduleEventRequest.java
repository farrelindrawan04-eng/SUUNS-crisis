package com.clec.economy.crisis.api;

import com.clec.economy.crisis.domain.CrisisEventType;

public class ScheduleEventRequest {
    private CrisisEventType eventType;
    private double magnitude = 1.0;
    private int delay;
    private int duration = 1;
    private String description;

    public CrisisEventType getEventType() { return eventType; }
    public void setEventType(CrisisEventType eventType) { this.eventType = eventType; }
    public double getMagnitude() { return magnitude; }
    public void setMagnitude(double magnitude) { this.magnitude = magnitude; }
    public int getDelay() { return delay; }
    public void setDelay(int delay) { this.delay = delay; }
    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
