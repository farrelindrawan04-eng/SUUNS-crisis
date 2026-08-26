package com.clec.economy.simulation;

import com.clec.economy.api.EconomyNodeResponse;
import com.clec.economy.api.SimulationStateResponse;
import com.clec.economy.domain.EconomicUnit;
import com.clec.economy.domain.Resource;
import com.clec.economy.domain.ResourceLedger;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class SimulationService {
    private EconomicUnit root = SampleEconomyFactory.create();
    private long tick = 0;

    public synchronized SimulationStateResponse state() {
        return response();
    }

    public synchronized SimulationStateResponse step() {
        root.tick();
        tick++;
        return response();
    }

    public synchronized SimulationStateResponse reset() {
        root = SampleEconomyFactory.create();
        tick = 0;
        return response();
    }

    private SimulationStateResponse response() {
        return new SimulationStateResponse(tick, toResponse(root), ledgerToStringMap(root.totalResources()));
    }

    private EconomyNodeResponse toResponse(EconomicUnit unit) {
        ArrayList<EconomyNodeResponse> children = new ArrayList<>();
        for (EconomicUnit child : unit.children()) {
            children.add(toResponse(child));
        }

        return new EconomyNodeResponse(
                unit.id().toString(),
                unit.name(),
                unit.type().name(),
                ledgerToStringMap(unit.resources()),
                ledgerToStringMap(unit.totalResources()),
                children
        );
    }

    private Map<String, Double> ledgerToStringMap(ResourceLedger ledger) {
        LinkedHashMap<String, Double> result = new LinkedHashMap<>();
        for (Resource resource : Resource.values()) {
            result.put(resource.name().toLowerCase(), round(ledger.amountOf(resource)));
        }
        return result;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
