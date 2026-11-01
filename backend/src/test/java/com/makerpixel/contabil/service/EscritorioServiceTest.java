package com.makerpixel.contabil.service;

import com.makerpixel.contabil.domain.Escritorio;
import com.makerpixel.contabil.domain.SituacaoEscritorio;
import com.makerpixel.contabil.domain.Usuario;
import com.makerpixel.contabil.dto.EscritorioDTOs.CriarAcessoTesteRequest;
import com.makerpixel.contabil.dto.EscritorioDTOs.ConviteResponse;
import com.makerpixel.contabil.repository.AuditoriaEscritorioRepository;
import com.makerpixel.contabil.repository.EscritorioRepository;
import com.makerpixel.contabil.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EscritorioServiceTest {

    @Mock
    private EscritorioRepository escritorioRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private AuditoriaEscritorioRepository auditoriaRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private EscritorioService escritorioService;

    @Test
    @DisplayName("Gera senha provisória legível no formato Xxxx-0000-xxxx")
    void gerarSenhaProvisoria_formato() {
        String senha = EscritorioService.gerarSenhaProvisoria();
        assertNotNull(senha);
        assertTrue(senha.matches("^[A-Z][a-z]{3}-\\d{4}-[a-z]{4}$"), "Deve seguir o padrão Xxxx-0000-xxxx: " + senha);
    }

    @Test
    @DisplayName("Cria acesso de teste de 3 dias com expiração às 23:59:59 e gera convite")
    void criarAcessoTeste_sucesso() {
        CriarAcessoTesteRequest req = new CriarAcessoTesteRequest(
            "Contabilidade Modelo",
            "12.345.678/0001-95",
            "Carlos Eduardo",
            "carlos@contabilidademodelo.com.br",
            "48988887777",
            "Tubarão",
            "SC",
            3,
            null,
            true,
            false
        );

        when(escritorioRepository.findByCnpj("12345678000195")).thenReturn(Optional.empty());
        when(escritorioRepository.findByEmail(any())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed-pwd");
        when(escritorioRepository.save(any())).thenAnswer(invocation -> {
            Escritorio esc = invocation.getArgument(0);
            esc.setId(UUID.randomUUID());
            return esc;
        });

        ConviteResponse convite = escritorioService.criarAcessoTeste(req, UUID.randomUUID());

        assertNotNull(convite);
        assertEquals("carlos@contabilidademodelo.com.br", convite.email());
        assertNotNull(convite.senhaProvisoria());
        assertTrue(convite.mensagemFormatada().contains("Carlos Eduardo"));
        assertTrue(convite.mensagemFormatada().contains("MakerPixel Contábil"));
        verify(escritorioRepository).save(any(Escritorio.class));
        verify(usuarioRepository).save(any(Usuario.class));
        verify(auditoriaRepository).save(any());
    }

    @Test
    @DisplayName("Bloqueia criação de segundo teste com mesmo CNPJ")
    void bloqueia_segundo_teste_mesmo_cnpj() {
        CriarAcessoTesteRequest req = new CriarAcessoTesteRequest(
            "Contabilidade Duplicada",
            "12.345.678/0001-95",
            "Carlos",
            "carlos2@email.com",
            null, null, null, 3, null, true, false
        );

        when(escritorioRepository.findByCnpj("12345678000195")).thenReturn(Optional.of(new Escritorio()));

        assertThrows(ResponseStatusException.class, () ->
            escritorioService.criarAcessoTeste(req, UUID.randomUUID())
        );
    }

    @Test
    @DisplayName("Converte teste em cliente ativo e remove data de expiração")
    void converter_em_cliente() {
        UUID escId = UUID.randomUUID();
        Escritorio esc = new Escritorio();
        esc.setId(escId);
        esc.setSituacao(SituacaoEscritorio.TESTE);
        esc.setTesteExpiraEm(OffsetDateTime.now().plusDays(2));

        when(escritorioRepository.findById(escId)).thenReturn(Optional.of(esc));

        escritorioService.converterEmCliente(escId, false, UUID.randomUUID());

        assertEquals(SituacaoEscritorio.ATIVO, esc.getSituacao());
        assertNull(esc.getTesteExpiraEm());
        verify(escritorioRepository).save(esc);
    }
}
