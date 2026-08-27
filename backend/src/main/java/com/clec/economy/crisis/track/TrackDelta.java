package com.clec.economy.crisis.track;

import java.util.LinkedHashMap;
import java.util.Map;

public class TrackDelta {
    private Map<String, Double> publicIndicators = new LinkedHashMap<>();
    private Map<String, Double> hiddenVariables = new LinkedHashMap<>();

    public TrackDelta() { }

    public TrackDelta(Map<String, Double> publicIndicators, Map<String, Double> hiddenVariables) {
        this.publicIndicators = publicIndicators;
        this.hiddenVariables = hiddenVariables;
    }

    public Map<String, Double> getPublicIndicators() { return publicIndicators; }
    public Map<String, Double> getHiddenVariables() { return hiddenVariables; }
}
