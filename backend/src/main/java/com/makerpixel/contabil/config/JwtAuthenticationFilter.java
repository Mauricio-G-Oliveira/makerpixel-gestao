package com.makerpixel.contabil.config;

import com.makerpixel.contabil.domain.Perfil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7);
                if (tokenProvider.validateToken(token)) {
                    Claims claims = tokenProvider.parseToken(token);
                    String email = claims.getSubject();
                    String perfilStr = claims.get("perfil", String.class);
                    String userIdStr = claims.get("userId", String.class);
                    String escritorioIdStr = claims.get("escritorioId", String.class);

                    Perfil perfil = Perfil.valueOf(perfilStr);
                    UUID userId = userIdStr != null ? UUID.fromString(userIdStr) : null;
                    UUID escritorioId = escritorioIdStr != null ? UUID.fromString(escritorioIdStr) : null;

                    TenantContext.setUserId(userId);
                    TenantContext.setEscritorioId(escritorioId);
                    TenantContext.setAdminProduto(perfil == Perfil.ADMIN_PRODUTO);

                    var auth = new UsernamePasswordAuthenticationToken(
                        email,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + perfil.name()))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
