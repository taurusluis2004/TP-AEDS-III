package app.model;

import app.Registro;
import app.seguranca.CriptografiaXOR;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Usuario:
 * - String: nome, email
 * - Data: dataNascimento (LocalDate armazenada como epochDay)
 * - String multivalorada: telefones
 *
 * <p><b>Fase V — Criptografia:</b> o campo {@code email} é um dado pessoal
 * (sensível), por isso é persistido <b>cifrado</b> no arquivo binário via
 * {@link app.seguranca.CriptografiaXOR} (XOR de chave repetida). O valor em
 * memória permanece sempre em texto claro — a cifra/decifra ocorre apenas no
 * {@code toByteArray}/{@code fromByteArray}, de forma transparente para o
 * restante do sistema.</p>
 */
public class Usuario implements Registro {
    private int id;
    private String nome;
    private String email;
    private LocalDate dataNascimento;
    private List<String> telefones;

    public Usuario() {
        this.telefones = new ArrayList<>();
    }

    public Usuario(String nome, String email, LocalDate dataNascimento, List<String> telefones) {
        this.nome = nome;
        this.email = email;
        this.dataNascimento = dataNascimento;
        this.telefones = (telefones == null) ? new ArrayList<>() : new ArrayList<>(telefones);
    }

    @Override public int getId() { return id; }
    @Override public void setId(int id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public LocalDate getDataNascimento() { return dataNascimento; }
    public void setDataNascimento(LocalDate dataNascimento) { this.dataNascimento = dataNascimento; }

    public List<String> getTelefones() { return telefones; }
    public void setTelefones(List<String> telefones) { this.telefones = telefones; }

    @Override
    public byte[] toByteArray() throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        DataOutputStream dos = new DataOutputStream(baos);

        dos.writeInt(id);
        dos.writeUTF(nome != null ? nome : "");

        // Campo sensível: email gravado CIFRADO (XOR). Comprimento + bytes cifrados.
        byte[] emailCifrado = CriptografiaXOR.cifrar(
                (email != null ? email : "").getBytes(StandardCharsets.UTF_8));
        dos.writeShort(emailCifrado.length);
        dos.write(emailCifrado);

        long epochDay = (dataNascimento != null) ? dataNascimento.toEpochDay() : 0L;
        dos.writeLong(epochDay);

        dos.writeShort(telefones != null ? telefones.size() : 0);
        if (telefones != null) {
            for (String t : telefones) dos.writeUTF(t != null ? t : "");
        }

        return baos.toByteArray();
    }

    @Override
    public void fromByteArray(byte[] ba) throws Exception {
        ByteArrayInputStream bais = new ByteArrayInputStream(ba);
        DataInputStream dis = new DataInputStream(bais);

        id = dis.readInt();
        nome = dis.readUTF();

        // Campo sensível: lê os bytes cifrados e DECIFRA para texto claro em memória.
        short tamEmail = dis.readShort();
        byte[] emailCifrado = new byte[tamEmail];
        dis.readFully(emailCifrado);
        email = new String(CriptografiaXOR.decifrar(emailCifrado), StandardCharsets.UTF_8);

        long epochDay = dis.readLong();
        dataNascimento = LocalDate.ofEpochDay(epochDay);

        short n = dis.readShort();
        telefones = new ArrayList<>(n);
        for (int i = 0; i < n; i++) telefones.add(dis.readUTF());
    }

    @Override
    public String toString() {
        return "Usuario{id=" + id + ", nome='" + nome + "', email='" + email + "', nasc=" + dataNascimento + ", telefones=" + telefones + "}";
    }
}
