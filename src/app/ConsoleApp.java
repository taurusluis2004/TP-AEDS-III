package app;

import app.busca.BuscaService;
import app.busca.ItemEncontrado;
import app.busca.ResultadoBusca;
import app.controller.AlimentoController;
import app.controller.ConsumoController;
import app.controller.RefeicaoController;
import app.controller.UsuarioController;
import app.dao.AlimentoDAO;
import app.dao.ConsumoDAO;
import app.dao.RefeicaoDAO;
import app.dao.UsuarioDAO;
import app.model.Alimento;
import app.model.Consumo;
import app.model.Refeicao;
import app.model.Usuario;
import app.seguranca.CriptografiaXOR;
import java.time.LocalDate;
import java.util.*;

/**
 * ConsoleApp - CRUD via console para:
 * - Usuario
 * - Alimento
 * - Refeicao
 * - Consumo (tabela intermediária N:N)
 *
 * Versão compatível com Java que NÃO suporta "switch arrows" (case X -> ...).
 */
public class ConsoleApp {

    private final Scanner sc = new Scanner(System.in);

    private final UsuarioDAO usuarioDAO;
    private final AlimentoDAO alimentoDAO;
    private final RefeicaoDAO refeicaoDAO;
    private final ConsumoDAO consumoDAO;

    private final UsuarioController usuarioCtrl;
    private final AlimentoController alimentoCtrl;
    private final RefeicaoController refeicaoCtrl;
    private final ConsumoController consumoCtrl;

    public ConsoleApp() throws Exception {
        usuarioDAO = new UsuarioDAO();
        alimentoDAO = new AlimentoDAO();
        refeicaoDAO = new RefeicaoDAO();
        consumoDAO = new ConsumoDAO();

        usuarioCtrl = new UsuarioController(usuarioDAO);
        alimentoCtrl = new AlimentoController(alimentoDAO);
        refeicaoCtrl = new RefeicaoController(refeicaoDAO, usuarioDAO, consumoDAO); // valida FK + cascade
        consumoCtrl = new ConsumoController(consumoDAO, refeicaoDAO, alimentoDAO);
    }

    public void run() {
        try {
            while (true) {
                System.out.println("\n=== NutriTrack (CRUD Console) ===");
                System.out.println("1) Usuário (CRUD)");
                System.out.println("2) Alimento (CRUD)");
                System.out.println("3) Refeição (CRUD)");
                System.out.println("4) Consumo (CRUD / vínculo Refeição x Alimento)");
                System.out.println("5) Backup / Compressão (Huffman e LZW)");
                System.out.println("6) Pesquisar por padrão (KMP / BM)");
                System.out.println("7) Criptografia (campo sensível: e-mail)");
                System.out.println("0) Sair");
                int op = readInt("Escolha: ");

                switch (op) {
                    case 1:
                        menuUsuario();
                        break;
                    case 2:
                        menuAlimento();
                        break;
                    case 3:
                        menuRefeicao();
                        break;
                    case 4:
                        menuConsumo();
                        break;
                    case 5:
                        menuBackup();
                        break;
                    case 6:
                        menuBusca();
                        break;
                    case 7:
                        menuCriptografia();
                        break;
                    case 0:
                        close();
                        System.out.println("Encerrado. Arquivos binários em ./dados/");
                        return;
                    default:
                        System.out.println("Opção inválida.");
                        break;
                }
            }
        } catch (Exception e) {
            System.out.println("Erro: " + e.getMessage());
            try { close(); } catch (Exception ignored) {}
        }
    }

    // ===== Usuário =====
    private void menuUsuario() throws Exception {
        while (true) {
            System.out.println("\n--- Usuário ---");
            System.out.println("1) Criar");
            System.out.println("2) Buscar por ID");
            System.out.println("3) Atualizar por ID");
            System.out.println("4) Remover por ID");
            System.out.println("0) Voltar");
            int op = readInt("Escolha: ");

            switch (op) {
                case 1:
                    criarUsuario();
                    break;
                case 2:
                    buscarUsuario();
                    break;
                case 3:
                    atualizarUsuario();
                    break;
                case 4:
                    removerUsuario();
                    break;
                case 0:
                    return;
                default:
                    System.out.println("Opção inválida.");
                    break;
            }
        }
    }

