package com.makerpixel.contabil.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ReceitaFederalServiceTest {

    @Test
    @DisplayName("Validação de dígitos verificadores de CNPJ")
    void valida_digitos_cnpj() {
        // CNPJs válidos
        assertTrue(ReceitaFederalService.validarCnpj("12.345.678/0001-95"));
        assertTrue(ReceitaFederalService.validarCnpj("00.000.000/0001-91")); // Banco do Brasil
        assertTrue(ReceitaFederalService.validarCnpj("33.000.167/0001-01")); // Petrobras

        // CNPJs inválidos
        assertFalse(ReceitaFederalService.validarCnpj("12.345.678/0001-00"));
        assertFalse(ReceitaFederalService.validarCnpj("11.111.111/1111-11"));
        assertFalse(ReceitaFederalService.validarCnpj("123"));
        assertFalse(ReceitaFederalService.validarCnpj(null));
    }
}
