package com.clec.economy.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextPersistenceFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;

@Configuration
public class SecurityConfig {
    @Value("${clec.cors.allowed-origin:http://localhost:5173}")
    private String allowedOrigin;
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, AccountEnabledFilter accountEnabledFilter) throws Exception {
        CookieCsrfTokenRepository csrf = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrf.setCookiePath("/");

        http
                .cors().and()
                .csrf().csrfTokenRepository(csrf).and()
                .authorizeRequests()
                .antMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
                .antMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .antMatchers("/api/auth/staff/**").hasRole("MASTER")
                .antMatchers("/api/crisis/**").hasAnyRole("MASTER", "STAFF")
                .antMatchers("/api/operations/delegate/**").hasRole("DELEGATE")
                .antMatchers("/api/operations/**").hasAnyRole("MASTER", "STAFF")
                .antMatchers("/api/feed/staff/**").hasAnyRole("MASTER", "STAFF")
                .antMatchers("/api/feed/**").authenticated()
                .antMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
                .and()
                .logout().logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID").invalidateHttpSession(true)
                .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204));
        http.addFilterAfter(accountEnabledFilter, SecurityContextPersistenceFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Collections.singletonList(allowedOrigin));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Content-Type", "X-XSRF-TOKEN"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
