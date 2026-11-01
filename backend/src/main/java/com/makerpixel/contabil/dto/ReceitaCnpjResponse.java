package com.makerpixel.contabil.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ReceitaCnpjResponse {

    private String cnpj;

    @JsonProperty("razao_social")
    private String razaoSocial;

    @JsonProperty("nome_fantasia")
    private String nomeFantasia;

    @JsonProperty("descricao_situacao_cadastral")
    private String situacaoCadastral;

    @JsonProperty("data_situacao_cadastral")
    private String dataSituacao;

    @JsonProperty("data_inicio_atividade")
    private String dataInicioAtividade;

    @JsonProperty("descricao_tipo_de_logradouro")
    private String tipoLogradouro;

    private String logradouro;
    private String numero;
    private String complemento;
    private String bairro;
    private String cep;
    private String municipio;
    private String uf;
    private String ddd_telefone_1;

    @JsonProperty("cnae_fiscal")
    private String cnaeFiscal;

    @JsonProperty("cnae_fiscal_descricao")
    private String cnaeFiscalDescricao;

    @JsonProperty("opcao_pelo_simples")
    private Boolean opcaoPeloSimples;

    @JsonProperty("opcao_pelo_mei")
    private Boolean opcaoPeloMei;

    private List<SocioQsaDTO> qsa;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SocioQsaDTO {
        @JsonProperty("nome_socio")
        private String nome;

        @JsonProperty("cnpj_cpf_do_socio")
        private String cpfCnpj;

        @JsonProperty("qualificacao_socio")
        private String qualificacao;

        public String getNome() { return nome; }
        public void setNome(String nome) { this.nome = nome; }
        public String getCpfCnpj() { return cpfCnpj; }
        public void setCpfCnpj(String cpfCnpj) { this.cpfCnpj = cpfCnpj; }
        public String getQualificacao() { return qualificacao; }
        public void setQualificacao(String qualificacao) { this.qualificacao = qualificacao; }
    }

    // Getters and Setters
    public String getCnpj() { return cnpj; }
    public void setCnpj(String cnpj) { this.cnpj = cnpj; }

    public String getRazaoSocial() { return razaoSocial; }
    public void setRazaoSocial(String razaoSocial) { this.razaoSocial = razaoSocial; }

    public String getNomeFantasia() { return nomeFantasia; }
    public void setNomeFantasia(String nomeFantasia) { this.nomeFantasia = nomeFantasia; }

    public String getSituacaoCadastral() { return situacaoCadastral; }
    public void setSituacaoCadastral(String situacaoCadastral) { this.situacaoCadastral = situacaoCadastral; }

    public String getDataSituacao() { return dataSituacao; }
    public void setDataSituacao(String dataSituacao) { this.dataSituacao = dataSituacao; }

    public String getDataInicioAtividade() { return dataInicioAtividade; }
    public void setDataInicioAtividade(String dataInicioAtividade) { this.dataInicioAtividade = dataInicioAtividade; }

    public String getTipoLogradouro() { return tipoLogradouro; }
    public void setTipoLogradouro(String tipoLogradouro) { this.tipoLogradouro = tipoLogradouro; }

    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public String getComplemento() { return complemento; }
    public void setComplemento(String complemento) { this.complemento = complemento; }

    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getMunicipio() { return municipio; }
    public void setMunicipio(String municipio) { this.municipio = municipio; }

    public String getUf() { return uf; }
    public void setUf(String uf) { this.uf = uf; }

    public String getDdd_telefone_1() { return ddd_telefone_1; }
    public void setDdd_telefone_1(String ddd_telefone_1) { this.ddd_telefone_1 = ddd_telefone_1; }

    public String getCnaeFiscal() { return cnaeFiscal; }
    public void setCnaeFiscal(String cnaeFiscal) { this.cnaeFiscal = cnaeFiscal; }

    public String getCnaeFiscalDescricao() { return cnaeFiscalDescricao; }
    public void setCnaeFiscalDescricao(String cnaeFiscalDescricao) { this.cnaeFiscalDescricao = cnaeFiscalDescricao; }

    public Boolean getOpcaoPeloSimples() { return opcaoPeloSimples; }
    public void setOpcaoPeloSimples(Boolean opcaoPeloSimples) { this.opcaoPeloSimples = opcaoPeloSimples; }

    public Boolean getOpcaoPeloMei() { return opcaoPeloMei; }
    public void setOpcaoPeloMei(Boolean opcaoPeloMei) { this.opcaoPeloMei = opcaoPeloMei; }

    public List<SocioQsaDTO> getQsa() { return qsa; }
    public void setQsa(List<SocioQsaDTO> qsa) { this.qsa = qsa; }
}
