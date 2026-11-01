package com.makerpixel.contabil.dto;

import com.makerpixel.contabil.domain.SituacaoEscritorio;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import java.util.UUID;

public class EscritorioDTOs {

    public record CriarAcessoTesteRequest(
        @NotBlank(message = "Razão social ou nome do escritório é obrigatório")
        String nome,

        @NotBlank(message = "CNPJ é obrigatório")
        String cnpj,

        @NotBlank(message = "Nome do responsável é obrigatório")
        String responsavel,

        @NotBlank(message = "E-mail do responsável é obrigatório")
        String email,

        String telefone,
        String cidade,
        String uf,

        @Min(value = 1, message = "Duração mínima é de 1 dia")
        @Max(value = 30, message = "Duração máxima é de 30 dias")
        Integer dias,

        String senhaInicial,
        Boolean trocarSenhaPrimeiroAcesso,
        Boolean carregarExemplos
    ) {}

    public record ProrrogarTesteRequest(
        @Min(value = 1, message = "Prorrogação mínima é de 1 dia")
        @Max(value = 30, message = "Prorrogação máxima é de 30 dias")
        int diasAdicionais
    ) {}

    public record EscritorioResponse(
        UUID id,
        String cnpj,
        String razaoSocial,
        String contato,
        String email,
        String telefone,
        String cidade,
        String uf,
        SituacaoEscritorio situacao,
        OffsetDateTime testeExpiraEm,
        Long diasRestantes,
        boolean expirado,
        String[] modulosAtivos,
        int maxUsuarios,
        int maxEmpresas,
        boolean suporteLiberado,
        OffsetDateTime criadoEm
    ) {}

    public record ConviteResponse(
        String linkAcesso,
        String email,
        String senhaProvisoria,
        String validadeFormatada,
        String mensagemFormatada,
        String whatsappLink
    ) {}
}
