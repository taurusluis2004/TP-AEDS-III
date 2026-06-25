package app.busca;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * <h2>Boyer–Moore</h2>
 *
 * Algoritmo de casamento exato de padrões que compara o padrão com o texto
 * <b>da direita para a esquerda</b> e, ao desacasar, pode pular vários
 * caracteres de uma vez. No melhor/caso médio é <b>sublinear</b> (não chega a
 * olhar todos os caracteres do texto), o que o torna muito eficiente em textos
 * grandes. Implementado do zero, com as duas heurísticas clássicas:
 *
 * <h3>1) Bad Character (caractere ruim) — obrigatória</h3>
 * <p>Ao desacasar no caractere {@code c} do texto, o padrão é deslocado de modo
 * a alinhar {@code c} com a sua <b>última ocorrência</b> dentro do padrão. Se
 * {@code c} não existe no padrão, o padrão pula inteiro para depois de
 * {@code c}. A tabela {@link #tabelaBadCharacter(char[])} guarda, para cada
 * caractere do padrão, o deslocamento {@code m-1-i} da sua última ocorrência.</p>
 *
 * <h3>2) Good Suffix (bom sufixo) — opcional, também implementada</h3>
 * <p>Quando um sufixo do padrão já casou antes do desacasamento, deslocamos o
 * padrão para a próxima ocorrência desse sufixo (ou de um prefixo do padrão que
 * seja sufixo do trecho casado). A pré-computação usa o vetor {@code suff}, em
 * que {@code suff[i]} é o comprimento do maior sufixo do padrão que termina na
 * posição {@code i}.</p>
 *
 * <p>A cada desacasamento aplica-se o <b>maior</b> dos dois deslocamentos,
 * garantindo correção e o melhor salto possível. A implementação segue a
 * referência clássica de Charras &amp; Lecroq (<i>Handbook of Exact String
 * Matching Algorithms</i>) e devolve todas as ocorrências do padrão.</p>
 */
public final class BoyerMoore {

    private BoyerMoore() { }

    // ====================================================================
    //  HEURÍSTICA 1 — BAD CHARACTER
    // ====================================================================

    /**
     * Tabela do caractere ruim: para cada caractere presente no padrão, guarda
     * {@code m-1-i} da sua <b>última</b> ocorrência (quanto maior o índice,
     * menor o salto). Caracteres ausentes assumem o valor padrão {@code m}
     * (tratado no momento da busca via {@code getOrDefault}).
     *
     * <p>Usa-se um {@link Map} em vez de um vetor de 65.536 posições para
     * funcionar com qualquer alfabeto (Unicode) sem desperdício de memória.</p>
     */
    public static Map<Character, Integer> tabelaBadCharacter(char[] p) {
        Map<Character, Integer> tabela = new HashMap<>();
        int m = p.length;
        for (int i = 0; i < m - 1; i++) {
            tabela.put(p[i], m - 1 - i);
        }
        return tabela;
    }

    // ====================================================================
    //  HEURÍSTICA 2 — GOOD SUFFIX
    // ====================================================================

    /**
     * Vetor de sufixos: {@code suff[i]} = comprimento do maior sufixo do padrão
     * que termina exatamente na posição {@code i} (ou seja, casa com o sufixo
     * do próprio padrão). Calculado em O(m).
     */
    private static int[] vetorSufixos(char[] p) {
        int m = p.length;
        int[] suff = new int[m];
        suff[m - 1] = m;

        int g = m - 1;   // limite inferior do sufixo casado mais recente
        int f = 0;       // posição onde esse casamento começou
        for (int i = m - 2; i >= 0; i--) {
            if (i > g && suff[i + m - 1 - f] < i - g) {
                suff[i] = suff[i + m - 1 - f];
            } else {
                if (i < g) g = i;
                f = i;
                while (g >= 0 && p[g] == p[g + m - 1 - f]) {
                    g--;
                }
                suff[i] = f - g;
            }
        }
        return suff;
    }

    /**
     * Tabela do bom sufixo: para cada posição {@code i} de desacasamento dentro
     * do padrão, {@code bmGs[i]} indica de quanto deslocar o padrão.
     */
    public static int[] tabelaGoodSuffix(char[] p) {
        int m = p.length;
        int[] suff = vetorSufixos(p);
        int[] bmGs = new int[m + 1];

        for (int i = 0; i < m; i++) {
            bmGs[i] = m;   // deslocamento padrão = tamanho do padrão
        }

        // Caso 2: existe um prefixo do padrão que também é sufixo do trecho casado.
        int j = 0;
        for (int i = m - 1; i >= 0; i--) {
            if (suff[i] == i + 1) {
                for (; j < m - 1 - i; j++) {
                    if (bmGs[j] == m) {
                        bmGs[j] = m - 1 - i;
                    }
                }
            }
        }
        // Caso 1: o bom sufixo reaparece em outro ponto do padrão.
        for (int i = 0; i <= m - 2; i++) {
            bmGs[m - 1 - suff[i]] = m - 1 - i;
        }
        return bmGs;
    }

    // ====================================================================
    //  BUSCA
    // ====================================================================

    /**
     * Procura todas as ocorrências de {@code padrao} em {@code texto} usando
     * Bad Character + Good Suffix.
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

        Map<Character, Integer> badChar = tabelaBadCharacter(padrao);
        int[] goodSuffix = tabelaGoodSuffix(padrao);

        int j = 0;   // alinhamento do padrão sobre o texto (deslizando à direita)
        while (j <= n - m) {
            int i = m - 1;   // compara da direita para a esquerda
            while (i >= 0) {
                comparacoes++;
                if (padrao[i] != texto[i + j]) break;
                i--;
            }

            if (i < 0) {
                // casamento completo nesta janela
                ocorrencias.add(j);
                j += goodSuffix[0];
            } else {
                // aplica o MAIOR salto entre as duas heurísticas
                int saltoBom = goodSuffix[i];
                int saltoRuim = badChar.getOrDefault(texto[i + j], m) - m + 1 + i;
                j += Math.max(saltoBom, saltoRuim);
            }
        }
        return new ResultadoCasamento(ocorrencias, comparacoes);
    }

    /** Conveniência: busca diretamente sobre {@link String}. */
    public static ResultadoCasamento buscar(String texto, String padrao) {
        return buscar(texto.toCharArray(), padrao.toCharArray());
    }
}
