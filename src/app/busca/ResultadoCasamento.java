package app.busca;

import java.util.List;

/**
 * Resultado de um casamento de padrões sobre <b>um único texto</b>
 * (uma execução do KMP ou do Boyer–Moore).
 *
 * <ul>
 *   <li>{@link #posicoes} — índices (base 0) onde o padrão começa no texto;</li>
 *   <li>{@link #comparacoes} — número de comparações de caracteres realizadas
 *       (métrica didática para comparar a eficiência dos algoritmos).</li>
 * </ul>
 */
public final class ResultadoCasamento {

    public final List<Integer> posicoes;
    public final long comparacoes;

    public ResultadoCasamento(List<Integer> posicoes, long comparacoes) {
        this.posicoes = posicoes;
        this.comparacoes = comparacoes;
    }

    /** {@code true} se o padrão ocorreu ao menos uma vez no texto. */
    public boolean encontrou() {
        return posicoes != null && !posicoes.isEmpty();
    }

    /** Quantidade de ocorrências do padrão no texto. */
    public int quantidade() {
        return posicoes == null ? 0 : posicoes.size();
    }
}
