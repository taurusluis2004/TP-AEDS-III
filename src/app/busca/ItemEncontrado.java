package app.busca;

import java.util.List;

/**
 * Um registro cujo campo textual casou com o padrão pesquisado.
 *
 * <ul>
 *   <li>{@link #id} — identificador do registro (PK) na tabela;</li>
 *   <li>{@link #valorCampo} — conteúdo original do campo onde houve casamento;</li>
 *   <li>{@link #posicoes} — posições (base 0) em que o padrão começa no campo;</li>
 *   <li>{@link #ocorrencias} — quantidade de casamentos no campo.</li>
 * </ul>
 */
public final class ItemEncontrado {

    public final int id;
    public final String valorCampo;
    public final List<Integer> posicoes;
    public final int ocorrencias;

    public ItemEncontrado(int id, String valorCampo, List<Integer> posicoes) {
        this.id = id;
        this.valorCampo = valorCampo;
        this.posicoes = posicoes;
        this.ocorrencias = posicoes == null ? 0 : posicoes.size();
    }
}
