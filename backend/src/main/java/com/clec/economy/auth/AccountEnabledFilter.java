package com.clec.economy.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class AccountEnabledFilter extends OncePerRequestFilter {
    private final StaffUserRepository users;
    public AccountEnabledFilter(StaffUserRepository users) { this.users=users; }
    @Override
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        Authentication authentication=SecurityContextHolder.getContext().getAuthentication();
        if(authentication!=null&&authentication.isAuthenticated()&&!"anonymousUser".equals(authentication.getPrincipal())){
            boolean enabled=users.findByUsernameIgnoreCase(authentication.getName()).map(StaffUserEntity::isEnabled).orElse(false);
            if(!enabled){SecurityContextHolder.clearContext();if(request.getSession(false)!=null)request.getSession(false).invalidate();response.sendError(HttpServletResponse.SC_UNAUTHORIZED,"Account disabled");return;}
        }
        chain.doFilter(request,response);
    }
}
