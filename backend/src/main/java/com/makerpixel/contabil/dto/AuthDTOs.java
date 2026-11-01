package com.makerpixel.contabil.dto;

import com.makerpixel.contabil.domain.Perfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public class AuthDTOs {

    public record LoginRequest(
        @NotBlank(message = "E-mail ou apelido é obrigatório")
        String email,

        @NotBlank(message = "Senha é obrigatória")
        String senha
    ) {}

    public record LoginResponse(
        String token,
        UUID usuarioId,
        String nome,
        String email,
        Perfil perfil,
        UUID escritorioId,
        String nomeEscritorio,
        boolean trocarSenhaPrimeiroAcesso,
        boolean testeAtivo,
        Long diasRestantesTeste,
        boolean suporteAtivo
    ) {}

    public record TrocaSenhaRequest(
        @NotBlank(message = "Senha atual é obrigatória")
        String senhaAtual,

        @NotBlank(message = "Nova senha é obrigatória")
        String novaSenha
    ) {}
}
