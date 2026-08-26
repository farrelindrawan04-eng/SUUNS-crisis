package com.clec.economy.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository;
    private final StaffAuthService staffAuthService;

    public AuthController(AuthenticationManager authenticationManager, SecurityContextRepository contextRepository,
                          StaffAuthService staffAuthService) {
        this.authenticationManager = authenticationManager;
        this.contextRepository = contextRepository;
        this.staffAuthService = staffAuthService;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Collections.singletonMap("token", token.getToken());
    }

    @PostMapping("/login")
    public AuthUserResponse login(@RequestBody LoginRequest request, HttpServletRequest servletRequest,
                                  HttpServletResponse servletResponse) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, servletRequest, servletResponse);
        return new AuthUserResponse(staffAuthService.find(authentication.getName()));
    }

    @GetMapping("/me")
    public AuthUserResponse me(Authentication authentication) {
        return new AuthUserResponse(staffAuthService.find(authentication.getName()));
    }

    @GetMapping("/staff")
    public List<AuthUserResponse> staff() {
        return staffAuthService.listStaff();
    }

    @PostMapping("/staff")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthUserResponse createStaff(@RequestBody CreateStaffRequest request, Authentication authentication) {
        return staffAuthService.createStaff(request, authentication.getName());
    }
}
