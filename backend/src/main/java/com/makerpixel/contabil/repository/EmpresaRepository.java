package com.makerpixel.contabil.repository;

import com.makerpixel.contabil.domain.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmpresaRepository extends JpaRepository<Empresa, UUID> {
    Optional<Empresa> findByIdAndEscritorioId(UUID id, UUID escritorioId);
    Optional<Empresa> findByEscritorioIdAndCnpj(UUID escritorioId, String cnpj);
    List<Empresa> findByEscritorioId(UUID escritorioId);
    long countByEscritorioId(UUID escritorioId);

    @Query("SELECT e FROM Empresa e WHERE e.escritorioId = :escritorioId AND SUBSTRING(e.cnpj, 1, 8) = :cnpjRaiz")
    List<Empresa> findFamiliaEmpresas(
        @Param("escritorioId") UUID escritorioId,
        @Param("cnpjRaiz") String cnpjRaiz
    );
}