    private void criarUsuario() throws Exception {
        System.out.println("\n[CRIAR USUÁRIO]");
        String nome = readStr("Nome: ");
        String email = readStr("Email: ");
        LocalDate nasc = LocalDate.parse(readStr("Data nascimento (YYYY-MM-DD): "));
        String telsRaw = readStrAllowEmpty("Telefones (separe por vírgula): ");
        List<String> tels = parseList(telsRaw);

        int id = usuarioCtrl.criar(nome, email, nasc, tels);
        System.out.println("✅ Criado com ID: " + id);
    }

    private void buscarUsuario() throws Exception {
        int id = readInt("ID do usuário: ");
        Usuario u = usuarioCtrl.buscar(id);
        System.out.println(u != null ? u : "❌ Não encontrado.");
    }

    private void atualizarUsuario() throws Exception {
        int id = readInt("ID do usuário a atualizar: ");
        Usuario u = usuarioCtrl.buscar(id);
        if (u == null) { System.out.println("❌ Não encontrado."); return; }

        System.out.println("Atual atual: " + u);
        System.out.println("Deixe vazio para manter.");

        String nome = readStrAllowEmpty("Nome (" + safe(u.getNome()) + "): ");
        if (nome != null && !nome.trim().isEmpty()) u.setNome(nome);

        String email = readStrAllowEmpty("Email (" + safe(u.getEmail()) + "): ");
        if (email != null && !email.trim().isEmpty()) u.setEmail(email);

        String nasc = readStrAllowEmpty("Nascimento (" + u.getDataNascimento() + ") [YYYY-MM-DD]: ");
        if (nasc != null && !nasc.trim().isEmpty()) u.setDataNascimento(LocalDate.parse(nasc));

        String tels = readStrAllowEmpty("Telefones (" + u.getTelefones() + "): ");
        if (tels != null && !tels.trim().isEmpty()) u.setTelefones(parseList(tels));

        boolean ok = usuarioCtrl.atualizar(u);
        System.out.println(ok ? "✅ Atualizado." : "❌ Falhou ao atualizar.");
    }

    private void removerUsuario() throws Exception {
        int id = readInt("ID do usuário a remover: ");
        boolean ok = usuarioCtrl.remover(id);
        System.out.println(ok ? "✅ Removido (lápide marcada)." : "❌ Não encontrado.");
    }

    // ===== Alimento =====
    private void menuAlimento() throws Exception {
        while (true) {
            System.out.println("\n--- Alimento ---");
            System.out.println("1) Criar");
            System.out.println("2) Buscar por ID");
            System.out.println("3) Atualizar por ID");
            System.out.println("4) Remover por ID");
            System.out.println("0) Voltar");
            int op = readInt("Escolha: ");

            switch (op) {
                case 1:
                    criarAlimento();
                    break;
                case 2:
                    buscarAlimento();
                    break;
                case 3:
                    atualizarAlimento();
                    break;
                case 4:
                    removerAlimento();
                    break;
                case 0:
                    return;
                default:
                    System.out.println("Opção inválida.");
                    break;
            }
        }
    }

    private void criarAlimento() throws Exception {
        System.out.println("\n[CRIAR ALIMENTO]");
        String nome = readStr("Nome: ");
        String marca = readStrAllowEmpty("Marca (opcional): ");
        float kcal = readFloat("Kcal por 100g: ");
        float p = readFloat("Proteína por 100g: ");
        float c = readFloat("Carbo por 100g: ");
        float g = readFloat("Gordura por 100g: ");
        String tagsRaw = readStrAllowEmpty("Tags (separe por vírgula): ");
        List<String> tags = parseList(tagsRaw);

        int id = alimentoCtrl.criar(nome, marca, kcal, p, c, g, tags);
        System.out.println("✅ Criado com ID: " + id);
    }

    private void buscarAlimento() throws Exception {
        int id = readInt("ID do alimento: ");
        Alimento a = alimentoCtrl.buscar(id);
        System.out.println(a != null ? a : "❌ Não encontrado.");
    }

