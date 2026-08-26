package com.clec.economy.crisis.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CrisisEventRepository extends JpaRepository<CrisisEventEntity, String> {
    List<CrisisEventEntity> findBySessionIdAndActivationTickLessThanEqualAndEndTickGreaterThanEqual(
            String sessionId, long activationTick, long endTick);
}
