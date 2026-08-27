package com.clec.economy.operations;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;

public interface DirectiveMessageRepository extends JpaRepository<DirectiveMessageEntity, String> {
    List<DirectiveMessageEntity> findByDirectiveIdInOrderByCreatedAtAsc(Collection<String> directiveIds);
}
