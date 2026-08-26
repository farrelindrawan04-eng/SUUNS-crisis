package com.clec.economy.crisis.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CausalEntryRepository extends JpaRepository<CausalEntryEntity, String> {
    List<CausalEntryEntity> findBySessionIdAndTickNumberOrderBySequenceNumber(String sessionId, long tickNumber);
}
