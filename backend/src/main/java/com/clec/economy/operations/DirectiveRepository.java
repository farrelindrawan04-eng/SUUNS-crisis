package com.clec.economy.operations;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DirectiveRepository extends JpaRepository<DirectiveEntity, String> {
    List<DirectiveEntity> findBySessionIdOrderByUpdatedAtDesc(String sessionId);
    List<DirectiveEntity> findByDelegateIdOrderByUpdatedAtDesc(String delegateId);
}
