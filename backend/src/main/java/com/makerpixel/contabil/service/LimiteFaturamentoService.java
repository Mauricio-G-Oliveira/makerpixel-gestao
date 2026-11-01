package com.makerpixel.contabil.service;

import com.makerpixel.contabil.domain.*;
import com.makerpixel.contabil.dto.LimiteDTOs.*;
import com.makerpixel.contabil.repository.EmpresaRepository;
import com.makerpixel.contabil.repository.FaturamentoMensalRepository;
import com.makerpixel.contabil.repository.LimiteFaturamentoConfigRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
public class LimiteFaturamentoService {

    private static final String[] MESES = {
        "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    };

    private final EmpresaRepository empresaRepository;
    private final FaturamentoMensalRepository faturamentoRepository;
    private final LimiteFaturamentoConfigRepository configRepository;

    public LimiteFaturamentoService(
        EmpresaRepository empresaRepository,
        FaturamentoMensalRepository faturamentoRepository,
        LimiteFaturamentoConfigRepository configRepository
    ) {
        this.empresaRepository = empresaRepository;
        this.faturamentoRepository = faturamentoRepository;
        this.configRepository = configRepository;
    }

    @Transactional(readOnly = true)
    public LimiteCalculadoResponse calcularLimite(UUID empresaId, int ano) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada."));

        if (!empresa.isAtiva()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empresa baixada ou inativa.");
        }

        RegimeTributario regime = empresa.getRegime();
        if (regime != RegimeTributario.MEI && regime != RegimeTributario.SIMPLES_NACIONAL) {
            return null; // Apenas MEI e Simples Nacional
        }

        // Consolidação Matriz + Filiais
        List<Empresa> familia = empresaRepository.findFamiliaEmpresas(empresa.getEscritorioId(), empresa.getCnpjRaiz());
        List<UUID> idsFamilia = familia.stream().filter(Empresa::isAtiva).map(Empresa::getId).toList();
        List<String> cnpjsConsolidados = familia.stream().map(Empresa::getCnpj).toList();

        // Limite configurado
        var configOpt = configRepository.findByAnoAndRegime(ano, regime);
        BigDecimal limiteAnualBase = configOpt.map(LimiteFaturamentoConfig::getLimiteAnual)
            .orElse(regime == RegimeTributario.MEI ? new BigDecimal("81000.00") : new BigDecimal("4800000.00"));
        BigDecimal limiteMensalBase = configOpt.map(LimiteFaturamentoConfig::getLimiteMensalProporcional)
            .orElse(regime == RegimeTributario.MEI ? new BigDecimal("6750.00") : new BigDecimal("400000.00"));

        BigDecimal sublimiteAnualBase = configOpt.flatMap(c -> Optional.ofNullable(c.getSublimiteAnual()))
            .orElse(regime == RegimeTributario.SIMPLES_NACIONAL ? new BigDecimal("3600000.00") : null);
        BigDecimal sublimiteMensalBase = configOpt.flatMap(c -> Optional.ofNullable(c.getSublimiteMensalProporcional()))
            .orElse(regime == RegimeTributario.SIMPLES_NACIONAL ? new BigDecimal("300000.00") : null);

        // Proporcionalidade por data de abertura
        int mesesAtividade = 12;
        boolean anoAbertura = false;
        if (empresa.getDataInicioAtividade() != null && empresa.getDataInicioAtividade().getYear() == ano) {
            anoAbertura = true;
            mesesAtividade = Math.max(1, 12 - empresa.getDataInicioAtividade().getMonthValue() + 1);
        }

        BigDecimal limiteEfetivo = anoAbertura
            ? limiteMensalBase.multiply(BigDecimal.valueOf(mesesAtividade))
            : limiteAnualBase;

        // Faturamento acumulado consolidado
        List<FaturamentoMensal> lancamentos = faturamentoRepository.findByEmpresaIdInAndAno(idsFamilia, ano);
        Map<Integer, BigDecimal> faturamentoPorMes = new HashMap<>();
        for (FaturamentoMensal lanc : lancamentos) {
            faturamentoPorMes.merge(lanc.getMes(), lanc.getValor(), BigDecimal::add);
        }

        BigDecimal totalAcumulado = faturamentoPorMes.values().stream()
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_EVEN);

