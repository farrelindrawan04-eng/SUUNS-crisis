package com.clec.economy.crisis.persistence;

import com.clec.economy.crisis.track.TrackDirection;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "scenario_tracks")
public class ScenarioTrackEntity {
    @Id @Column(length = 36) private String id;
    @Column(nullable = false, length = 160) private String name;
    @Column(nullable = false, columnDefinition = "TEXT") private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private TrackDirection direction;
    @Column(nullable = false) private double intensity;
    @Column(name = "duration_ticks", nullable = false) private int durationTicks;
    @Column(name = "config_json", nullable = false, columnDefinition = "TEXT") private String configJson;
    @Column(name = "built_in", nullable = false) private boolean builtIn;
    @Column(name = "created_by", length = 36) private String createdBy;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected ScenarioTrackEntity() { }

    public ScenarioTrackEntity(String id, String name, String description, TrackDirection direction,
                               double intensity, int durationTicks, String configJson, boolean builtIn,
                               String createdBy, Instant createdAt) {
        this.id = id; this.name = name; this.description = description; this.direction = direction;
        this.intensity = intensity; this.durationTicks = durationTicks; this.configJson = configJson;
        this.builtIn = builtIn; this.createdBy = createdBy; this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public TrackDirection getDirection() { return direction; }
    public double getIntensity() { return intensity; }
    public int getDurationTicks() { return durationTicks; }
    public String getConfigJson() { return configJson; }
    public boolean isBuiltIn() { return builtIn; }
}
