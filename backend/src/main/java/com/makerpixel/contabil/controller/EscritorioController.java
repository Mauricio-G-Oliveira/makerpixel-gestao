package com.makerpixel.contabil.controller;

import com.makerpixel.contabil.config.TenantContext;
import com.makerpixel.contabil.domain.Escritorio;
import com.makerpixel.contabil.dto.EscritorioDTOs.*;
import com.makerpixel.contabil.repository.EscritorioRepository;
import com.makerpixel.contabil.service.EscritorioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class EscritorioController {

    private final EscritorioService escritorioService;
    private final EscritorioRepository escritorioRepository;

    public EscritorioController(
        EscritorioService escritorioService,
        EscritorioRepository escritorioRepository
    ) {
        this.escritorioService = escritorioService;
        this.escritorioRepository = escritorioRepository;
    }

    @GetMapping("/admin/escritorios")
    @PreAuthorize("hasRole('ADMIN_PRODUTO')")
    public ResponseEntity<List<EscritorioResponse>> listarTodos() {
        List<EscritorioResponse> list = escritorioRepository.findAll().stream()
            .map(this::toResponse)
            .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/admin/escritorios/teste")
    @PreAuthorize("hasRole('ADMIN_PRODUTO')")
    public ResponseEntity<ConviteResponse> criarTeste(@Valid @RequestBody CriarAcessoTesteRequest request) {
        UUID adminId = TenantContext.getUserId();
        ConviteResponse convite = escritorioService.criarAcessoTeste(request, adminId);
        return ResponseEntity.status(HttpStatus.CREATED).body(convite);
    }

    @PostMapping("/admin/escritorios/{id}/prorrogar")
    @PreAuthorize("hasRole('ADMIN_PRODUTO')")
    public ResponseEntity<Void> prorrogarTeste(
        @PathVariable UUID id,
        @Valid @RequestBody ProrrogarTesteRequest request
    ) {
        UUID adminId = TenantContext.getUserId();
        escritorioService.prorrogarTeste(id, request.diasAdicionais(), adminId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin/escritorios/{id}/converter")
    @PreAuthorize("hasRole('ADMIN_PRODUTO')")
    public ResponseEntity<Void> converterCliente(
        @PathVariable UUID id,
        @RequestParam(defaultValue = "false") boolean limparExemplos
    ) {
        UUID adminId = TenantContext.getUserId();
        escritorioService.converterEmCliente(id, limparExemplos, adminId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin/escritorios/{id}/suspender")
    @PreAuthorize("hasRole('ADMIN_PRODUTO')")
    public ResponseEntity<Void> suspender(@PathVariable UUID id) {
        UUID adminId = TenantContext.getUserId();
        escritorioService.suspender(id, adminId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin/escritorios/{id}/reativar")
    @PreAuthorize("hasRole('ADMIN_PRODUTO')")
    public ResponseEntity<Void> reativar(@PathVariable UUID id) {
        UUID adminId = TenantContext.getUserId();
        escritorioService.reativar(id, adminId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/escritorios/suporte/liberar-24h")
    @PreAuthorize("hasAnyRole('ADMIN_ESCRITORIO', 'ADMIN_PRODUTO')")
    public ResponseEntity<Void> liberarSuporte24h() {
        UUID escritorioId = TenantContext.getEscritorioId();
        if (escritorioId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escritório não identificado na sessão.");
        }
        UUID usuarioId = TenantContext.getUserId();
        escritorioService.liberarSuporte24h(escritorioId, usuarioId);
        return ResponseEntity.noContent().build();
    }

    private EscritorioResponse toResponse(Escritorio e) {
        Long diasRestantes = null;
        if (e.getTesteExpiraEm() != null) {
            long diff = Duration.between(OffsetDateTime.now(), e.getTesteExpiraEm()).toDays();
            diasRestantes = Math.max(0, diff + 1);
        }

        return new EscritorioResponse(
            e.getId(),
            e.getCnpj(),
            e.getRazaoSocial(),
            e.getContato(),
            e.getEmail(),
            e.getTelefone(),
            e.getCidade(),
            e.getUf(),
            e.getSituacao(),
            e.getTesteExpiraEm(),
            diasRestantes,
            e.isTesteExpirado(),
            e.getModulosAtivos(),
            e.getMaxUsuarios(),
            e.getMaxEmpresas(),
            e.isSuporteAtivo(),
            e.getCriadoEm()
        );
    }
}
