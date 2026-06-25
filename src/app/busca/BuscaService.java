package app.busca;

import app.dao.AlimentoDAO;
import app.model.Alimento;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Serviço de alto nível da <b>Fase V — Casamento de Padrões</b>.
 *
 * <p>Aplica o {@link KMP} ou o {@link BoyerMoore} sobre o campo textual
 * <b>{@code Alimento.nome}</b> de <b>todos</b> os registros ativos da tabela de
 * alimentos e devolve os registros cujo nome contém o padrão informado.</p>
 *
 * <p><b>Por que {@code Alimento.nome}?</b> É o campo textual mais consultado da
 * base (o usuário procura alimentos pelo nome) e é livre — o padrão pode
 * aparecer em qualquer posição. Isso complementa a Árvore B+ da Fase III, que
 * resolve apenas busca <i>ordenada/por prefixo</i>: aqui resolvemos busca por
 * <i>subcadeia</i> em qualquer ponto do nome (ex.: "leite" dentro de "Bebida
 * láctea com leite").</p>
 *
 * <p>A comparação é <b>insensível a maiúsculas/minúsculas e a acentos</b>: tanto
 * o texto quanto o padrão passam por {@link #normalizar(String)} antes de irem
 * para os algoritmos, que permanecem "puros" (operam sobre {@code char[]}).</p>
 */
public final class BuscaService {

    /** Algoritmos disponíveis na interface de pesquisa. */
    public enum Algoritmo {
        KMP("KMP"),
        BOYER_MOORE("Boyer-Moore");

        public final String rotulo;
        Algoritmo(String rotulo) { this.rotulo = rotulo; }

        /** Resolve a partir do texto do usuário ("kmp", "bm", "boyer-moore", ...). */
        public static Algoritmo de(String s) {
            if (s == null) throw new IllegalArgumentException("Algoritmo não informado (use 'kmp' ou 'bm').");
            String x = s.trim().toLowerCase(Locale.ROOT);
            switch (x) {
                case "kmp": case "1":
                    return KMP;
                case "bm": case "boyer": case "boyer-moore": case "boyermoore": case "2":
                    return BOYER_MOORE;
                default:
                    throw new IllegalArgumentException("Algoritmo inválido: '" + s + "' (use 'kmp' ou 'bm').");
            }
        }
    }

    public static final String CAMPO = "Alimento.nome";

    private BuscaService() { }

    /**
     * Normaliza um texto para comparação: remove acentos (NFD + descarte de
     * marcas diacríticas) e converte para minúsculas.
     */
    public static String normalizar(String s) {
        if (s == null) return "";
        String nfd = Normalizer.normalize(s, Normalizer.Form.NFD);
        String semAcento = nfd.replaceAll("\\p{M}+", "");
        return semAcento.toLowerCase(Locale.ROOT);
    }

    /**
     * Executa a busca por padrão no campo {@code Alimento.nome}.
     *
     * @param dao    DAO já aberto da tabela de alimentos.
     * @param padrao subcadeia a procurar (não pode ser vazia).
     * @param algo   {@link Algoritmo#KMP} ou {@link Algoritmo#BOYER_MOORE}.
     */
    public static ResultadoBusca buscarAlimentosPorNome(AlimentoDAO dao, String padrao, Algoritmo algo) throws Exception {
        if (padrao == null || padrao.trim().isEmpty()) {
            throw new IllegalArgumentException("Informe um padrão (texto) não vazio para a busca.");
        }
        if (algo == null) {
            throw new IllegalArgumentException("Selecione o algoritmo (KMP ou Boyer-Moore).");
        }

        char[] p = normalizar(padrao).toCharArray();
        List<Alimento> todos = dao.listar();
        List<ItemEncontrado> encontrados = new ArrayList<>();
        long comparacoes = 0;

        long inicio = System.nanoTime();
        for (Alimento a : todos) {
            String valor = a.getNome() == null ? "" : a.getNome();
            char[] t = normalizar(valor).toCharArray();

            ResultadoCasamento rc = (algo == Algoritmo.KMP)
                    ? KMP.buscar(t, p)
                    : BoyerMoore.buscar(t, p);

            comparacoes += rc.comparacoes;
            if (rc.encontrou()) {
                encontrados.add(new ItemEncontrado(a.getId(), valor, rc.posicoes));
            }
        }
        long fim = System.nanoTime();

        return new ResultadoBusca(
                algo.rotulo,
                padrao,
                CAMPO,
                todos.size(),
                encontrados,
                comparacoes,
                (fim - inicio) / 1_000_000.0);
    }
}
