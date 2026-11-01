package com.makerpixel.contabil.repository;

import com.makerpixel.contabil.domain.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByEmailIgnoreCase(String email);
    List<Usuario> findByEscritorioId(UUID escritorioId);
    long countByEscritorioId(UUID escritorioId);
}