        BigDecimal percentualUtilizado = limiteEfetivo.compareTo(BigDecimal.ZERO) > 0
            ? totalAcumulado.divide(limiteEfetivo, 4, RoundingMode.HALF_EVEN).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_EVEN)
            : BigDecimal.ZERO;

        // Projeção anual
        int anoAtual = LocalDate.now().getYear();
        ProjecaoDTO projecao = null;
        if (ano == anoAtual && !faturamentoPorMes.isEmpty()) {
            projecao = calcularProjecao(faturamentoPorMes, mesesAtividade, limiteEfetivo);
        }

        // Nível de alerta
        NivelAlerta nivel = determinarNivel(percentualUtilizado, projecao);

        // Consequência legal
        String consequencia = obterConsequencia(regime, nivel);

        // Sublimite ICMS/ISS para Simples Nacional
        SublimiteDTO sublimite = null;
        if (regime == RegimeTributario.SIMPLES_NACIONAL && sublimiteAnualBase != null) {
            BigDecimal sublimiteEfetivo = anoAbertura && sublimiteMensalBase != null
                ? sublimiteMensalBase.multiply(BigDecimal.valueOf(mesesAtividade))
                : sublimiteAnualBase;

            BigDecimal pctSublimite = sublimiteEfetivo.compareTo(BigDecimal.ZERO) > 0
                ? totalAcumulado.divide(sublimiteEfetivo, 4, RoundingMode.HALF_EVEN).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_EVEN)
                : BigDecimal.ZERO;

            NivelAlerta nivelSublimite = determinarNivel(pctSublimite, null);
            String conseqSublimite = obterConsequenciaSublimite(nivelSublimite);

            sublimite = new SublimiteDTO(sublimiteEfetivo, totalAcumulado, pctSublimite, nivelSublimite, conseqSublimite);
        }

        return new LimiteCalculadoResponse(
            empresa.getId(),
            empresa.getCnpj(),
            empresa.getRazaoSocial(),
            regime,
            ano,
            mesesAtividade,
            anoAbertura,
            limiteEfetivo,
            totalAcumulado,
            percentualUtilizado,
            nivel,
            consequencia,
            projecao,
            sublimite,
            familia.size() - 1,
            cnpjsConsolidados
        );
    }

    private ProjecaoDTO calcularProjecao(
        Map<Integer, BigDecimal> faturamentoPorMes,
        int mesesAtividadeAno,
        BigDecimal limiteEfetivo
    ) {
        int mesesLancados = faturamentoPorMes.size();
        if (mesesLancados == 0) return null;

        BigDecimal soma = faturamentoPorMes.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal mediaMensal = soma.divide(BigDecimal.valueOf(mesesLancados), 2, RoundingMode.HALF_EVEN);
        BigDecimal valorProjetado = mediaMensal.multiply(BigDecimal.valueOf(mesesAtividadeAno)).setScale(2, RoundingMode.HALF_EVEN);

        boolean ultrapassa = valorProjetado.compareTo(limiteEfetivo) > 0;
        Integer mesEstouro = null;
        String mesEstouroNome = null;
        String aviso = null;

        if (ultrapassa) {
            BigDecimal acumuladoSimulado = BigDecimal.ZERO;
            for (int m = 1; m <= 12; m++) {
                BigDecimal valorMes = faturamentoPorMes.getOrDefault(m, mediaMensal);
                acumuladoSimulado = acumuladoSimulado.add(valorMes);
                if (acumuladoSimulado.compareTo(limiteEfetivo) > 0) {
                    mesEstouro = m;
                    mesEstouroNome = MESES[m];
                    aviso = "No ritmo atual, o faturamento ultrapassa o limite em " + mesEstouroNome + ".";
                    break;
                }
            }
        }

        return new ProjecaoDTO(mediaMensal, valorProjetado, ultrapassa, mesEstouro, mesEstouroNome, aviso);
    }

    private NivelAlerta determinarNivel(BigDecimal percentual, ProjecaoDTO projecao) {
        if (percentual.compareTo(new BigDecimal("120.00")) > 0) {
            return NivelAlerta.EXCESSO_20;
        }
        if (percentual.compareTo(new BigDecimal("100.00")) > 0) {
            return NivelAlerta.ACIMA;
        }
        if (percentual.compareTo(new BigDecimal("80.00")) >= 0 || (projecao != null && projecao.ultrapassaLimite())) {
            return NivelAlerta.ATENCAO;
        }
        return NivelAlerta.OK;
    }

    private String obterConsequencia(RegimeTributario regime, NivelAlerta nivel) {
        if (regime == RegimeTributario.MEI) {
            return switch (nivel) {
                case ACIMA -> "Deixa de ser MEI em janeiro do ano seguinte e recolhe DAS complementar sobre o excesso.";
                case EXCESSO_20 -> "Desenquadramento do MEI retroativo ao início do ano (ou do início das atividades) com recolhimento como Simples/Presumido.";
                case ATENCAO -> "Proximidade do teto de faturamento. Planejar transição de regime com antecedência.";
                case OK -> "Faturamento dentro do limite legal do MEI.";
            };
        } else {
            return switch (nivel) {
                case ACIMA -> "Exclusão do Simples Nacional a partir de janeiro do ano-calendário seguinte.";
                case EXCESSO_20 -> "Exclusão do Simples Nacional a partir do mês seguinte ao que ultrapassou o limite (> 20%).";
                case ATENCAO -> "Atenção ao teto do Simples Nacional e sublimite de ICMS/ISS.";
                case OK -> "Faturamento dentro do limite anual do Simples Nacional.";
            };
        }
    }

    private String obterConsequenciaSublimite(NivelAlerta nivel) {
        return switch (nivel) {
            case ACIMA -> "ICMS e ISS recolhidos fora do DAS (em guias estaduais/municipais) a partir de janeiro do ano seguinte.";
            case EXCESSO_20 -> "ICMS e ISS recolhidos fora do DAS a partir do mês seguinte ao excesso.";
            case ATENCAO -> "Atenção ao sublimite de ICMS e ISS (R$ 3.600.000,00).";
            case OK -> "ICMS e ISS recolhidos normalmente no DAS unificado.";
        };
    }
}