    private void atualizarAlimento() throws Exception {
        int id = readInt("ID do alimento a atualizar: ");
        Alimento a = alimentoCtrl.buscar(id);
        if (a == null) { System.out.println("❌ Não encontrado."); return; }

        System.out.println("Atual atual: " + a);
        System.out.println("Deixe vazio para manter.");

        String nome = readStrAllowEmpty("Nome (" + safe(a.getNome()) + "): ");
        if (nome != null && !nome.trim().isEmpty()) a.setNome(nome);

        String marca = readStrAllowEmpty("Marca (" + safe(a.getMarca()) + "): ");
        if (marca != null && !marca.trim().isEmpty()) a.setMarca(marca);

        String kcal = readStrAllowEmpty("Kcal/100g (" + a.getKcalPor100g() + "): ");
        if (kcal != null && !kcal.trim().isEmpty()) a.setKcalPor100g(Float.parseFloat(kcal.replace(",", ".")));

        String prot = readStrAllowEmpty("Proteína/100g (" + a.getProteinaPor100g() + "): ");
        if (prot != null && !prot.trim().isEmpty()) a.setProteinaPor100g(Float.parseFloat(prot.replace(",", ".")));

        String carb = readStrAllowEmpty("Carbo/100g (" + a.getCarboPor100g() + "): ");
        if (carb != null && !carb.trim().isEmpty()) a.setCarboPor100g(Float.parseFloat(carb.replace(",", ".")));

        String gord = readStrAllowEmpty("Gordura/100g (" + a.getGorduraPor100g() + "): ");
        if (gord != null && !gord.trim().isEmpty()) a.setGorduraPor100g(Float.parseFloat(gord.replace(",", ".")));

        String tagsRaw = readStrAllowEmpty("Tags (" + a.getTags() + "): ");
        if (tagsRaw != null && !tagsRaw.trim().isEmpty()) a.setTags(parseList(tagsRaw));

        boolean ok = alimentoCtrl.atualizar(a);
        System.out.println(ok ? "✅ Atualizado." : "❌ Falhou ao atualizar.");
    }

    private void removerAlimento() throws Exception {
        int id = readInt("ID do alimento a remover: ");
        boolean ok = alimentoCtrl.remover(id);
        System.out.println(ok ? "✅ Removido (lápide marcada)." : "❌ Não encontrado.");
    }

    // ===== Refeição =====
    private void menuRefeicao() throws Exception {
        while (true) {
            System.out.println("\n--- Refeição ---");
            System.out.println("1) Criar");
            System.out.println("2) Buscar por ID");
            System.out.println("3) Atualizar por ID");
            System.out.println("4) Remover por ID");
            System.out.println("0) Voltar");
            int op = readInt("Escolha: ");

            switch (op) {
                case 1:
                    criarRefeicao();
                    break;
                case 2:
                    buscarRefeicao();
                    break;
                case 3:
                    atualizarRefeicao();
                    break;
                case 4:
                    removerRefeicao();
                    break;
                case 0:
                    return;
                default:
                    System.out.println("Opção inválida.");
                    break;
            }
        }
    }

    private void criarRefeicao() throws Exception {
        System.out.println("\n[CRIAR REFEIÇÃO]");
        int usuarioId = readInt("UsuarioId (FK): ");
        LocalDate data = LocalDate.parse(readStr("Data (YYYY-MM-DD): "));
        String tipo = readStr("Tipo (Café/Almoço/Jantar/Lanche): ");
        String obs = readStrAllowEmpty("Observação (opcional): ");

        int id = refeicaoCtrl.criar(usuarioId, data, tipo, obs);
        System.out.println("✅ Criada com ID: " + id);
    }

    private void buscarRefeicao() throws Exception {
        int id = readInt("ID da refeição: ");
        Refeicao r = refeicaoCtrl.buscar(id);
        System.out.println(r != null ? r : "❌ Não encontrada.");
    }

