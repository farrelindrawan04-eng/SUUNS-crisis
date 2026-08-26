package com.clec.economy.crisis.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StateSnapshotRepository extends JpaRepository<StateSnapshotEntity, String> {
    Optional<StateSnapshotEntity> findFirstBySessionIdOrderByTickNumberDesc(String sessionId);
}
