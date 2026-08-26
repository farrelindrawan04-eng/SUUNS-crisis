package com.clec.economy.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StaffAuthService implements UserDetailsService, CommandLineRunner {
    private final StaffUserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final String masterUsername;
    private final String masterPassword;
    private final String masterDisplayName;

    public StaffAuthService(StaffUserRepository repository, PasswordEncoder passwordEncoder,
                            @Value("${clec.auth.master.username}") String masterUsername,
                            @Value("${clec.auth.master.password}") String masterPassword,
                            @Value("${clec.auth.master.display-name}") String masterDisplayName) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.masterUsername = masterUsername;
        this.masterPassword = masterPassword;
        this.masterDisplayName = masterDisplayName;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (repository.count() == 0) {
            validatePassword(masterPassword);
            repository.save(new StaffUserEntity(UUID.randomUUID().toString(), normalize(masterUsername),
                    masterDisplayName.trim(), passwordEncoder.encode(masterPassword), StaffRole.MASTER,
                    true, null, Instant.now()));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        StaffUserEntity user = find(username);
        return User.withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                .disabled(!user.isEnabled())
                .build();
    }

    @Transactional(readOnly = true)
    public StaffUserEntity find(String username) {
        return repository.findByUsernameIgnoreCase(normalize(username))
                .orElseThrow(() -> new UsernameNotFoundException("Staff account not found"));
    }

    @Transactional
    public AuthUserResponse createStaff(CreateStaffRequest request, String creatorUsername) {
        String username = normalize(request.getUsername());
        require(!username.isBlank(), "username is required");
        require(request.getDisplayName() != null && !request.getDisplayName().isBlank(), "displayName is required");
        require(!repository.existsByUsernameIgnoreCase(username), "username already exists");
        validatePassword(request.getPassword());
        StaffUserEntity creator = find(creatorUsername);
        StaffUserEntity staff = new StaffUserEntity(UUID.randomUUID().toString(), username,
                request.getDisplayName().trim(), passwordEncoder.encode(request.getPassword()), StaffRole.STAFF,
                true, creator.getId(), Instant.now());
        return new AuthUserResponse(repository.save(staff));
    }

    @Transactional(readOnly = true)
    public List<AuthUserResponse> listStaff() {
        return repository.findAllByOrderByCreatedAtAsc().stream()
                .map(AuthUserResponse::new).collect(Collectors.toList());
    }

    private void validatePassword(String password) {
        require(password != null && password.length() >= 10, "password must contain at least 10 characters");
    }

    private String normalize(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }

    private void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException(message);
    }
}
