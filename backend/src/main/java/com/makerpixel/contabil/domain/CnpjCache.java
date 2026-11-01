package com.makerpixel.contabil.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "cnpj_cache")
public class CnpjCache {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 14)
    private String cnpj;

    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "consultado_em", nullable = false)
    private OffsetDateTime consultadoEm = OffsetDateTime.now();

    @Column(name = "expira_em", nullable = false)
    private OffsetDateTime expiraEm;

    public CnpjCache() {}

    public CnpjCache(String cnpj, String payloadJson, int ttlHours) {
        this.cnpj = cnpj;
        this.payloadJson = payloadJson;
        this.consultadoEm = OffsetDateTime.now();
        this.expiraEm = OffsetDateTime.now().plusHours(ttlHours);
    }

    public boolean isExpirado() {
        return OffsetDateTime.now().isAfter(this.expiraEm);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCnpj() { return cnpj; }
    public void setCnpj(String cnpj) { this.cnpj = cnpj; }

    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String payloadJson) { this.payloadJson = payloadJson; }

    public OffsetDateTime getConsultadoEm() { return consultadoEm; }
    public void setConsultadoEm(OffsetDateTime consultadoEm) { this.consultadoEm = consultadoEm; }

    public OffsetDateTime getExpiraEm() { return expiraEm; }
    public void setExpiraEm(OffsetDateTime expiraEm) { this.expiraEm = expiraEm; }
}