    private void atualizarRefeicao() throws Exception {
        int id = readInt("ID da refeição a atualizar: ");
        Refeicao r = refeicaoCtrl.buscar(id);
        if (r == null) { System.out.println("❌ Não encontrada."); return; }

        System.out.println("Atual atual: " + r);
        System.out.println("Deixe vazio para manter.");

        String usuario = readStrAllowEmpty("UsuarioId (" + r.getUsuarioId() + "): ");
        if (usuario != null && !usuario.trim().isEmpty()) r.setUsuarioId(Integer.parseInt(usuario));

        String data = readStrAllowEmpty("Data (" + r.getData() + ") [YYYY-MM-DD]: ");
        if (data != null && !data.trim().isEmpty()) r.setData(LocalDate.parse(data));

        String tipo = readStrAllowEmpty("Tipo (" + safe(r.getTipo()) + "): ");
        if (tipo != null && !tipo.trim().isEmpty()) r.setTipo(tipo);

        String obs = readStrAllowEmpty("Observação (" + safe(r.getObservacao()) + "): ");
        if (obs != null && !obs.trim().isEmpty()) r.setObservacao(obs);

        boolean ok = refeicaoCtrl.atualizar(r);
        System.out.println(ok ? "✅ Atualizada." : "❌ Falhou ao atualizar.");
    }

    private void removerRefeicao() throws Exception {
        int id = readInt("ID da refeição a remover: ");
        boolean ok = refeicaoCtrl.remover(id);
        System.out.println(ok ? "✅ Removida (lápide marcada)." : "❌ Não encontrada.");
    }

    // ===== Consumo =====
    private void menuConsumo() throws Exception {
        while (true) {
            System.out.println("\n--- Consumo (N:N) ---");
            System.out.println("1) Criar vínculo (Adicionar item na refeição)");
            System.out.println("2) Buscar por ID");
            System.out.println("3) Atualizar por ID");
            System.out.println("4) Remover por ID");
            System.out.println("0) Voltar");
            int op = readInt("Escolha: ");

            switch (op) {
                case 1:
                    criarConsumo();
                    break;
                case 2:
                    buscarConsumo();
                    break;
                case 3:
                    atualizarConsumo();
                    break;
                case 4:
                    removerConsumo();
                    break;
                case 0:
                    return;
                default:
                    System.out.println("Opção inválida.");
                    break;
            }
        }
    }

    private void criarConsumo() throws Exception {
        System.out.println("\n[CRIAR CONSUMO / ITEM]");
        int refeicaoId = readInt("RefeicaoId (FK): ");
        int alimentoId = readInt("AlimentoId (FK): ");
        float gramas = readFloat("Quantidade (g): ");

        int id = consumoCtrl.adicionarItem(refeicaoId, alimentoId, gramas);
        System.out.println("✅ Consumo criado com ID: " + id);
    }

    private void buscarConsumo() throws Exception {
        int id = readInt("ID do consumo: ");
        Consumo c = consumoCtrl.buscar(id);
        System.out.println(c != null ? c : "❌ Não encontrado.");
    }

    private void atualizarConsumo() throws Exception {
        int id = readInt("ID do consumo a atualizar: ");
        Consumo c = consumoCtrl.buscar(id);
        if (c == null) { System.out.println("❌ Não encontrado."); return; }

        System.out.println("Atual atual: " + c);
        System.out.println("Deixe vazio para manter.");

        String refeicao = readStrAllowEmpty("RefeicaoId (" + c.getRefeicaoId() + "): ");
        if (refeicao != null && !refeicao.trim().isEmpty()) c.setRefeicaoId(Integer.parseInt(refeicao));

        String alimento = readStrAllowEmpty("AlimentoId (" + c.getAlimentoId() + "): ");
        if (alimento != null && !alimento.trim().isEmpty()) c.setAlimentoId(Integer.parseInt(alimento));

        String g = readStrAllowEmpty("Quantidade (g) (" + c.getQuantidadeGramas() + "): ");
        if (g != null && !g.trim().isEmpty()) c.setQuantidadeGramas(Float.parseFloat(g.replace(",", ".")));

        boolean ok = consumoCtrl.atualizar(c);
        System.out.println(ok ? "✅ Atualizado." : "❌ Falhou ao atualizar.");
    }

    private void removerConsumo() throws Exception {
        int id = readInt("ID do consumo a remover: ");
        boolean ok = consumoCtrl.remover(id);
        System.out.println(ok ? "✅ Removido (lápide marcada)." : "❌ Não encontrado.");
    }

