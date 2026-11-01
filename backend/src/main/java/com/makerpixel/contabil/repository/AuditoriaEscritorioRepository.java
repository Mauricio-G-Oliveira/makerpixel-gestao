package com.makerpixel.contabil.repository;

import com.makerpixel.contabil.domain.AuditoriaEscritorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditoriaEscritorioRepository extends JpaRepository<AuditoriaEscritorio, UUID> {
    List<AuditoriaEscritorio> findByEscritorioIdOrderByDataHoraDesc(UUID escritorioId);
}
