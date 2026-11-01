package com.makerpixel.contabil.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "auditoria_escritorio")
public class AuditoriaEscritorio {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "escritorio_id")
    private UUID escritorioId;

    @Column(name = "usuario_id")
    private UUID usuarioId;

    @Column(nullable = false, length = 80)
    private String acao;

    @Column(columnDefinition = "TEXT")
    private String detalhes;

    @Column(name = "data_hora", nullable = false)
    private OffsetDateTime dataHora = OffsetDateTime.now();

    public AuditoriaEscritorio() {}

    public AuditoriaEscritorio(UUID escritorioId, UUID usuarioId, String acao, String detalhes) {
        this.escritorioId = escritorioId;
        this.usuarioId = usuarioId;
        this.acao = acao;
        this.detalhes = detalhes;
        this.dataHora = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getEscritorioId() { return escritorioId; }
    public void setEscritorioId(UUID escritorioId) { this.escritorioId = escritorioId; }

    public UUID getUsuarioId() { return usuarioId; }
    public void setUsuarioId(UUID usuarioId) { this.usuarioId = usuarioId; }

    public String getAcao() { return acao; }
    public void setAcao(String acao) { this.acao = acao; }

    public String getDetalhes() { return detalhes; }
    public void setDetalhes(String detalhes) { this.detalhes = detalhes; }

    public OffsetDateTime getDataHora() { return dataHora; }
    public void setDataHora(OffsetDateTime dataHora) { this.dataHora = dataHora; }
}
