package com.clec.economy.crisis.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SimulationSessionRepository extends JpaRepository<SimulationSessionEntity, String> {
    List<SimulationSessionEntity> findAllByOrderByUpdatedAtDesc();
}
