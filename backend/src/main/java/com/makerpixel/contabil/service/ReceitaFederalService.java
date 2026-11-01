package com.makerpixel.contabil.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makerpixel.contabil.domain.CnpjCache;
import com.makerpixel.contabil.dto.ReceitaCnpjResponse;
import com.makerpixel.contabil.repository.CnpjCacheRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

@Service
public class ReceitaFederalService {

    private final CnpjCacheRepository cacheRepository;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final int cacheTtlHours;

    public ReceitaFederalService(
        CnpjCacheRepository cacheRepository,
        ObjectMapper objectMapper,
        @Value("${makerpixel.receita.brasil-api-url:https://brasilapi.com.br/api/cnpj/v1}") String apiUrl,
        @Value("${makerpixel.receita.timeout-seconds:12}") int timeoutSeconds,
        @Value("${makerpixel.receita.cache-ttl-hours:24}") int cacheTtlHours
    ) {
        this.cacheRepository = cacheRepository;
        this.objectMapper = objectMapper;
        this.cacheTtlHours = cacheTtlHours;

        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
            .baseUrl(apiUrl)
            .requestFactory(requestFactory)
            .build();
    }

    public static boolean validarCnpj(String cnpj) {
        if (cnpj == null) return false;
        String limpo = cnpj.replaceAll("\\D", "");
        if (limpo.length() != 14) return false;
        if (limpo.chars().distinct().count() == 1) return false;

        int[] pesos1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int[] pesos2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};

        int soma1 = 0;
        for (int i = 0; i < 12; i++) {
            soma1 += (limpo.charAt(i) - '0') * pesos1[i];
        }
        int resto1 = soma1 % 11;
        int d1 = resto1 < 2 ? 0 : 11 - resto1;
        if (d1 != (limpo.charAt(12) - '0')) return false;

        int soma2 = 0;
        for (int i = 0; i < 13; i++) {
            soma2 += (limpo.charAt(i) - '0') * pesos2[i];
        }
        int resto2 = soma2 % 11;
        int d2 = resto2 < 2 ? 0 : 11 - resto2;
        return d2 == (limpo.charAt(13) - '0');
    }

    @Transactional
    public ReceitaCnpjResponse consultarCnpj(String cnpjRaw) {
        String cnpj = cnpjRaw != null ? cnpjRaw.replaceAll("\\D", "") : "";

        if (!validarCnpj(cnpj)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "CNPJ inválido (dígitos verificadores incorretos).");
        }

        // Cache de 24h
        var cacheOpt = cacheRepository.findByCnpj(cnpj);
        if (cacheOpt.isPresent() && !cacheOpt.get().isExpirado()) {
            try {
                return objectMapper.readValue(cacheOpt.get().getPayloadJson(), ReceitaCnpjResponse.class);
            } catch (Exception ignored) {}
        }

        try {
            String jsonResponse = restClient.get()
                .uri("/{cnpj}", cnpj)
                .retrieve()
                .body(String.class);

            if (jsonResponse == null || jsonResponse.isBlank()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CNPJ não encontrado na base da Receita.");
            }

            ReceitaCnpjResponse response = objectMapper.readValue(jsonResponse, ReceitaCnpjResponse.class);

            // Salvar ou atualizar cache
            CnpjCache cacheItem = cacheOpt.orElseGet(() -> new CnpjCache(cnpj, jsonResponse, cacheTtlHours));
            cacheItem.setPayloadJson(jsonResponse);
            cacheItem.setExpiraEm(java.time.OffsetDateTime.now().plusHours(cacheTtlHours));
            cacheRepository.save(cacheItem);

            return response;

        } catch (HttpClientErrorException.NotFound e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CNPJ não encontrado na base da Receita.");
        } catch (HttpClientErrorException.TooManyRequests e) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Muitas consultas seguidas. Espere um minuto.");
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "A Receita demorou para responder.");
        } catch (HttpServerErrorException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Serviço da Receita Federal temporariamente indisponível.");
        } catch (Exception e) {
            if (e instanceof ResponseStatusException rse) throw rse;
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao consultar CNPJ: " + e.getMessage());
        }
    }
}
