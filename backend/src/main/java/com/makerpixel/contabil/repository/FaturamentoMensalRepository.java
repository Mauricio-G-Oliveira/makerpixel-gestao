package com.makerpixel.contabil.repository;

import com.makerpixel.contabil.domain.FaturamentoMensal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FaturamentoMensalRepository extends JpaRepository<FaturamentoMensal, UUID> {
    List<FaturamentoMensal> findByEmpresaIdAndAnoOrderByMesAsc(UUID empresaId, Integer ano);
    List<FaturamentoMensal> findByEmpresaIdInAndAno(List<UUID> empresaIds, Integer ano);
    Optional<FaturamentoMensal> findByEmpresaIdAndAnoAndMes(UUID empresaId, Integer ano, Integer mes);
}
