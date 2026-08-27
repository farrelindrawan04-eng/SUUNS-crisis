package com.clec.economy.crisis.engine;

import com.clec.economy.crisis.domain.CrisisEvent;
import com.clec.economy.crisis.domain.EngineState;
import com.clec.economy.crisis.domain.HiddenVariables;
import com.clec.economy.crisis.domain.PolicyAction;
import com.clec.economy.crisis.domain.PublicIndicators;
import com.clec.economy.crisis.track.ScenarioTrack;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class TickEngine {
    private final TrackEngine trackEngine;

    public TickEngine(TrackEngine trackEngine) {
        this.trackEngine = trackEngine;
    }

    public TickResult advance(EngineState current, int tickMinutes, List<PolicyAction> policies,
                              List<CrisisEvent> events, ScenarioTrack track) {
        long nextTick = current.getTick() + 1;
        List<PolicyAction> activePolicies = policies.stream()
                .filter(policy -> policy.isActive(nextTick))
                .sorted(Comparator.comparing(PolicyAction::getId)).collect(Collectors.toList());
        List<CrisisEvent> activeEvents = events.stream()
                .filter(event -> event.isActive(nextTick))
                .sorted(Comparator.comparing(CrisisEvent::getId)).collect(Collectors.toList());
        ArrayList<CausalRecord> log = new ArrayList<>();
        PublicIndicators visible = current.getPublicIndicators();
        HiddenVariables hidden = current.getHiddenVariables();

        log.add(stage(TickStage.ACTIVATE_EVENTS, activeEvents.size() + " event(s) active"));
        TrackEngine.TrackApplication trackApplication = trackEngine.apply(current, track, nextTick);
        visible = trackApplication.getPublicIndicators();
        hidden = trackApplication.getHiddenVariables();
        log.add(trackApplication.getCausalRecord());
        log.add(stage(TickStage.ACTIVATE_DELAYED_POLICIES, activePolicies.size() + " policy action(s) active"));

        double fiscalCost = activePolicies.stream()
                .filter(policy -> policy.getActivationTick() == nextTick)
                .filter(policy -> policy.getType() != com.clec.economy.crisis.domain.PolicyActionType.FX_INTERVENTION)
                .mapToDouble(PolicyAction::getResourceCommitment).sum();
        double reserveCost = activePolicies.stream()
                .filter(policy -> policy.getActivationTick() == nextTick)
                .filter(policy -> policy.getType() == com.clec.economy.crisis.domain.PolicyActionType.FX_INTERVENTION)
                .mapToDouble(PolicyAction::getResourceCommitment).sum();
        if (fiscalCost != 0) {
            hidden = hidden.adjusted(0, 0, 0, -fiscalCost, 0, 0, 0, 0);
        }
        if (reserveCost != 0) {
            hidden = hidden.adjusted(0, 0, -reserveCost, 0, 0, 0, 0, 0);
        }
        log.add(stage(TickStage.DIRECT_RESOURCE_TRANSACTIONS,
                "Committed " + round(fiscalCost) + " fiscal and " + round(reserveCost) + " reserve units"));

        for (CrisisEvent event : activeEvents) {
            double m = event.getMagnitude();
            switch (event.getType()) {
                case BANK_RUN:
                    visible = visible.adjusted(-2 * m, 0, 0, 0, 0, -m, 0, 0, 0);
                    hidden = hidden.adjusted(-4 * m, 0, 0, 0, 0, 0, 0, 5 * m);
                    log.add(source(TickStage.BANKING, "EVENT", event.getId(), "Bank-run pressure applied"));
                    break;
                case CURRENCY_SHOCK:
                    visible = visible.adjusted(0, -3 * m, 0, 0, 0, 0, 0, 1.5 * m, -m);
                    hidden = hidden.adjusted(0, 0, -2 * m, 0, 0, 0, 0, 0);
                    log.add(source(TickStage.RESERVES_AND_CURRENCY, "EVENT", event.getId(), "Currency shock applied"));
                    break;
                case SUPPLY_DISRUPTION:
                    visible = visible.adjusted(0, 0, -1.5 * m, -3 * m, 0, 0, 0, m, -m);
                    hidden = hidden.adjusted(0, 0, 0, 0, 0, -3 * m, 0, 0);
                    log.add(source(TickStage.IMPORTS_SUPPLY_AND_ACTIVITY, "EVENT", event.getId(), "Supply disruption applied"));
                    break;
                case SOCIAL_UNREST:
                    visible = visible.adjusted(0, 0, -m, 0, 0, -2 * m, 3 * m, 0, 0);
                    log.add(source(TickStage.CONFIDENCE_AND_UNREST, "EVENT", event.getId(), "Social disruption applied"));
                    break;
                case SOVEREIGN_DOWNGRADE:
                    visible = visible.adjusted(0, 0, 0, 0, -3 * m, -m, 0, 0, 0);
                    hidden = hidden.adjusted(0, 0, 0, 0, 0, 0, -2 * m, 0);
                    log.add(source(TickStage.FISCAL_AND_CREDITWORTHINESS, "EVENT", event.getId(), "Sovereign downgrade applied"));
                    break;
                default:
                    throw new IllegalStateException("Unhandled event type: " + event.getType());
            }
        }

        for (PolicyAction policy : activePolicies) {
            double strength = policy.effectiveStrength();
            switch (policy.getType()) {
                case LIQUIDITY_SUPPORT:
                    visible = visible.adjusted(2 * strength, 0, 0, 0, 0, strength, 0, 0, 0);
                    hidden = hidden.adjusted(4 * strength, 0, 0, 0, 0, 0, 0, -2 * strength);
                    log.add(source(TickStage.BANKING, "POLICY", policy.getId(), "Liquidity support applied"));
                    break;
                case CAPITAL_INJECTION:
                    visible = visible.adjusted(2 * strength, 0, 0, 0, 0, 0, 0, 0, 0);
                    hidden = hidden.adjusted(0, 3 * strength, 0, 0, 0, 0, 0, 0);
                    log.add(source(TickStage.BANKING, "POLICY", policy.getId(), "Capital injection applied"));
                    break;
                case FX_INTERVENTION:
                    visible = visible.adjusted(0, 2 * strength, 0, 0, 0, strength, 0, -strength, strength);
                    log.add(source(TickStage.RESERVES_AND_CURRENCY, "POLICY", policy.getId(), "FX intervention applied"));
                    break;
                case FISCAL_SUPPORT:
                    visible = visible.adjusted(0, 0, 2 * strength, 0, 0, strength, -strength, 0, 2 * strength);
                    log.add(source(TickStage.FISCAL_AND_CREDITWORTHINESS, "POLICY", policy.getId(), "Fiscal support applied"));
                    break;
                case IMPORT_SUPPORT:
                    visible = visible.adjusted(0, 0, strength, 2 * strength, 0, 0, 0, -strength, strength);
                    hidden = hidden.adjusted(0, 0, 0, 0, 0, 2 * strength, 0, 0);
                    log.add(source(TickStage.IMPORTS_SUPPLY_AND_ACTIVITY, "POLICY", policy.getId(), "Import support applied"));
                    break;
                case PUBLIC_COMMUNICATION:
                    visible = visible.adjusted(0, 0, 0, 0, 0, 2 * strength, -strength, 0, 0);
                    hidden = hidden.adjusted(0, 0, 0, 0, 0, 0, 0, -strength);
                    log.add(source(TickStage.CONFIDENCE_AND_UNREST, "POLICY", policy.getId(), "Public communication applied"));
                    break;
                default:
                    throw new IllegalStateException("Unhandled policy type: " + policy.getType());
            }
        }

        if (hidden.getDepositWithdrawalPressure() > 60) {
            double stress = (hidden.getDepositWithdrawalPressure() - 60) * 0.05;
            visible = visible.adjusted(-stress, 0, 0, 0, 0, 0, 0, 0, 0);
            hidden = hidden.adjusted(-stress, 0, 0, 0, 0, 0, 0, 0);
            log.add(stage(TickStage.BANKING, "Deposit-withdrawal feedback activated"));
        } else {
            log.add(stage(TickStage.BANKING, "Banking feedback stable"));
        }

        log.add(stage(TickStage.RESERVES_AND_CURRENCY, "Reserve and currency effects resolved"));
        log.add(stage(TickStage.IMPORTS_SUPPLY_AND_ACTIVITY, "Import, supply, and activity effects resolved"));
        log.add(stage(TickStage.FISCAL_AND_CREDITWORTHINESS, "Fiscal and credit effects resolved"));

        double priceStress = Math.max(0, 50 - visible.getCurrencyStrength()) * 0.02
                + Math.max(0, 50 - visible.getEssentialSupplySecurity()) * 0.02;
        if (priceStress > 0) {
            visible = visible.adjusted(0, 0, 0, 0, 0, 0, 0, priceStress, -priceStress);
        }
        log.add(stage(TickStage.PRICES_AND_PURCHASING_POWER, "Price feedback: " + round(priceStress)));

        double confidenceStress = Math.max(0, visible.getCivilUnrest() - 50) * 0.02;
        if (confidenceStress > 0) {
            visible = visible.adjusted(0, 0, 0, 0, 0, -confidenceStress, 0, 0, 0);
        }
        log.add(stage(TickStage.CONFIDENCE_AND_UNREST, "Social confidence feedback: " + round(confidenceStress)));
        log.add(stage(TickStage.THRESHOLDS, thresholdSummary(visible, hidden)));
        log.add(stage(TickStage.OBSERVATIONS, "Public observation generated"));
        log.add(stage(TickStage.SNAPSHOT_AND_CAUSAL_LOG, "Tick ready for atomic commit"));

        EngineState next = new EngineState(nextTick,
                current.getSimulationTimeMinutes() + tickMinutes, visible, hidden);
        log.sort(Comparator.comparingInt(record -> record.getStage().ordinal()));
        return new TickResult(next, log);
    }

    private String thresholdSummary(PublicIndicators visible, HiddenVariables hidden) {
        int critical = 0;
        if (visible.getBankingStability() < 30) critical++;
        if (visible.getCurrencyStrength() < 30) critical++;
        if (visible.getEssentialSupplySecurity() < 30) critical++;
        if (visible.getCivilUnrest() > 70) critical++;
        if (hidden.getBankLiquidity() < 25) critical++;
        return critical + " critical threshold(s) active";
    }

    private CausalRecord stage(TickStage stage, String message) {
        return new CausalRecord(stage, "ENGINE", null, message);
    }

    private CausalRecord source(TickStage stage, String sourceType, String sourceId, String message) {
        return new CausalRecord(stage, sourceType, sourceId, message);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
