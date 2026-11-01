package com.makerpixel.contabil.repository;

import com.makerpixel.contabil.domain.Socio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SocioRepository extends JpaRepository<Socio, UUID> {
    List<Socio> findByEmpresaId(UUID empresaId);
    List<Socio> findByEscritorioId(UUID escritorioId);
}
