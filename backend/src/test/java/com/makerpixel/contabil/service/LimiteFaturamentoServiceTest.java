package com.makerpixel.contabil.service;

import com.makerpixel.contabil.domain.*;
import com.makerpixel.contabil.dto.LimiteDTOs.LimiteCalculadoResponse;
import com.makerpixel.contabil.repository.EmpresaRepository;
import com.makerpixel.contabil.repository.FaturamentoMensalRepository;
import com.makerpixel.contabil.repository.LimiteFaturamentoConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LimiteFaturamentoServiceTest {

    @Mock
    private EmpresaRepository empresaRepository;

    @Mock
    private FaturamentoMensalRepository faturamentoRepository;

    @Mock
    private LimiteFaturamentoConfigRepository configRepository;

    @InjectMocks
    private LimiteFaturamentoService limiteService;

    private UUID empresaId;
    private UUID escritorioId;
    private Empresa empresaMei;

    @BeforeEach
    void setUp() {
        empresaId = UUID.randomUUID();
        escritorioId = UUID.randomUUID();

        empresaMei = new Empresa();
        empresaMei.setId(empresaId);
        empresaMei.setEscritorioId(escritorioId);
        empresaMei.setCnpj("12345678000195");
        empresaMei.setRazaoSocial("MEI Servicos Digitais LTDA");
        empresaMei.setRegime(RegimeTributario.MEI);
        empresaMei.setSituacaoCadastral("ATIVA");
    }

    @Test
    @DisplayName("MEI 2026: Teto padrão anual de R$ 81.000,00 e níveis de alerta")
    void mei_2026_teto_padrao_e_niveis() {
        when(empresaRepository.findById(empresaId)).thenReturn(Optional.of(empresaMei));
        when(empresaRepository.findFamiliaEmpresas(eq(escritorioId), eq("12345678"))).thenReturn(List.of(empresaMei));
        when(configRepository.findByAnoAndRegime(2026, RegimeTributario.MEI)).thenReturn(Optional.empty());

        // Lançamento de R$ 70.000,00 (> 80% e < 100% -> ATENÇÃO)
        FaturamentoMensal lanc = new FaturamentoMensal();
        lanc.setAno(2026);
        lanc.setMes(5);
        lanc.setValor(new BigDecimal("70000.00"));

        when(faturamentoRepository.findByEmpresaIdInAndAno(any(), eq(2026))).thenReturn(List.of(lanc));

        LimiteCalculadoResponse res = limiteService.calcularLimite(empresaId, 2026);

        assertNotNull(res);
        assertEquals(new BigDecimal("81000.00"), res.limiteAnual());
        assertEquals(new BigDecimal("70000.00"), res.faturamentoAcumulado());
        assertEquals(NivelAlerta.ATENCAO, res.nivel());
        assertTrue(res.consequencia().contains("Proximidade do teto"));
    }

    @Test
    @DisplayName("Ano de abertura: limite proporcional aos meses ativos")
    void ano_de_abertura_proporcional() {
        empresaMei.setDataInicioAtividade(LocalDate.of(2026, 7, 1)); // Julho a Dezembro = 6 meses

        when(empresaRepository.findById(empresaId)).thenReturn(Optional.of(empresaMei));
        when(empresaRepository.findFamiliaEmpresas(eq(escritorioId), eq("12345678"))).thenReturn(List.of(empresaMei));
        when(configRepository.findByAnoAndRegime(2026, RegimeTributario.MEI)).thenReturn(Optional.empty());
        when(faturamentoRepository.findByEmpresaIdInAndAno(any(), eq(2026))).thenReturn(Collections.emptyList());

        LimiteCalculadoResponse res = limiteService.calcularLimite(empresaId, 2026);

        assertNotNull(res);
        assertTrue(res.anoAbertura());
        assertEquals(6, res.mesesAtividadeAno());
        // 6 meses x R$ 6.750,00 = R$ 40.500,00
        assertEquals(new BigDecimal("40500.00"), res.limiteAnual());
    }

    @Test
    @DisplayName("Consolidação: soma de faturamento da matriz e filiais pelo CNPJ raiz")
    void consolidacao_matriz_e_filiais() {
        Empresa filial = new Empresa();
        filial.setId(UUID.randomUUID());
        filial.setEscritorioId(escritorioId);
        filial.setCnpj("12345678000276");
        filial.setRazaoSocial("Filial 1");
        filial.setRegime(RegimeTributario.MEI);
        filial.setSituacaoCadastral("ATIVA");

        when(empresaRepository.findById(empresaId)).thenReturn(Optional.of(empresaMei));
        when(empresaRepository.findFamiliaEmpresas(eq(escritorioId), eq("12345678"))).thenReturn(List.of(empresaMei, filial));
        when(configRepository.findByAnoAndRegime(2026, RegimeTributario.MEI)).thenReturn(Optional.empty());

        FaturamentoMensal lanc1 = new FaturamentoMensal();
        lanc1.setAno(2026);
        lanc1.setMes(1);
        lanc1.setValor(new BigDecimal("20000.00"));

        FaturamentoMensal lanc2 = new FaturamentoMensal();
        lanc2.setAno(2026);
        lanc2.setMes(1);
        lanc2.setValor(new BigDecimal("15000.00"));

        when(faturamentoRepository.findByEmpresaIdInAndAno(any(), eq(2026))).thenReturn(List.of(lanc1, lanc2));

        LimiteCalculadoResponse res = limiteService.calcularLimite(empresaId, 2026);

        assertNotNull(res);
        assertEquals(new BigDecimal("35000.00"), res.faturamentoAcumulado());
        assertEquals(1, res.qtdFiliaisConsolidadas());
    }

    @Test
    @DisplayName("Regimes Lucro Presumido e Real são ignorados pelo cálculo")
    void regimes_nao_aplicaveis_retornam_nulo() {
        empresaMei.setRegime(RegimeTributario.LUCRO_PRESUMIDO);
        when(empresaRepository.findById(empresaId)).thenReturn(Optional.of(empresaMei));

        LimiteCalculadoResponse res = limiteService.calcularLimite(empresaId, 2026);
        assertNull(res);
    }
}
