package com.clec.economy.domain;

public final class ProductionRule {
    private final String name;
    private final ResourceLedger inputs;
    private final ResourceLedger outputs;

    private ProductionRule(String name, ResourceLedger inputs, ResourceLedger outputs) {
        this.name = name;
        this.inputs = inputs.copy();
        this.outputs = outputs.copy();
    }

    public static ProductionRule fixed(String name, ResourceLedger inputs, ResourceLedger outputs) {
        return new ProductionRule(name, inputs, outputs);
    }

    public String name() {
        return name;
    }

    public boolean applyTo(EconomicUnit unit) {
        if (!unit.resources().containsAtLeast(inputs)) {
            return false;
        }

        unit.resources().subtractAll(inputs);
        unit.resources().addAll(outputs);
        return true;
    }
}
