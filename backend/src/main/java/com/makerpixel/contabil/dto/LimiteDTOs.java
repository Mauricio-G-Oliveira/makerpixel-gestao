package com.makerpixel.contabil.dto;

import com.makerpixel.contabil.domain.NivelAlerta;
import com.makerpixel.contabil.domain.RegimeTributario;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class LimiteDTOs {

    public record ProjecaoDTO(
        BigDecimal mediaMensal,
        BigDecimal valorProjetado,
        boolean ultrapassaLimite,
        Integer mesEstouro,
        String mesEstouroNome,
        String aviso
    ) {}

    public record SublimiteDTO(
        BigDecimal limiteAnual,
        BigDecimal faturamentoAcumulado,
        BigDecimal percentualUtilizado,
        NivelAlerta nivel,
        String consequencia
    ) {}

    public record LimiteCalculadoResponse(
        UUID empresaId,
        String cnpj,
        String razaoSocial,
        RegimeTributario regime,
        int ano,
        int mesesAtividadeAno,
        boolean anoAbertura,
        BigDecimal limiteAnual,
        BigDecimal faturamentoAcumulado,
        BigDecimal percentualUtilizado,
        NivelAlerta nivel,
        String consequencia,
        ProjecaoDTO projecao,
        SublimiteDTO sublimite,
        int qtdFiliaisConsolidadas,
        List<String> cnpjsConsolidados
    ) {}

    public record QuadroLimitesItem(
        UUID empresaId,
        String cnpj,
        String razaoSocial,
        RegimeTributario regime,
        BigDecimal limiteAnual,
        BigDecimal faturamentoAcumulado,
        BigDecimal percentualUtilizado,
        NivelAlerta nivel,
        String avisoProjecao,
        String consequencia
    ) {}
}
