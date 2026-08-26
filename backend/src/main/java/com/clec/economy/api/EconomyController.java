package com.clec.economy.api;

import com.clec.economy.simulation.SimulationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/simulation")
public class EconomyController {
    private final SimulationService simulationService;

    public EconomyController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    @GetMapping
    public SimulationStateResponse state() {
        return simulationService.state();
    }

    @PostMapping("/step")
    public SimulationStateResponse step() {
        return simulationService.step();
    }

    @PostMapping("/reset")
    public SimulationStateResponse reset() {
        return simulationService.reset();
    }
}
