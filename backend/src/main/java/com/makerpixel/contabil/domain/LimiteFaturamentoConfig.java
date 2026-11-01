package com.makerpixel.contabil.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "limite_faturamento_config", uniqueConstraints = {
    @UniqueConstraint(name = "uk_config_ano_regime", columnNames = {"ano", "regime"})
})
public class LimiteFaturamentoConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Integer ano;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RegimeTributario regime;

    @Column(name = "limite_anual", nullable = false, precision = 15, scale = 2)
    private BigDecimal limiteAnual;

    @Column(name = "limite_mensal_proporcional", nullable = false, precision = 15, scale = 2)
    private BigDecimal limiteMensalProporcional;

    @Column(name = "sublimite_anual", precision = 15, scale = 2)
    private BigDecimal sublimiteAnual;

    @Column(name = "sublimite_mensal_proporcional", precision = 15, scale = 2)
    private BigDecimal sublimiteMensalProporcional;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Integer getAno() { return ano; }
    public void setAno(Integer ano) { this.ano = ano; }

    public RegimeTributario getRegime() { return regime; }
    public void setRegime(RegimeTributario regime) { this.regime = regime; }

    public BigDecimal getLimiteAnual() { return limiteAnual; }
    public void setLimiteAnual(BigDecimal limiteAnual) { this.limiteAnual = limiteAnual; }

    public BigDecimal getLimiteMensalProporcional() { return limiteMensalProporcional; }
    public void setLimiteMensalProporcional(BigDecimal limiteMensalProporcional) { this.limiteMensalProporcional = limiteMensalProporcional; }

    public BigDecimal getSublimiteAnual() { return sublimiteAnual; }
    public void setSublimiteAnual(BigDecimal sublimiteAnual) { this.sublimiteAnual = sublimiteAnual; }

    public BigDecimal getSublimiteMensalProporcional() { return sublimiteMensalProporcional; }
    public void setSublimiteMensalProporcional(BigDecimal sublimiteMensalProporcional) { this.sublimiteMensalProporcional = sublimiteMensalProporcional; }
}
