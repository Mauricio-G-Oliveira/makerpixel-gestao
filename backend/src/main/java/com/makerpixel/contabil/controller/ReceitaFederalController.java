package com.makerpixel.contabil.controller;

import com.makerpixel.contabil.dto.ReceitaCnpjResponse;
import com.makerpixel.contabil.service.ReceitaFederalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/receita")
public class ReceitaFederalController {

    private final ReceitaFederalService receitaService;

    public ReceitaFederalController(ReceitaFederalService receitaService) {
        this.receitaService = receitaService;
    }

    @GetMapping("/cnpj/{cnpj}")
    public ResponseEntity<ReceitaCnpjResponse> consultarCnpj(@PathVariable String cnpj) {
        ReceitaCnpjResponse response = receitaService.consultarCnpj(cnpj);
        return ResponseEntity.ok(response);
    }
}
