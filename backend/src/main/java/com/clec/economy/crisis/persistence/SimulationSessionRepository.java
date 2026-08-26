package com.clec.economy.crisis.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationSessionRepository extends JpaRepository<SimulationSessionEntity, String> {
}
