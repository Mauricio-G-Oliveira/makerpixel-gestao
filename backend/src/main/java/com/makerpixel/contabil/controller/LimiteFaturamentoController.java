package com.makerpixel.contabil.controller;

import com.makerpixel.contabil.dto.LimiteDTOs.LimiteCalculadoResponse;
import com.makerpixel.contabil.service.LimiteFaturamentoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/limites")
public class LimiteFaturamentoController {

    private final LimiteFaturamentoService limiteService;

    public LimiteFaturamentoController(LimiteFaturamentoService limiteService) {
        this.limiteService = limiteService;
    }

    @GetMapping("/empresa/{empresaId}")
    public ResponseEntity<LimiteCalculadoResponse> calcularLimite(
        @PathVariable UUID empresaId,
        @RequestParam(defaultValue = "2026") int ano
    ) {
        LimiteCalculadoResponse response = limiteService.calcularLimite(empresaId, ano);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }
}
