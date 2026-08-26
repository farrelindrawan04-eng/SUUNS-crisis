package com.clec.economy.domain;

import java.util.EnumMap;
import java.util.Map;

public final class ResourceLedger {
    private static final double EPSILON = 0.0000001;

    private final EnumMap<Resource, Double> amounts = new EnumMap<>(Resource.class);

    public static ResourceLedger empty() {
        return new ResourceLedger();
    }

    public static ResourceLedger with(Resource resource, double amount) {
        return empty().plus(resource, amount);
    }

    public ResourceLedger plus(Resource resource, double amount) {
        add(resource, amount);
        return this;
    }

    public void add(Resource resource, double amount) {
        requireNonNegative(amount);
        amounts.merge(resource, amount, Double::sum);
    }

    public void addAll(ResourceLedger other) {
        other.amounts.forEach(this::add);
    }

    public void subtract(Resource resource, double amount) {
        requireNonNegative(amount);
        double current = amountOf(resource);
        if (current + EPSILON < amount) {
            throw new IllegalArgumentException("Not enough " + resource + ": requested " + amount + ", has " + current);
        }

        double next = current - amount;
        if (Math.abs(next) < EPSILON) {
            amounts.remove(resource);
        } else {
            amounts.put(resource, next);
        }
    }

    public void subtractAll(ResourceLedger other) {
        other.amounts.forEach(this::subtract);
    }

    public boolean containsAtLeast(ResourceLedger required) {
        for (Map.Entry<Resource, Double> entry : required.amounts.entrySet()) {
            if (amountOf(entry.getKey()) + EPSILON < entry.getValue()) {
                return false;
            }
        }
        return true;
    }

    public double amountOf(Resource resource) {
        return amounts.getOrDefault(resource, 0.0);
    }

    public Map<Resource, Double> asMap() {
        EnumMap<Resource, Double> copy = new EnumMap<>(Resource.class);
        for (Resource resource : Resource.values()) {
            copy.put(resource, amountOf(resource));
        }
        return copy;
    }

    public ResourceLedger copy() {
        ResourceLedger copy = empty();
        copy.amounts.putAll(amounts);
        return copy;
    }

    private static void requireNonNegative(double amount) {
        if (amount < 0.0) {
            throw new IllegalArgumentException("amount must be non-negative");
        }
    }
}
