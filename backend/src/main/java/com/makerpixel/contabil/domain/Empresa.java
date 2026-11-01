package com.makerpixel.contabil.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "empresa", uniqueConstraints = {
    @UniqueConstraint(name = "uk_empresa_escritorio_cnpj", columnNames = {"escritorio_id", "cnpj"})
})
public class Empresa {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "escritorio_id", nullable = false)
    private UUID escritorioId;

    @Column(nullable = false, length = 14)
    private String cnpj;

    @Column(name = "razao_social", nullable = false)
    private String razaoSocial;

    @Column(name = "nome_fantasia")
    private String nomeFantasia;

    private String codigo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RegimeTributario regime = RegimeTributario.SIMPLES_NACIONAL;

    private String segmento;
    private String cidade;
    private String uf;
    private String cep;
    private String logradouro;
    private String numero;
    private String bairro;
    private String telefone;

    @Column(name = "situacao_cadastral", length = 20)
    private String situacaoCadastral = "ATIVA";

    @Column(name = "data_situacao")
    private LocalDate dataSituacao;

    @Column(name = "data_inicio_atividade")
    private LocalDate dataInicioAtividade;

    @Column(name = "data_baixa")
    private LocalDate dataBaixa;

    @Column(name = "data_consulta_receita")
    private OffsetDateTime dataConsultaReceita;

    @OneToMany(mappedBy = "empresa", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Socio> socios = new ArrayList<>();

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm = OffsetDateTime.now();

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm = OffsetDateTime.now();

    @PrePersist
    @PreUpdate
    public void onSave() {
        this.atualizadoEm = OffsetDateTime.now();
    }

    public boolean isMatriz() {
        if (cnpj == null || cnpj.length() < 12) return true;
        return cnpj.substring(8, 12).equals("0001");
    }

    public String getCnpjRaiz() {
        if (cnpj == null || cnpj.length() < 8) return "";
        return cnpj.substring(0, 8);
    }

    public boolean isAtiva() {
        return "ATIVA".equalsIgnoreCase(this.situacaoCadastral) && this.dataBaixa == null;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getEscritorioId() { return escritorioId; }
    public void setEscritorioId(UUID escritorioId) { this.escritorioId = escritorioId; }

    public String getCnpj() { return cnpj; }
    public void setCnpj(String cnpj) { this.cnpj = cnpj; }

    public String getRazaoSocial() { return razaoSocial; }
    public void setRazaoSocial(String razaoSocial) { this.razaoSocial = razaoSocial; }

    public String getNomeFantasia() { return nomeFantasia; }
    public void setNomeFantasia(String nomeFantasia) { this.nomeFantasia = nomeFantasia; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public RegimeTributario getRegime() { return regime; }
    public void setRegime(RegimeTributario regime) { this.regime = regime; }

    public String getSegmento() { return segmento; }
    public void setSegmento(String segmento) { this.segmento = segmento; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getUf() { return uf; }
    public void setUf(String uf) { this.uf = uf; }

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }

    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }

    public String getSituacaoCadastral() { return situacaoCadastral; }
    public void setSituacaoCadastral(String situacaoCadastral) { this.situacaoCadastral = situacaoCadastral; }

    public LocalDate getDataSituacao() { return dataSituacao; }
    public void setDataSituacao(LocalDate dataSituacao) { this.dataSituacao = dataSituacao; }

    public LocalDate getDataInicioAtividade() { return dataInicioAtividade; }
    public void setDataInicioAtividade(LocalDate dataInicioAtividade) { this.dataInicioAtividade = dataInicioAtividade; }

    public LocalDate getDataBaixa() { return dataBaixa; }
    public void setDataBaixa(LocalDate dataBaixa) { this.dataBaixa = dataBaixa; }

    public OffsetDateTime getDataConsultaReceita() { return dataConsultaReceita; }
    public void setDataConsultaReceita(OffsetDateTime dataConsultaReceita) { this.dataConsultaReceita = dataConsultaReceita; }

    public List<Socio> getSocios() { return socios; }
    public void setSocios(List<Socio> socios) { this.socios = socios; }

    public OffsetDateTime getCriadoEm() { return criadoEm; }
    public OffsetDateTime getAtualizadoEm() { return atualizadoEm; }
}
