package com.clec.economy.operations;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DelegateProfileRepository extends JpaRepository<DelegateProfileEntity, String> {
    List<DelegateProfileEntity> findBySessionIdOrderByCreatedAtAsc(String sessionId);
    Optional<DelegateProfileEntity> findByUserId(String userId);
}
