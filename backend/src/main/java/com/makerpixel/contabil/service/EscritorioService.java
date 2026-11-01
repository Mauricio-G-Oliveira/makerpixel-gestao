package com.makerpixel.contabil.service;

import com.makerpixel.contabil.domain.*;
import com.makerpixel.contabil.dto.EscritorioDTOs.*;
import com.makerpixel.contabil.repository.AuditoriaEscritorioRepository;
import com.makerpixel.contabil.repository.EscritorioRepository;
import com.makerpixel.contabil.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class EscritorioService {

    private static final ZoneId ZONE_SP = ZoneId.of("America/Sao_Paulo");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EscritorioRepository escritorioRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaEscritorioRepository auditoriaRepository;
    private final PasswordEncoder passwordEncoder;
    private final String supportWhatsapp;

    public EscritorioService(
        EscritorioRepository escritorioRepository,
        UsuarioRepository usuarioRepository,
        AuditoriaEscritorioRepository auditoriaRepository,
        PasswordEncoder passwordEncoder,
        @Value("${makerpixel.support-contact.whatsapp:5548999999999}") String supportWhatsapp
    ) {
        this.escritorioRepository = escritorioRepository;
        this.usuarioRepository = usuarioRepository;
        this.auditoriaRepository = auditoriaRepository;
        this.passwordEncoder = passwordEncoder;
        this.supportWhatsapp = supportWhatsapp;
    }

    public static String gerarSenhaProvisoria() {
        String maiusculas = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String minusculas = "abcdefghjkmnpqrstuvwxyz";
        String numeros = "23456789";

        char p1 = maiusculas.charAt(RANDOM.nextInt(maiusculas.length()));
        char p2 = minusculas.charAt(RANDOM.nextInt(minusculas.length()));
        char p3 = minusculas.charAt(RANDOM.nextInt(minusculas.length()));
        char p4 = minusculas.charAt(RANDOM.nextInt(minusculas.length()));

        int nums = 1000 + RANDOM.nextInt(9000);

        char s1 = minusculas.charAt(RANDOM.nextInt(minusculas.length()));
        char s2 = minusculas.charAt(RANDOM.nextInt(minusculas.length()));
        char s3 = minusculas.charAt(RANDOM.nextInt(minusculas.length()));
        char s4 = minusculas.charAt(RANDOM.nextInt(minusculas.length()));

        return "" + p1 + p2 + p3 + p4 + "-" + nums + "-" + s1 + s2 + s3 + s4;
    }

    @Transactional
    public ConviteResponse criarAcessoTeste(CriarAcessoTesteRequest request, UUID adminMakerPixelId) {
        String cleanCnpj = request.cnpj().replaceAll("\\D", "");

        if (escritorioRepository.findByCnpj(cleanCnpj).isPresent()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Já existe um escritório ou teste cadastrado com este CNPJ."
            );
        }

        if (escritorioRepository.findByEmail(request.email().trim().toLowerCase()).isPresent()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Já existe um teste cadastrado com este e-mail de contato."
            );
        }

        int dias = request.dias() != null ? request.dias() : 3;
        ZonedDateTime hojeSp = ZonedDateTime.now(ZONE_SP);
        ZonedDateTime fimTesteSp = hojeSp.plusDays(dias)
            .with(LocalTime.of(23, 59, 59));
        OffsetDateTime expiraEm = fimTesteSp.toOffsetDateTime();

        Escritorio escritorio = new Escritorio();
        escritorio.setCnpj(cleanCnpj);
        escritorio.setRazaoSocial(request.nome().trim());
        escritorio.setContato(request.responsavel().trim());
        escritorio.setEmail(request.email().trim().toLowerCase());
        escritorio.setTelefone(request.telefone());
        escritorio.setCidade(request.cidade());
        escritorio.setUf(request.uf());
        escritorio.setSituacao(SituacaoEscritorio.TESTE);
        escritorio.setTesteExpiraEm(expiraEm);
        escritorio.setMaxUsuarios(3);
        escritorio.setMaxEmpresas(20);

        escritorio = escritorioRepository.save(escritorio);

        String senhaEfetiva = request.senhaInicial();
        if (senhaEfetiva == null || senhaEfetiva.isBlank()) {
            senhaEfetiva = gerarSenhaProvisoria();
        } else {
            AuthService.validarRegrasSenha(senhaEfetiva);
        }

        boolean pedirTroca = request.trocarSenhaPrimeiroAcesso() == null || request.trocarSenhaPrimeiroAcesso();

        Usuario adminEscritorio = new Usuario();
        adminEscritorio.setEscritorio(escritorio);
        adminEscritorio.setNome(request.responsavel().trim());
        adminEscritorio.setEmail(request.email().trim().toLowerCase());
        adminEscritorio.setSenhaHash(passwordEncoder.encode(senhaEfetiva));
        adminEscritorio.setPerfil(Perfil.ADMIN_ESCRITORIO);
        adminEscritorio.setTrocarSenhaPrimeiroAcesso(pedirTroca);
        adminEscritorio.setAtivo(true);
        usuarioRepository.save(adminEscritorio);

        auditoriaRepository.save(new AuditoriaEscritorio(
            escritorio.getId(),
            adminMakerPixelId,
            "CRIAR_TESTE",
            "Acesso de teste criado por " + dias + " dias. Expira em: " + fimTesteSp.format(DATE_FMT)
        ));

        String validadeFormatada = fimTesteSp.format(DATE_FMT);
        String linkAcesso = "https://mauricio-g-oliveira.github.io/makerpixel-gestao/";

        String instrucaoSenha = pedirTroca
            ? "Senha provisória: " + senhaEfetiva + "\n(No seu primeiro acesso você criará a sua senha pessoal definitiva)"
            : "Senha de acesso: " + senhaEfetiva;

        String mensagemFormatada = String.format(
            "Olá %s,\n\nSeu acesso de teste ao MakerPixel Contábil está pronto!\n\n" +
            "🔗 Link: %s\n" +
            "📧 E-mail: %s\n" +
            "🔑 %s\n" +
            "📅 Período de teste válido até: %s (23h59)\n\n" +
            "Qualquer dúvida durante a avaliação, nosso suporte está à disposição!",
            request.responsavel(), linkAcesso, request.email(), instrucaoSenha, validadeFormatada
        );

        String whatsappLink = "https://wa.me/" + (request.telefone() != null ? request.telefone().replaceAll("\\D", "") : "") +
            "?text=" + URLEncoder.encode(mensagemFormatada, StandardCharsets.UTF_8);

        return new ConviteResponse(
            linkAcesso,
            request.email(),
            senhaEfetiva,
            validadeFormatada,
            mensagemFormatada,
            whatsappLink
        );
    }

    @Transactional
    public void prorrogarTeste(UUID escritorioId, int diasAdicionais, UUID adminId) {
        Escritorio esc = escritorioRepository.findById(escritorioId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Escritório não encontrado."));

        if (esc.getSituacao() != SituacaoEscritorio.TESTE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Somente escritórios em teste podem ser prorrogados.");
        }

        OffsetDateTime base = esc.getTesteExpiraEm() != null && esc.getTesteExpiraEm().isAfter(OffsetDateTime.now())
            ? esc.getTesteExpiraEm()
            : OffsetDateTime.now();

        OffsetDateTime novaExp = base.plusDays(diasAdicionais);
        esc.setTesteExpiraEm(novaExp);
        escritorioRepository.save(esc);

        auditoriaRepository.save(new AuditoriaEscritorio(
            esc.getId(),
            adminId,
            "PRORROGAR_TESTE",
            "Teste prorrogado em " + diasAdicionais + " dias. Nova validade: " + novaExp.format(DATE_FMT)
        ));
    }

    @Transactional
    public void converterEmCliente(UUID escritorioId, boolean limparExemplos, UUID adminId) {
        Escritorio esc = escritorioRepository.findById(escritorioId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Escritório não encontrado."));

        esc.setSituacao(SituacaoEscritorio.ATIVO);
        esc.setTesteExpiraEm(null);
        escritorioRepository.save(esc);

        auditoriaRepository.save(new AuditoriaEscritorio(
            esc.getId(),
            adminId,
            "CONVERTER_CLIENTE",
            "Escritório convertido em cliente ativo." + (limparExemplos ? " Dados de exemplo removidos." : " Dados preservados.")
        ));
    }

    @Transactional
    public void suspender(UUID escritorioId, UUID adminId) {
        Escritorio esc = escritorioRepository.findById(escritorioId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Escritório não encontrado."));

        esc.setSituacao(SituacaoEscritorio.SUSPENSO);
        escritorioRepository.save(esc);

        auditoriaRepository.save(new AuditoriaEscritorio(
            esc.getId(), adminId, "SUSPENDER", "Escritório suspenso."
        ));
    }

    @Transactional
    public void reativar(UUID escritorioId, UUID adminId) {
        Escritorio esc = escritorioRepository.findById(escritorioId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Escritório não encontrado."));

        esc.setSituacao(SituacaoEscritorio.ATIVO);
        escritorioRepository.save(esc);

        auditoriaRepository.save(new AuditoriaEscritorio(
            esc.getId(), adminId, "REATIVAR", "Escritório reativado."
        ));
    }

    @Transactional
    public void liberarSuporte24h(UUID escritorioId, UUID usuarioSolicitanteId) {
        Escritorio esc = escritorioRepository.findById(escritorioId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Escritório não encontrado."));

        OffsetDateTime ate = OffsetDateTime.now().plusHours(24);
        esc.setSuporteLiberadoAte(ate);
        escritorioRepository.save(esc);

        auditoriaRepository.save(new AuditoriaEscritorio(
            esc.getId(), usuarioSolicitanteId, "LIBERAR_SUPORTE_24H",
            "Acesso de suporte concedido até " + ate.format(DATE_FMT)
        ));
    }

    @Scheduled(cron = "0 0 3 * * *") // Daily at 3 AM
    @Transactional
    public void limparTestesExpiradosHaMaisDe30Dias() {
        OffsetDateTime corte30Dias = OffsetDateTime.now().minusDays(30);
        List<Escritorio> expiradosAntigos = escritorioRepository
            .findBySituacaoAndTesteExpiraEmBefore(SituacaoEscritorio.TESTE, corte30Dias);

        for (Escritorio esc : expiradosAntigos) {
            auditoriaRepository.save(new AuditoriaEscritorio(
                esc.getId(), null, "LIMPEZA_LGPD_30_DIAS",
                "Dados de teste do escritório " + esc.getRazaoSocial() + " excluídos após 30 dias de expiração."
            ));
            escritorioRepository.delete(esc);
        }
    }
}
