package com.makerpixel.contabil.service;

import com.makerpixel.contabil.config.TenantContext;
import com.makerpixel.contabil.domain.Empresa;
import com.makerpixel.contabil.domain.RegimeTributario;
import com.makerpixel.contabil.domain.Socio;
import com.makerpixel.contabil.dto.EmpresaDTOs.*;
import com.makerpixel.contabil.dto.ReceitaCnpjResponse;
import com.makerpixel.contabil.repository.EmpresaRepository;
import com.makerpixel.contabil.repository.SocioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EmpresaService {

    private final EmpresaRepository empresaRepository;
    private final SocioRepository socioRepository;
    private final ReceitaFederalService receitaService;

    public EmpresaService(
        EmpresaRepository empresaRepository,
        SocioRepository socioRepository,
        ReceitaFederalService receitaService
    ) {
        this.empresaRepository = empresaRepository;
        this.socioRepository = socioRepository;
        this.receitaService = receitaService;
    }

    @Transactional(readOnly = true)
    public List<EmpresaResponse> listarPorEscritorio() {
        UUID escritorioId = TenantContext.getEscritorioId();
        return empresaRepository.findByEscritorioId(escritorioId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public EmpresaResponse buscarPorId(UUID id) {
        UUID escritorioId = TenantContext.getEscritorioId();
        Empresa empresa = empresaRepository.findByIdAndEscritorioId(id, escritorioId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada neste escritório."));
        return toResponse(empresa);
    }

    @Transactional
    public EmpresaResponse criar(EmpresaRequest request) {
        UUID escritorioId = TenantContext.getEscritorioId();
        String cnpjLimpo = request.cnpj().replaceAll("\\D", "");

        if (empresaRepository.findByEscritorioIdAndCnpj(escritorioId, cnpjLimpo).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Empresa com este CNPJ já cadastrada neste escritório.");
        }

        Empresa empresa = new Empresa();
        empresa.setEscritorioId(escritorioId);
        empresa.setCnpj(cnpjLimpo);
        preencherDados(empresa, request);

        empresa = empresaRepository.save(empresa);
        return toResponse(empresa);
    }

    @Transactional
    public EmpresaResponse atualizarComReceita(UUID id) {
        UUID escritorioId = TenantContext.getEscritorioId();
        Empresa empresa = empresaRepository.findByIdAndEscritorioId(id, escritorioId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada."));

        ReceitaCnpjResponse receita = receitaService.consultarCnpj(empresa.getCnpj());

        // Preencher somente campos vazios
        if (empresa.getRazaoSocial() == null || empresa.getRazaoSocial().isBlank()) {
            empresa.setRazaoSocial(receita.getRazaoSocial());
        }
        if ((empresa.getNomeFantasia() == null || empresa.getNomeFantasia().isBlank()) && receita.getNomeFantasia() != null) {
            empresa.setNomeFantasia(receita.getNomeFantasia());
        }
        if ((empresa.getCidade() == null || empresa.getCidade().isBlank()) && receita.getMunicipio() != null) {
            empresa.setCidade(receita.getMunicipio());
        }
        if ((empresa.getUf() == null || empresa.getUf().isBlank()) && receita.getUf() != null) {
            empresa.setUf(receita.getUf());
        }
        if ((empresa.getCep() == null || empresa.getCep().isBlank()) && receita.getCep() != null) {
            empresa.setCep(receita.getCep().replaceAll("\\D", ""));
        }
        if ((empresa.getLogradouro() == null || empresa.getLogradouro().isBlank()) && receita.getLogradouro() != null) {
            String logradouroCompleto = (receita.getTipoLogradouro() != null ? receita.getTipoLogradouro() + " " : "") + receita.getLogradouro();
            empresa.setLogradouro(logradouroCompleto.trim());
        }
        if ((empresa.getNumero() == null || empresa.getNumero().isBlank()) && receita.getNumero() != null) {
            empresa.setNumero(receita.getNumero());
        }
        if ((empresa.getBairro() == null || empresa.getBairro().isBlank()) && receita.getBairro() != null) {
            empresa.setBairro(receita.getBairro());
        }
        if ((empresa.getTelefone() == null || empresa.getTelefone().isBlank()) && receita.getDdd_telefone_1() != null) {
            empresa.setTelefone(receita.getDdd_telefone_1());
        }

        // Sugestão de regime se ainda não definido
        if (empresa.getRegime() == null || empresa.getRegime() == RegimeTributario.OUTRO) {
            if (Boolean.TRUE.equals(receita.getOpcaoPeloMei())) {
                empresa.setRegime(RegimeTributario.MEI);
            } else if (Boolean.TRUE.equals(receita.getOpcaoPeloSimples())) {
                empresa.setRegime(RegimeTributario.SIMPLES_NACIONAL);
            }
        }

        // Campos sempre atualizados
        if (receita.getSituacaoCadastral() != null) {
            empresa.setSituacaoCadastral(receita.getSituacaoCadastral().toUpperCase());
        }
        if (receita.getDataSituacao() != null) {
            try { empresa.setDataSituacao(LocalDate.parse(receita.getDataSituacao())); } catch (Exception ignored) {}
        }
        if (receita.getDataInicioAtividade() != null) {
            try { empresa.setDataInicioAtividade(LocalDate.parse(receita.getDataInicioAtividade())); } catch (Exception ignored) {}
        }
        empresa.setDataConsultaReceita(OffsetDateTime.now());

        // Sócios do QSA (quando a empresa ainda não tem nenhum cadastrado)
        if (empresa.getSocios().isEmpty() && receita.getQsa() != null && !receita.getQsa().isEmpty()) {
            for (var socioQsa : receita.getQsa()) {
                Socio socio = new Socio();
                socio.setEmpresa(empresa);
                socio.setEscritorioId(escritorioId);
                socio.setNome(socioQsa.getNome());
                socio.setCpf(socioQsa.getCpfCnpj());
                empresa.getSocios().add(socio);
            }
        }

        empresa = empresaRepository.save(empresa);
        return toResponse(empresa);
    }

    private void preencherDados(Empresa empresa, EmpresaRequest request) {
        empresa.setRazaoSocial(request.razaoSocial().trim());
        empresa.setNomeFantasia(request.nomeFantasia());
        empresa.setCodigo(request.codigo());
        empresa.setRegime(request.regime());
        empresa.setSegmento(request.segmento());
        empresa.setCidade(request.cidade());
        empresa.setUf(request.uf());
        empresa.setCep(request.cep());
        empresa.setLogradouro(request.logradouro());
        empresa.setNumero(request.numero());
        empresa.setBairro(request.bairro());
        empresa.setTelefone(request.telefone());
        if (request.situacaoCadastral() != null) empresa.setSituacaoCadastral(request.situacaoCadastral());
        empresa.setDataSituacao(request.dataSituacao());
        empresa.setDataInicioAtividade(request.dataInicioAtividade());
    }

    private EmpresaResponse toResponse(Empresa e) {
        List<SocioDTO> sociosDTO = e.getSocios().stream()
            .map(s -> new SocioDTO(s.getId(), s.getNome(), s.getCpf(), s.getPercentual(), s.getDataEntrada(), s.getDataSaida()))
            .toList();

        return new EmpresaResponse(
            e.getId(),
            e.getEscritorioId(),
            e.getCnpj(),
            e.getRazaoSocial(),
            e.getNomeFantasia(),
            e.getCodigo(),
            e.getRegime(),
            e.getSegmento(),
            e.getCidade(),
            e.getUf(),
            e.getCep(),
            e.getLogradouro(),
            e.getNumero(),
            e.getBairro(),
            e.getTelefone(),
            e.getSituacaoCadastral(),
            e.getDataSituacao(),
            e.getDataInicioAtividade(),
            e.getDataBaixa(),
            e.getDataConsultaReceita(),
            e.isMatriz(),
            sociosDTO
        );
    }
}
