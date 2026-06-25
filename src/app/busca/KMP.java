package app.busca;

import java.util.ArrayList;
import java.util.List;

/**
 * <h2>KMP — Knuth–Morris–Pratt</h2>
 *
 * Algoritmo de casamento exato de padrões com complexidade <b>O(n + m)</b>
 * (n = tamanho do texto, m = tamanho do padrão), implementado do zero.
 *
 * <p>A ideia central é o <b>vetor de falha</b> (também chamado de função de
 * prefixo ou <i>LPS — Longest Proper Prefix which is also Suffix</i>). Para
 * cada posição {@code i} do padrão, {@code lps[i]} guarda o comprimento do
 * maior prefixo próprio de {@code padrao[0..i]} que também é sufixo desse
 * trecho. Quando ocorre um desacasamento na posição {@code k} do padrão, em
 * vez de voltar o ponteiro do texto (como faria a força bruta), o KMP apenas
 * "desliza" o padrão para {@code lps[k-1]} — reaproveitando o que já se sabe
 * que casou. Assim, <b>cada caractere do texto é comparado no máximo duas
 * vezes</b> e o ponteiro do texto nunca retrocede.</p>
 *
 * <p>Esta implementação devolve <b>todas</b> as ocorrências do padrão no texto
 * (não apenas a primeira), além do número de comparações de caracteres
 * efetuadas — útil para comparar didaticamente com o Boyer–Moore.</p>
 */
public final class KMP {

    private KMP() { }

    // ====================================================================
    //  PRÉ-PROCESSAMENTO — vetor de falha (LPS / função de prefixo)
    // ====================================================================

    /**
     * Calcula o vetor de falha do padrão em O(m).
     *
     * <p>{@code lps[i]} = comprimento do maior prefixo próprio de
     * {@code p[0..i]} que também é sufixo de {@code p[0..i]}.</p>
     */
    public static int[] vetorFalha(char[] p) {
        int m = p.length;
        int[] lps = new int[m];
        if (m == 0) return lps;

        lps[0] = 0;        // um único caractere não tem prefixo próprio
        int k = 0;         // comprimento do prefixo-sufixo do trecho anterior

        for (int i = 1; i < m; i++) {
            // enquanto houver desacasamento, recua para a borda anterior
            while (k > 0 && p[i] != p[k]) {
                k = lps[k - 1];
            }
            if (p[i] == p[k]) {
                k++;
            }
            lps[i] = k;
        }
        return lps;
    }

    // ====================================================================
    //  BUSCA
    // ====================================================================

    /**
     * Procura todas as ocorrências de {@code padrao} em {@code texto}.
     *
     * @return {@link ResultadoCasamento} com as posições iniciais (base 0) e o
     *         número de comparações de caracteres realizadas.
     */
    public static ResultadoCasamento buscar(char[] texto, char[] padrao) {
        List<Integer> ocorrencias = new ArrayList<>();
        long comparacoes = 0;

        int n = texto.length;
        int m = padrao.length;
        if (m == 0 || m > n) {
            return new ResultadoCasamento(ocorrencias, comparacoes);
        }

        int[] lps = vetorFalha(padrao);

        int i = 0;   // índice no texto (nunca retrocede)
        int k = 0;   // índice no padrão / quantidade já casada

        while (i < n) {
            comparacoes++;
            if (texto[i] == padrao[k]) {
                i++;
                k++;
                if (k == m) {                 // casamento completo
                    ocorrencias.add(i - m);   // posição inicial da ocorrência
                    k = lps[k - 1];           // continua buscando sobreposições
                }
            } else if (k > 0) {
                k = lps[k - 1];               // desliza o padrão (sem mexer em i)
            } else {
                i++;                          // nada casou ainda: avança no texto
            }
        }
        return new ResultadoCasamento(ocorrencias, comparacoes);
    }

    /** Conveniência: busca diretamente sobre {@link String}. */
    public static ResultadoCasamento buscar(String texto, String padrao) {
        return buscar(texto.toCharArray(), padrao.toCharArray());
    }
}
