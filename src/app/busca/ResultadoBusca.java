package app.busca;

import java.util.List;

/**
 * Resultado completo de uma pesquisa por padrão sobre uma tabela: agrega todos
 * os {@link ItemEncontrado registros encontrados} mais as métricas globais da
 * execução (algoritmo usado, total de registros varridos, total de comparações
 * de caracteres e tempo gasto).
 */
public final class ResultadoBusca {

    /** Nome legível do algoritmo usado ("KMP" ou "Boyer-Moore"). */
    public final String algoritmo;
    /** Padrão informado pelo usuário (como digitado). */
    public final String padrao;
    /** Campo textual em que a busca foi aplicada (ex.: "Alimento.nome"). */
    public final String campo;
    /** Quantidade de registros ativos varridos. */
    public final int totalRegistros;
    /** Registros cujo campo casou com o padrão. */
    public final List<ItemEncontrado> encontrados;
    /** Total de comparações de caracteres em toda a varredura (métrica didática). */
    public final long comparacoes;
    /** Tempo total da busca, em milissegundos. */
    public final double milissegundos;

    public ResultadoBusca(String algoritmo, String padrao, String campo,
                          int totalRegistros, List<ItemEncontrado> encontrados,
                          long comparacoes, double milissegundos) {
        this.algoritmo = algoritmo;
        this.padrao = padrao;
        this.campo = campo;
        this.totalRegistros = totalRegistros;
        this.encontrados = encontrados;
        this.comparacoes = comparacoes;
        this.milissegundos = milissegundos;
    }

    public int quantidadeEncontrada() {
        return encontrados == null ? 0 : encontrados.size();
    }
}
