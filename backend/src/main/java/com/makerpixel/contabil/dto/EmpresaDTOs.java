package com.makerpixel.contabil.dto;

import com.makerpixel.contabil.domain.RegimeTributario;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class EmpresaDTOs {

    public record SocioDTO(
        UUID id,
        @NotBlank String nome,
        String cpf,
        BigDecimal percentual,
        LocalDate dataEntrada,
        LocalDate dataSaida
    ) {}

    public record EmpresaRequest(
        @NotBlank(message = "CNPJ é obrigatório")
        String cnpj,

        @NotBlank(message = "Razão Social é obrigatória")
        String razaoSocial,

        String nomeFantasia,
        String codigo,

        @NotNull(message = "Regime tributário é obrigatório")
        RegimeTributario regime,

        String segmento,
        String cidade,
        String uf,
        String cep,
        String logradouro,
        String numero,
        String bairro,
        String telefone,
        String situacaoCadastral,
        LocalDate dataSituacao,
        LocalDate dataInicioAtividade,
        List<SocioDTO> socios
    ) {}

    public record EmpresaResponse(
        UUID id,
        UUID escritorioId,
        String cnpj,
        String razaoSocial,
        String nomeFantasia,
        String codigo,
        RegimeTributario regime,
        String segmento,
        String cidade,
        String uf,
        String cep,
        String logradouro,
        String numero,
        String bairro,
        String telefone,
        String situacaoCadastral,
        LocalDate dataSituacao,
        LocalDate dataInicioAtividade,
        LocalDate dataBaixa,
        OffsetDateTime dataConsultaReceita,
        boolean matriz,
        List<SocioDTO> socios
    ) {}
}
