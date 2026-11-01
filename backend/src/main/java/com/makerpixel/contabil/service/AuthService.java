package com.makerpixel.contabil.service;

import com.makerpixel.contabil.config.JwtTokenProvider;
import com.makerpixel.contabil.domain.Escritorio;
import com.makerpixel.contabil.domain.Perfil;
import com.makerpixel.contabil.domain.SituacaoEscritorio;
import com.makerpixel.contabil.domain.Usuario;
import com.makerpixel.contabil.dto.AuthDTOs.*;
import com.makerpixel.contabil.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern SENHA_FORTE_PATTERN = Pattern.compile("^(?=.*[a-zA-Z])(?=.*\\d).{8,}$");

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(
        UsuarioRepository usuarioRepository,
        PasswordEncoder passwordEncoder,
        JwtTokenProvider tokenProvider
    ) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    public static void validarRegrasSenha(String senha) {
        if (senha == null || !SENHA_FORTE_PATTERN.matcher(senha).matches()) {
            throw new ResponseStatusException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "A senha deve conter no mínimo 8 caracteres, combinando letras e números."
            );
        }
    }

    @Transactional(readOnly = true)
    public LoginResponse autenticar(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(request.email().trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos."));

        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário desativado.");
        }

        if (!passwordEncoder.matches(request.senha(), usuario.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos.");
        }

        Escritorio escritorio = usuario.getEscritorio();
        Long diasRestantes = null;
        boolean testeAtivo = false;
        boolean suporteAtivo = false;
        String nomeEscritorio = "MakerPixel Gestão";

        if (escritorio != null) {
            nomeEscritorio = escritorio.getRazaoSocial();

            if (escritorio.getSituacao() == SituacaoEscritorio.SUSPENSO) {
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Acesso suspenso: fale com a MakerPixel via WhatsApp."
                );
            }

            if (escritorio.getSituacao() == SituacaoEscritorio.TESTE) {
                if (escritorio.isTesteExpirado()) {
                    throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Seu período de teste terminou. Fale com a MakerPixel para continuar."
                    );
                }
                testeAtivo = true;
                if (escritorio.getTesteExpiraEm() != null) {
                    long diff = Duration.between(OffsetDateTime.now(), escritorio.getTesteExpiraEm()).toDays();
                    diasRestantes = Math.max(0, diff + 1);
                }
            }

            suporteAtivo = escritorio.isSuporteAtivo();
        }

        String token = tokenProvider.generateToken(
            usuario.getId(),
            usuario.getEmail(),
            usuario.getPerfil(),
            escritorio != null ? escritorio.getId() : null
        );

        return new LoginResponse(
            token,
            usuario.getId(),
            usuario.getNome(),
            usuario.getEmail(),
            usuario.getPerfil(),
            escritorio != null ? escritorio.getId() : null,
            nomeEscritorio,
            Boolean.TRUE.equals(usuario.getTrocarSenhaPrimeiroAcesso()),
            testeAtivo,
            diasRestantes,
            suporteAtivo
        );
    }

    @Transactional
    public void trocarSenha(Usuario usuario, TrocaSenhaRequest request) {
        if (!passwordEncoder.matches(request.senhaAtual(), usuario.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha atual incorreta.");
        }

        validarRegrasSenha(request.novaSenha());

        usuario.setSenhaHash(passwordEncoder.encode(request.novaSenha()));
        usuario.setTrocarSenhaPrimeiroAcesso(false);
        usuarioRepository.save(usuario);
    }
}
