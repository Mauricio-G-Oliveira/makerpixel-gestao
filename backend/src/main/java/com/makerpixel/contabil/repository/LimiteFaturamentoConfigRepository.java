package com.makerpixel.contabil.repository;

import com.makerpixel.contabil.domain.LimiteFaturamentoConfig;
import com.makerpixel.contabil.domain.RegimeTributario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface LimiteFaturamentoConfigRepository extends JpaRepository<LimiteFaturamentoConfig, UUID> {
    Optional<LimiteFaturamentoConfig> findByAnoAndRegime(Integer ano, RegimeTributario regime);
}
