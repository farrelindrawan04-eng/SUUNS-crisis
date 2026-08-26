package com.clec.economy.crisis.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PolicyActionRepository extends JpaRepository<PolicyActionEntity, String> {
    List<PolicyActionEntity> findBySessionIdAndActivationTickLessThanEqualAndEndTickGreaterThanEqual(
            String sessionId, long activationTick, long endTick);
}