    // ===== Util =====
    private List<String> parseList(String raw) {
        List<String> out = new ArrayList<>();
        if (raw == null) return out;
        for (String p : raw.split(",")) {
            String t = p.trim();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    private int readInt(String prompt) {
        while (true) {
            System.out.print(prompt);
            String s = sc.nextLine().trim();
            try {
                return Integer.parseInt(s);
            } catch (Exception e) {
                System.out.println("Digite um inteiro válido.");
            }
        }
    }

    private float readFloat(String prompt) {
        while (true) {
            System.out.print(prompt);
            String s = sc.nextLine().trim().replace(",", ".");
            try {
                return Float.parseFloat(s);
            } catch (Exception e) {
                System.out.println("Digite um número real válido.");
            }
        }
    }

    private String readStr(String prompt) {
        while (true) {
            System.out.print(prompt);
            String s = sc.nextLine().trim();
            if (!s.isEmpty()) return s;
            System.out.println("Campo obrigatório.");
        }
    }

    private String readStrAllowEmpty(String prompt) {
        System.out.print(prompt);
        return sc.nextLine().trim();
    }

    private String safe(String s) { return s == null ? "" : s; }

    // ===== Backup / Compressão (Fase IV) =====
    private void menuBackup() throws Exception {
        while (true) {
            System.out.println("\n--- Backup / Compressão (Fase IV) ---");
            System.out.println("1) Gerar backup com Huffman");
            System.out.println("2) Gerar backup com LZW");
            System.out.println("3) Comparar Huffman x LZW");
            System.out.println("4) Restaurar backup (Huffman) em ./dados_restaurado");
            System.out.println("5) Restaurar backup (LZW) em ./dados_restaurado");
            System.out.println("0) Voltar");
            int op = readInt("Escolha: ");

            switch (op) {
                case 1:
                    imprimirResultado(app.compression.CompressaoService.gerarBackupHuffman());
                    break;
                case 2:
                    imprimirResultado(app.compression.CompressaoService.gerarBackupLZW());
                    break;
                case 3:
                    app.compression.ResultadoCompressao h = app.compression.CompressaoService.gerarBackupHuffman();
                    app.compression.ResultadoCompressao l = app.compression.CompressaoService.gerarBackupLZW();
                    imprimirResultado(h);
                    imprimirResultado(l);
                    System.out.println("\n>>> Melhor taxa: "
                            + (h.taxaCompressao() >= l.taxaCompressao() ? "Huffman" : "LZW"));
                    break;
                case 4:
                    restaurar(app.compression.CompressaoService.ARQ_HUFFMAN);
                    break;
                case 5:
                    restaurar(app.compression.CompressaoService.ARQ_LZW);
                    break;
                case 0:
                    return;
                default:
                    System.out.println("Opção inválida.");
                    break;
            }
        }
    }

    private void imprimirResultado(app.compression.ResultadoCompressao r) {
        System.out.println("\n===== " + r.algoritmo + " =====");
        System.out.println("Arquivos incluídos.......: " + r.quantidadeArquivos);
        System.out.println("Tamanho original (bytes).: " + r.tamanhoOriginal);
        System.out.println("Tamanho comprimido (bytes): " + r.tamanhoComprimido);
        System.out.printf("Taxa de compressão........: %.2f%%%n", r.taxaCompressao());
        System.out.printf("Razão (orig:comp).........: %.2f : 1%n", r.razao());
        System.out.println("Integridade (round-trip)..: " + (r.integridadeOk ? "OK" : "FALHOU"));
        System.out.println("Tempo (ms)................: " + r.milissegundos);
        System.out.println("Arquivo gerado............: " + r.arquivoGerado);
    }

    private void restaurar(String caminho) {
        try {
            int n = app.compression.CompressaoService.restaurar(caminho, "./dados_restaurado");
            System.out.println("✅ Restaurados " + n + " arquivo(s) em ./dados_restaurado");
        } catch (Exception e) {
            System.out.println("Erro ao restaurar (gere o backup primeiro?): " + e.getMessage());
        }
    }

    // ===== Pesquisa por Padrão (Fase V — KMP / Boyer-Moore) =====
    private void menuBusca() throws Exception {
        System.out.println("\n--- Pesquisar por padrão (Fase V) ---");
        System.out.println("Campo pesquisado: " + BuscaService.CAMPO
                + "  (insensível a maiúsculas/minúsculas e acentos)");
        System.out.println("Algoritmo:");
        System.out.println("  1) KMP (Knuth-Morris-Pratt)");
        System.out.println("  2) Boyer-Moore (bad character + good suffix)");
        int escolha = readInt("Escolha o algoritmo (1/2): ");
        BuscaService.Algoritmo algo;
        try {
            algo = BuscaService.Algoritmo.de(String.valueOf(escolha));
        } catch (IllegalArgumentException e) {
            System.out.println("❌ " + e.getMessage());
            return;
        }

        String padrao = readStr("Padrão a procurar: ");

        try {
            ResultadoBusca r = BuscaService.buscarAlimentosPorNome(alimentoDAO, padrao, algo);
            System.out.println("\n===== Resultado da busca =====");
            System.out.println("Algoritmo................: " + r.algoritmo);
            System.out.println("Padrão...................: \"" + r.padrao + "\"");
            System.out.println("Campo....................: " + r.campo);
            System.out.println("Registros varridos.......: " + r.totalRegistros);
            System.out.println("Registros encontrados....: " + r.quantidadeEncontrada());
            System.out.println("Comparações de caractere.: " + r.comparacoes);
            System.out.printf("Tempo....................: %.3f ms%n", r.milissegundos);

            if (r.encontrados.isEmpty()) {
                System.out.println("\n(nenhum alimento com esse padrão no nome)");
            } else {
                System.out.println("\nAlimentos encontrados:");
                for (ItemEncontrado item : r.encontrados) {
                    System.out.println("  #" + item.id + " · " + item.valorCampo
                            + "   (posições=" + item.posicoes + ", ocorrências=" + item.ocorrencias + ")");
                }
            }
        } catch (IllegalArgumentException e) {
            System.out.println("❌ " + e.getMessage());
        }
    }

    // ===== Criptografia (Fase V — XOR no campo sensível e-mail) =====
    private void menuCriptografia() throws Exception {
        while (true) {
            System.out.println("\n--- Criptografia XOR (Fase V) ---");
            System.out.println("Campo sensível protegido em repouso: Usuario.email");
            System.out.println("1) Demonstrar cifra/decifra de um texto");
            System.out.println("2) Mostrar e-mail de um usuário (claro x cifrado em disco)");
            System.out.println("0) Voltar");
            int op = readInt("Escolha: ");

            switch (op) {
                case 1: {
                    String texto = readStr("Texto para cifrar: ");
                    String b64 = CriptografiaXOR.cifrarTextoBase64(texto);
                    System.out.println("  Original.........: " + texto);
                    System.out.println("  Cifrado (hex)....: " + CriptografiaXOR.hexCifrado(texto));
                    System.out.println("  Cifrado (Base64).: " + b64);
                    System.out.println("  Decifrado........: " + CriptografiaXOR.decifrarTextoBase64(b64));
                    break;
                }
                case 2: {
                    int id = readInt("ID do usuário: ");
                    Usuario u = usuarioCtrl.buscar(id);
                    if (u == null) { System.out.println("❌ Não encontrado."); break; }
                    System.out.println("  E-mail (em memória, decifrado): " + u.getEmail());
                    System.out.println("  E-mail (como gravado em disco): " + CriptografiaXOR.hexCifrado(u.getEmail()));
                    System.out.println("  >> Em usuario.db o campo aparece exatamente como os bytes acima.");
                    break;
                }
                case 0:
                    return;
                default:
                    System.out.println("Opção inválida.");
                    break;
            }
        }
    }

    private void close() throws Exception {
        usuarioDAO.close();
        alimentoDAO.close();
        refeicaoDAO.close();
        consumoDAO.close();
    }

    /** Ponto de entrada para o CRUD/menus via console. */
    public static void main(String[] args) throws Exception {
        new ConsoleApp().run();
    }
}
