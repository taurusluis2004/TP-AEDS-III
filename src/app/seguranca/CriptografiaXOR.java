package app.seguranca;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * <h2>Criptografia XOR (Fase V)</h2>
 *
 * Cifra simétrica de chave repetida (XOR / variante de Vigenère sobre bytes),
 * implementada do zero. Cada byte do dado é combinado, via operação
 * <b>ou-exclusivo (^)</b>, com um byte da chave que se repete ciclicamente:
 *
 * <pre>
 *   cifrado[i] = claro[i]  XOR  chave[i mod tamChave]
 *   claro[i]   = cifrado[i] XOR chave[i mod tamChave]
 * </pre>
 *
 * <p>A propriedade fundamental do XOR é ser a sua própria inversa
 * ({@code (x ^ k) ^ k == x}); por isso a <b>mesma</b> rotina cifra e decifra —
 * basta usar a mesma chave. Aplicada byte a byte, a cifra <b>preserva o tamanho
 * do dado</b>, o que a torna conveniente para cifrar um campo persistido em
 * arquivo binário sem alterar o cálculo de espaço dos registros.</p>
 *
 * <p>No NutriTrack ela é usada para proteger, <b>em repouso</b>, o campo
 * sensível {@code Usuario.email} (dado pessoal — PII): o valor é gravado cifrado
 * no arquivo {@code usuario.db} e só é decifrado ao carregar o registro em
 * memória.</p>
 *
 * <p><b>Observação didática:</b> o XOR de chave repetida é simples e reversível,
 * adequado ao escopo da disciplina; não é um algoritmo de uso em produção (não
 * substitui AES/ChaCha20). A chave aqui é fixa no código apenas para fins de
 * demonstração — em um sistema real viria de um cofre de segredos / variável de
 * ambiente.</p>
 */
public final class CriptografiaXOR {

    /** Chave simétrica padrão usada pelo sistema (demonstração). */
    private static final byte[] CHAVE_PADRAO =
            "NutriTrack#AEDS3@2026".getBytes(StandardCharsets.UTF_8);

    private CriptografiaXOR() { }

    // ====================================================================
    //  NÚCLEO — XOR de chave repetida (cifra == decifra)
    // ====================================================================

    /** Aplica XOR de {@code dados} com {@code chave} repetida ciclicamente. */
    public static byte[] aplicar(byte[] dados, byte[] chave) {
        if (dados == null) return new byte[0];
        if (chave == null || chave.length == 0) {
            throw new IllegalArgumentException("Chave de criptografia vazia.");
        }
        byte[] saida = new byte[dados.length];
        for (int i = 0; i < dados.length; i++) {
            saida[i] = (byte) (dados[i] ^ chave[i % chave.length]);
        }
        return saida;
    }

    /** Cifra {@code dados} com a chave padrão do sistema. */
    public static byte[] cifrar(byte[] dados) {
        return aplicar(dados, CHAVE_PADRAO);
    }

    /** Decifra {@code dados} com a chave padrão do sistema (XOR é simétrico). */
    public static byte[] decifrar(byte[] dados) {
        return aplicar(dados, CHAVE_PADRAO);
    }

    // ====================================================================
    //  CONVENIÊNCIAS PARA TEXTO
    // ====================================================================

    /** Cifra um texto e devolve o resultado em Base64 (transportável em JSON). */
    public static String cifrarTextoBase64(String texto) {
        byte[] claro = (texto == null ? "" : texto).getBytes(StandardCharsets.UTF_8);
        return Base64.getEncoder().encodeToString(cifrar(claro));
    }

    /** Decifra um texto previamente cifrado com {@link #cifrarTextoBase64(String)}. */
    public static String decifrarTextoBase64(String base64) {
        if (base64 == null || base64.isEmpty()) return "";
        byte[] cifrado = Base64.getDecoder().decode(base64);
        return new String(decifrar(cifrado), StandardCharsets.UTF_8);
    }

    /** Representação hexadecimal dos bytes (para exibir o conteúdo cifrado). */
    public static String hex(byte[] bytes) {
        if (bytes == null) return "";
        StringBuilder sb = new StringBuilder(bytes.length * 3);
        for (int i = 0; i < bytes.length; i++) {
            if (i > 0) sb.append(' ');
            sb.append(String.format("%02X", bytes[i] & 0xFF));
        }
        return sb.toString();
    }

    /** Hex do texto JÁ cifrado — útil para mostrar como o campo fica em disco. */
    public static String hexCifrado(String texto) {
        return hex(cifrar((texto == null ? "" : texto).getBytes(StandardCharsets.UTF_8)));
    }
}
