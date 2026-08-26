package com.clec.economy.domain;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public final class EconomicUnit {
    private final UUID id;
    private final String name;
    private final UnitType type;
    private final ResourceLedger resources;
    private final List<EconomicUnit> children = new ArrayList<>();
    private final List<ProductionRule> productionRules = new ArrayList<>();

    public EconomicUnit(String name, UnitType type, ResourceLedger resources) {
        this.id = UUID.randomUUID();
        this.name = Objects.requireNonNull(name, "name");
        this.type = Objects.requireNonNull(type, "type");
        this.resources = Objects.requireNonNull(resources, "resources");
    }

    public UUID id() {
        return id;
    }

    public String name() {
        return name;
    }

    public UnitType type() {
        return type;
    }

    public ResourceLedger resources() {
        return resources;
    }

    public List<EconomicUnit> children() {
        return Collections.unmodifiableList(children);
    }

    public EconomicUnit addChild(EconomicUnit child) {
        children.add(Objects.requireNonNull(child, "child"));
        return this;
    }

    public EconomicUnit addProductionRule(ProductionRule rule) {
        productionRules.add(Objects.requireNonNull(rule, "rule"));
        return this;
    }

    public void tick() {
        for (ProductionRule rule : productionRules) {
            rule.applyTo(this);
        }
        for (EconomicUnit child : children) {
            child.tick();
        }
    }

    public ResourceLedger totalResources() {
        ResourceLedger total = resources.copy();
        for (EconomicUnit child : children) {
            total.addAll(child.totalResources());
        }
        return total;
    }
}
