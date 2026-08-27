package com.clec.economy.crisis.track;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class TrackTemplateFactory {
    private TrackTemplateFactory() { }

    public static ScenarioTrack create(String id, String name, String description, TrackDirection direction,
                                       double intensity, int durationTicks, boolean builtIn) {
        List<TrackPhase> phases = direction == TrackDirection.ADVERSE_SPIRAL
                ? adversePhases(intensity, durationTicks) : healthyPhases(intensity, durationTicks);
        return new ScenarioTrack(id, name, description, direction, intensity, durationTicks, builtIn, phases);
    }

    private static List<TrackPhase> adversePhases(double intensity, int duration) {
        int firstEnd = Math.max(1, duration / 3);
        int secondEnd = Math.max(firstEnd + 1, duration * 2 / 3);
        ArrayList<TrackPhase> phases = new ArrayList<>();
        phases.add(new TrackPhase(1, firstEnd, "Currency pressure and reserve leakage accelerate.",
                delta(publicMap("currencyStrength", -0.40, "pricePressure", 0.25, "publicConfidence", -0.15),
                        hiddenMap("foreignReserves", -0.60, "externalFinancingAccess", -0.25), intensity)));
        phases.add(new TrackPhase(firstEnd + 1, secondEnd, "Funding stress reaches banks and depositors.",
                delta(publicMap("bankingStability", -0.45, "publicConfidence", -0.35),
                        hiddenMap("bankLiquidity", -0.60, "depositWithdrawalPressure", 0.70), intensity)));
        phases.add(new TrackPhase(secondEnd + 1, duration, "The financial shock spills into supply, activity, and society.",
                delta(publicMap("economicActivity", -0.50, "essentialSupplySecurity", -0.40,
                                "civilUnrest", 0.45, "householdPurchasingPower", -0.35),
                        hiddenMap("fiscalCapacity", -0.35, "importDistributionCapacity", -0.35), intensity)));
        return phases;
    }

    private static List<TrackPhase> healthyPhases(double intensity, int duration) {
        int firstEnd = Math.max(1, duration / 3);
        int secondEnd = Math.max(firstEnd + 1, duration * 2 / 3);
        ArrayList<TrackPhase> phases = new ArrayList<>();
        phases.add(new TrackPhase(1, firstEnd, "Stable funding and reserves provide room for policy.",
                delta(publicMap("currencyStrength", 0.12, "publicConfidence", 0.10, "pricePressure", -0.08),
                        hiddenMap("foreignReserves", 0.10, "externalFinancingAccess", 0.08), intensity)));
        phases.add(new TrackPhase(firstEnd + 1, secondEnd, "Improving credit conditions support production and supply.",
                delta(publicMap("bankingStability", 0.12, "economicActivity", 0.14, "essentialSupplySecurity", 0.10),
                        hiddenMap("bankLiquidity", 0.10, "importDistributionCapacity", 0.08), intensity)));
        phases.add(new TrackPhase(secondEnd + 1, duration, "Household conditions strengthen while social pressure eases.",
                delta(publicMap("publicConfidence", 0.12, "civilUnrest", -0.10,
                                "householdPurchasingPower", 0.12, "pricePressure", -0.06),
                        hiddenMap("fiscalCapacity", 0.06, "depositWithdrawalPressure", -0.08), intensity)));
        return phases;
    }

    private static TrackDelta delta(Map<String, Double> visible, Map<String, Double> hidden, double intensity) {
        visible.replaceAll((key, value) -> value * intensity);
        hidden.replaceAll((key, value) -> value * intensity);
        return new TrackDelta(visible, hidden);
    }

    private static Map<String, Double> publicMap(Object... entries) { return map(entries); }
    private static Map<String, Double> hiddenMap(Object... entries) { return map(entries); }
    private static Map<String, Double> map(Object... entries) {
        LinkedHashMap<String, Double> values = new LinkedHashMap<>();
        for (int index = 0; index < entries.length; index += 2) {
            values.put((String) entries[index], (Double) entries[index + 1]);
        }
        return values;
    }
}
