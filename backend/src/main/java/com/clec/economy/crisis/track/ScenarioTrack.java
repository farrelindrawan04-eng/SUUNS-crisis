package com.clec.economy.crisis.track;

import java.util.ArrayList;
import java.util.List;

public class ScenarioTrack {
    private String id;
    private String name;
    private String description;
    private TrackDirection direction;
    private double intensity;
    private int durationTicks;
    private boolean builtIn;
    private List<TrackPhase> phases = new ArrayList<>();

    public ScenarioTrack() { }

    public ScenarioTrack(String id, String name, String description, TrackDirection direction,
                         double intensity, int durationTicks, boolean builtIn, List<TrackPhase> phases) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.direction = direction;
        this.intensity = intensity;
        this.durationTicks = durationTicks;
        this.builtIn = builtIn;
        this.phases = phases;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public TrackDirection getDirection() { return direction; }
    public double getIntensity() { return intensity; }
    public int getDurationTicks() { return durationTicks; }
    public boolean isBuiltIn() { return builtIn; }
    public List<TrackPhase> getPhases() { return phases; }

    public TrackPhase phaseAt(long tick) {
        return phases.stream().filter(phase -> phase.includes(tick)).findFirst().orElse(null);
    }
}
