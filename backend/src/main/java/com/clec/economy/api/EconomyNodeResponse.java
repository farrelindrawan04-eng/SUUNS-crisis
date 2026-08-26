package com.clec.economy.api;

import java.util.List;
import java.util.Map;

public final class EconomyNodeResponse {
    private final String id;
    private final String name;
    private final String type;
    private final Map<String, Double> resources;
    private final Map<String, Double> recursiveTotals;
    private final List<EconomyNodeResponse> children;

    public EconomyNodeResponse(
            String id,
            String name,
            String type,
            Map<String, Double> resources,
            Map<String, Double> recursiveTotals,
            List<EconomyNodeResponse> children
    ) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.resources = resources;
        this.recursiveTotals = recursiveTotals;
        this.children = children;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public Map<String, Double> getResources() {
        return resources;
    }

    public Map<String, Double> getRecursiveTotals() {
        return recursiveTotals;
    }

    public List<EconomyNodeResponse> getChildren() {
        return children;
    }
}
