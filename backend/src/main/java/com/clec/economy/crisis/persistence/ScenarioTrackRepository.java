package com.clec.economy.crisis.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ScenarioTrackRepository extends JpaRepository<ScenarioTrackEntity, String> {
    List<ScenarioTrackEntity> findAllByOrderByBuiltInDescCreatedAtAsc();
}
