package com.makerpixel.contabil.repository;

import com.makerpixel.contabil.domain.Escritorio;
import com.makerpixel.contabil.domain.SituacaoEscritorio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EscritorioRepository extends JpaRepository<Escritorio, UUID> {
    Optional<Escritorio> findByCnpj(String cnpj);
    Optional<Escritorio> findByEmail(String email);
    List<Escritorio> findBySituacao(SituacaoEscritorio situacao);
    List<Escritorio> findBySituacaoAndTesteExpiraEmBefore(SituacaoEscritorio situacao, OffsetDateTime cutoff);
}
