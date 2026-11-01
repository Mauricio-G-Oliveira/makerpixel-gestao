package com.makerpixel.contabil.config;

import com.makerpixel.contabil.domain.Perfil;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final int expirationHours;

    public JwtTokenProvider(
        @Value("${makerpixel.jwt.secret}") String secret,
        @Value("${makerpixel.jwt.expiration-hours:12}") int expirationHours
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationHours = expirationHours;
    }

    public String generateToken(UUID userId, String email, Perfil perfil, UUID escritorioId) {
        Instant now = Instant.now();
        Instant expiry = now.plus(expirationHours, ChronoUnit.HOURS);

        var builder = Jwts.builder()
            .subject(email)
            .claim("userId", userId != null ? userId.toString() : null)
            .claim("perfil", perfil.name())
            .claim("escritorioId", escritorioId != null ? escritorioId.toString() : null)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiry))
            .signWith(key);

        return builder.compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
