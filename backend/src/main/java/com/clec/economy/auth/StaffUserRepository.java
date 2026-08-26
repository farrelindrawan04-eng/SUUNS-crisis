package com.clec.economy.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StaffUserRepository extends JpaRepository<StaffUserEntity, String> {
    Optional<StaffUserEntity> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);
    List<StaffUserEntity> findAllByOrderByCreatedAtAsc();
}
