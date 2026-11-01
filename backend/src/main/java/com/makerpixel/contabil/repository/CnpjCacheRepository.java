package com.makerpixel.contabil.repository;

import com.makerpixel.contabil.domain.CnpjCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CnpjCacheRepository extends JpaRepository<CnpjCache, UUID> {
    Optional<CnpjCache> findByCnpj(String cnpj);
}
