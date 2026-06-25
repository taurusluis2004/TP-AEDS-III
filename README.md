# NutriTrack — TP AEDS III (Fases 1, 2, 3, 4 e 5)

Sistema de **gerenciamento de consumo nutricional** com persistência em **arquivos
binários** (cabeçalho + lápide + lista de espaços livres), **índices em Hash Extensível**
e **Árvore B+** para consultas ordenadas.

> Trabalho Prático — Algoritmos e Estrutura de Dados III · PUC Minas
> Componentes do grupo: Pedro Augusto Silva Ferreira, Luis Felipe Almeida Rodrigues

---

## O que está implementado

### Fase 1
- MVC + DAO em Java puro
- 4 entidades: **Usuario**, **Alimento**, **Refeicao**, **Consumo**
- Persistência em arquivo binário com **cabeçalho** (último ID + ponteiro de removidos) e **exclusão lógica** por lápide (`'*'`)
- Lista encadeada de espaços livres com estratégia *best-fit*
- Diagramas DCU, DER e Arquitetura em [`web/documentacao.html`](web/documentacao.html)

### Fase 2
- **Índice primário** em **Hash Extensível** (id → endereço) para cada tabela — `read/update/delete` em O(1) médio
- **Relacionamento 1:N** (Refeição → Consumos) via **Hash Extensível** (FK → PK)
- **Cascade delete**: ao remover uma refeição, os consumos vinculados são apagados automaticamente
- **Validações**: PK inexistente em update/delete, FK inválida, campos obrigatórios, valores negativos
- **Front-end web** (HTML + CSS + JS) consumindo API REST JSON
- **Servidor HTTP embutido** (`com.sun.net.httpserver`, sem dependências externas) na porta `8080`
- **Reconstrução automática** dos índices se os arquivos `.idx.*.db` forem apagados

### Fase 3
- **Árvore B+ genérica** implementada do zero (`app.dao.ArvoreBMais<T>`) com folhas encadeadas, ordem **8**, página de **595 bytes**
- Persistente em `./dados/alimento/alimento.idx.bmais.db` — indexa `nome → id` do **Alimento**
- **Consulta ordenada por nome resolvida pela B+** percorrendo as folhas encadeadas — **sem ordenação em memória** (`GET /api/alimento/ordenado`)
- **Novo relacionamento N:N** — *Alimentos Favoritos* — entre **Usuário** e **Alimento**
- Tabela intermediária `Favorito` com **chave primária composta** `(usuarioId, alimentoId)` validada antes da inserção
- **Dois índices Hash Extensível bidirecionais** (`favorito_por_usuario`, `favorito_por_alimento`)
- **Cascade**: remover Usuário/Alimento remove os favoritos vinculados e suas entradas nos dois índices
- Front-end com novas telas: *Favoritos* (CRUD + filtros por usuário/alimento) e *Formulário Fase 3* (8 questões)

### Fase 4 — Compressão
- **Compressão de todos os arquivos de dados** de `./dados/` num **único arquivo compactado** que funciona como **backup completo**
- **Huffman** implementado do zero (`app.compression.Huffman`) — codificação por prefixos de comprimento variável; a tabela de frequências é persistida no próprio fluxo para reconstruir a árvore
- **LZW** implementado do zero (`app.compression.LZW`) — dicionário adaptativo com códigos de 16 bits
- **Empacotador estilo TAR** (`app.compression.Backup`) reúne todos os arquivos num só fluxo antes de comprimir; a restauração recria a árvore de diretórios
- **Verificação de integridade (round-trip)** automática a cada geração: comprime → descomprime → compara byte a byte
- Arquivos gerados em `./backups/nutritrack_huffman.huff` e `./backups/nutritrack_lzw.lzw`
- Front-end com novas telas: *Backup & Compressão* (gerar / baixar / restaurar + taxa) e *Formulário Fase 4* (3 questões)
- API REST: `/api/backup` · menu de console: opção **5) Backup / Compressão**

### Fase 5 — Casamento de Padrões e Criptografia
- **KMP (Knuth-Morris-Pratt)** implementado do zero (`app.busca.KMP`) — vetor de falha (LPS) + busca em **O(n + m)**, retornando todas as ocorrências
- **Boyer-Moore** implementado do zero (`app.busca.BoyerMoore`) com as **duas** heurísticas: **bad character** (obrigatória) e **good suffix** (opcional)
- Algoritmos aplicados ao campo textual **`Alimento.nome`** — busca por subcadeia **insensível a maiúsculas/minúsculas e acentos** (complementa a B+ da Fase III, que faz busca ordenada/por prefixo)
- **Interface de pesquisa** em três frentes: menu de console (**opção 6**), API REST (`GET /api/busca`) e tela web *Busca por Padrão* — o usuário **escolhe o algoritmo**, informa o **padrão** e recebe os **registros encontrados** + métricas (comparações de caractere e tempo)
- **Criptografia XOR** (`app.seguranca.CriptografiaXOR`) no campo sensível **`Usuario.email`** (dado pessoal) — gravado **cifrado em repouso** no `usuario.db` e decifrado apenas em memória
- Front-end com novas telas: *Busca por Padrão*, *Segurança* (demonstração da cifra) e *Formulário Fase 5* (7 questões)

---

##  Estrutura

```
TP-AEDS-III/
├── dados/                                # gerado em runtime
│   ├── usuario/usuario.db + usuario.idx.{d,c}.db
│   ├── alimento/alimento.db + ...
│   ├── refeicao/refeicao.db + ...
│   ├── consumo/consumo.db + ...
│   ├── consumo_por_refeicao/consumo_por_refeicao.idx.{d,c}.db   # índice 1:N
│   ├── favorito/favorito.db + favorito.idx.{d,c}.db             # Fase 3 — tabela N:N
│   ├── favorito_por_usuario/...idx.{d,c}.db                     # Fase 3 — índice N:N
│   ├── favorito_por_alimento/...idx.{d,c}.db                    # Fase 3 — índice N:N
│   └── alimento/alimento.idx.bmais.db                           # Fase 3 — Árvore B+
├── src/app/
│   ├── Servidor.java                     # servidor HTTP embutido (porta 8080)
│   ├── Main.java                         # demo guiado (console)
│   ├── ConsoleApp.java                   # CRUD via menu (console)
│   ├── Arquivo.java                      # persistência genérica + índice primário
│   ├── Registro.java
│   ├── model/                            # Usuario, Alimento, Refeicao, Consumo
│   ├── controller/                       # validações + cascade
│   └── dao/
│       ├── HashExtensivel.java           # estrutura genérica
│       ├── RegistroHashExtensivel.java
│       ├── ParIDEndereco.java            # entrada do índice primário
│       ├── ParIDID.java                  # entrada do índice 1:N e dos N:N
│       ├── ArvoreBMais.java              # Árvore B+ genérica (Fase 3)
│       ├── RegistroArvoreBMais.java
│       ├── ParNomeID.java                # entrada da B+ (nome 60B + id 4B)
│       ├── FavoritoDAO.java              # tabela N:N + 2 índices Hash (Fase 3)
│       └── *DAO.java
├── src/app/compression/                  # Fase 4 — compressão
│   ├── Huffman.java                      # algoritmo de Huffman
│   ├── LZW.java                          # algoritmo LZW
│   ├── Backup.java                       # empacotador (TAR) de ./dados
│   ├── CompressaoService.java            # orquestra empacotar + comprimir + verificar
│   └── ResultadoCompressao.java          # tamanhos, taxa e integridade
├── src/app/busca/                         # Fase 5 — casamento de padrões
│   ├── KMP.java                          # Knuth-Morris-Pratt (vetor de falha + busca)
│   ├── BoyerMoore.java                   # Boyer-Moore (bad character + good suffix)
│   ├── BuscaService.java                 # aplica KMP/BM em Alimento.nome + métricas
│   ├── ResultadoBusca.java               # resultado agregado (registros + comparações)
│   ├── ItemEncontrado.java               # 1 registro encontrado (id, posições)
│   └── ResultadoCasamento.java           # posições + comparações de uma execução
├── src/app/seguranca/                     # Fase 5 — criptografia
│   └── CriptografiaXOR.java              # cifra XOR de chave repetida (campo email)
├── backups/                              # gerado em runtime (arquivos compactados)
└── web/
    ├── index.html  app.js  styles.css    # SPA
    └── documentacao.html                 # documentação completa
```

---

##  Como executar

### Pré-requisitos
- **JDK 17+** (testado com OpenJDK 21) no PATH

### Passo a passo (Windows PowerShell)

```powershell
# 1. Compilar (gera ./out)
if (Test-Path out) { Remove-Item -Recurse -Force out }
New-Item -ItemType Directory out | Out-Null
javac -d out (Get-ChildItem -Recurse src -Filter *.java | ForEach-Object { $_.FullName })

# 2. Executar — escolha UMA das 3 opções:

#  (a) Servidor HTTP + front-end (RECOMENDADO)
java -cp out app.Servidor
#       depois abra: http://localhost:8080

#  (b) CRUD completo via console
java -cp out app.ConsoleApp

#  (c) Demo guiado (cria 1 usuário + 2 alimentos + 1 refeição + 2 consumos)
java -cp out app.Main
```

### Linux / macOS

```bash
mkdir -p out
javac -d out $(find src -name "*.java")
java -cp out app.Servidor   # ou app.ConsoleApp / app.Main
```

>  Para começar do zero apague a pasta `./dados/` (os arquivos serão recriados).
>  Para forçar reconstrução dos índices apague apenas os `*.idx.*.db` — eles serão recriados a partir dos `.db` de dados na próxima execução.

---

##  API REST (servidor)

| Método | Rota | Descrição |
|---|---|---|
| GET / POST | `/api/usuario` | listar / criar |
| GET / PUT / DELETE | `/api/usuario/{id}` | CRUD por ID |
| GET / POST | `/api/alimento` | listar / criar |
| GET / PUT / DELETE | `/api/alimento/{id}` | CRUD por ID |
| GET / POST | `/api/refeicao` | listar / criar (valida FK usuarioId) |
| GET / PUT / DELETE | `/api/refeicao/{id}` | CRUD por ID; *delete* faz cascade |
| **GET** | **`/api/refeicao/{id}/consumos`** | **demonstra o índice 1:N (Hash Extensível)** |
| GET / POST | `/api/consumo` | listar / criar (valida FKs) |
| GET / PUT / DELETE | `/api/consumo/{id}` | CRUD por ID |
| **GET** | **`/api/backup`** | **status (tamanho da origem e dos backups)** |
| **POST** | **`/api/backup/huffman`** | **gera o backup compactado com Huffman + taxa** |
| **POST** | **`/api/backup/lzw`** | **gera o backup compactado com LZW + taxa** |
| **GET** | **`/api/backup/download/{huffman\|lzw}`** | **baixa o arquivo único compactado** |
| **POST** | **`/api/backup/restaurar/{huffman\|lzw}`** | **restaura o backup em `./dados_restaurado/`** |
| **GET** | **`/api/busca?padrao={texto}&algoritmo={kmp\|bm}`** | **Fase V — casamento de padrões em `Alimento.nome` (KMP/Boyer-Moore)** |
| **GET** | **`/api/seguranca/demo?texto={texto}`** | **Fase V — demonstração da cifra XOR (cifra/decifra)** |
| **GET** | **`/api/seguranca/usuario/{id}`** | **Fase V — e-mail em claro × bytes cifrados gravados em disco** |

---

##  Documentação técnica

Abra [`web/documentacao.html`](web/documentacao.html) (ou clique em " Documentação"
na barra do front-end). O documento inclui:

- Descrição do problema, objetivos e requisitos (Fase 1)
- DCU, DER e diagrama de arquitetura (Mermaid renderizado)
- Estrutura do arquivo binário (cabeçalho, lápide, espaço livre)
- **Fase 2:** estrutura física do Hash Extensível, fluxo de acesso ao 1:N, persistência, reconstrução
- API REST e validações
- **Formulário de Projeto (a–h) com respostas completas**

---

##  Smoke test rápido (PowerShell, com servidor rodando)

```powershell
$u = irm -Method Post -Uri http://localhost:8080/api/usuario -ContentType 'application/json' `
        -Body '{"nome":"Maria","email":"m@x","dataNascimento":"1995-01-01","telefones":["31999"]}'
$a = irm -Method Post -Uri http://localhost:8080/api/alimento -ContentType 'application/json' `
        -Body '{"nome":"Aveia","kcalPor100g":389,"proteinaPor100g":17,"carboPor100g":66,"gorduraPor100g":7,"tags":["graos"]}'
$r = irm -Method Post -Uri http://localhost:8080/api/refeicao -ContentType 'application/json' `
        -Body ('{"usuarioId":'+$u.id+',"data":"2026-04-23","tipo":"Café da manhã"}')
$c = irm -Method Post -Uri http://localhost:8080/api/consumo  -ContentType 'application/json' `
        -Body ('{"refeicaoId":'+$r.id+',"alimentoId":'+$a.id+',"quantidadeGramas":50}')

# consulta via índice 1:N (Hash Extensível)
irm http://localhost:8080/api/refeicao/$($r.id)/consumos
```

---

##  Fase IV — Compressão (Backup com Huffman e LZW)

O sistema gera um **único arquivo compactado** com **todos** os arquivos de `./dados/`,
funcionando como backup completo. Há duas formas de usar:

### Pela interface web
1. Inicie o servidor (`java -cp out app.Servidor`) e abra `http://localhost:8080`.
2. No menu lateral, abra **Backup & Compressão**.
3. Clique em **Gerar backup Huffman** e/ou **Gerar backup LZW** — a taxa de compressão e a
   verificação de integridade aparecem na hora.
4. Use **Baixar** para obter o arquivo `.huff`/`.lzw` ou **Restaurar** para extrair em `./dados_restaurado/`.
5. A aba **Formulário Fase 4** é preenchida automaticamente com os tamanhos e a taxa.

### Pelo console
```powershell
java -cp out app.ConsoleApp
#  -> 5) Backup / Compressão (Huffman e LZW)
#     1) Gerar Huffman | 2) Gerar LZW | 3) Comparar | 4/5) Restaurar
```

### Pela API (com o servidor rodando)
```powershell
# gera e mostra a taxa
irm -Method Post http://localhost:8080/api/backup/huffman
irm -Method Post http://localhost:8080/api/backup/lzw

# baixa o arquivo único compactado
irm http://localhost:8080/api/backup/download/huffman -OutFile nutritrack_huffman.huff
irm http://localhost:8080/api/backup/download/lzw     -OutFile nutritrack_lzw.lzw

# restaura em ./dados_restaurado/
irm -Method Post http://localhost:8080/api/backup/restaurar/huffman
```

### Formulário técnico (Fase IV)

> Os valores variam conforme a quantidade de dados em `./dados/` no momento da geração.
> Os números abaixo são um exemplo real obtido com a base de demonstração (`seed.ps1`).

**1. Taxa de compressão com Huffman**
- **a) Tamanho original:** soma dos bytes do pacote com todos os arquivos de `./dados/` (ex.: `8.874 bytes`)
- **b) Tamanho comprimido:** tamanho do arquivo `nutritrack_huffman.huff` (ex.: `5.073 bytes`)
- **c) Cálculo da taxa:** `taxa = (1 − 5073 / 8874) × 100 ≈ 42,83 %`
- **d) Interpretação:** o Huffman explora a **frequência** dos bytes. Como os arquivos `.db` têm muitos
  bytes de preenchimento (lápides, espaços livres, campos fixos), há boa redundância estatística. Ele
  atinge a entropia de ordem 0, mas não captura padrões de **sequências** repetidas.

**2. Taxa de compressão com LZW**
- **a) Tamanho original:** mesmo pacote da origem (ex.: `8.874 bytes`)
- **b) Tamanho comprimido:** tamanho do arquivo `nutritrack_lzw.lzw` (ex.: `4.269 bytes`)
- **c) Cálculo da taxa:** `taxa = (1 − 4269 / 8874) × 100 ≈ 51,89 %`
- **d) Interpretação:** o LZW monta um **dicionário** de sequências recorrentes. Em arquivos estruturados
  como os `.db` (cabeçalhos, sequências de bytes nulos, strings comuns), ele substitui sequências inteiras
  por um único código, alcançando taxa **igual ou superior** à do Huffman.

**3. Dificuldades e soluções**
- **Arquivo único:** os dados estão espalhados em várias pastas → empacotador estilo TAR (`Backup.empacotar`).
- **Huffman / persistir a árvore:** grava-se a **tabela de frequências** no cabeçalho do fluxo e reconstrói-se
  a árvore de forma determinística (fila de prioridade).
- **Huffman / empacotamento de bits:** códigos de tamanho variável → *bit buffer* que descarrega de 8 em 8 bits.
- **Huffman / símbolo único:** arquivo com um só byte distinto gera árvore de um nó → tratamento especial (código “0”).
- **LZW / sincronizar dicionário:** compressor e descompressor param de crescer no mesmo limite (65.536) e tratam o caso especial *KwKwK*.
- **Integridade:** verificação **round-trip** automática (comprime → descomprime → compara) antes de gravar.

---

##  Fase V — Casamento de Padrões (KMP / Boyer-Moore) e Criptografia

Dois algoritmos de casamento exato de padrões aplicados ao campo textual
**`Alimento.nome`**, mais **criptografia XOR** do campo sensível **`Usuario.email`**.

### Pela interface web
1. Inicie o servidor (`java -cp out app.Servidor`) e abra `http://localhost:8080`.
2. Abra **Busca por Padrão**: escolha **KMP** ou **Boyer-Moore**, digite o padrão (ex.: `frango`, `cozid`, `leite`) e clique em **Pesquisar**. Use **Comparar KMP × BM** para ver o número de comparações de cada um.
3. Abra **Segurança**: cifre/decifre um texto e veja o e-mail de um usuário em claro × cifrado (como fica em disco).

### Pelo console
```powershell
java -cp out app.ConsoleApp
#  -> 6) Pesquisar por padrão (KMP / BM)
#         escolhe o algoritmo (1=KMP, 2=Boyer-Moore), informa o padrão, vê os registros
#  -> 7) Criptografia (campo sensível: e-mail)
#         demonstra a cifra/decifra e mostra o e-mail cifrado em disco
```

### Pela API (com o servidor rodando)
```powershell
# casamento de padrões (KMP)
irm "http://localhost:8080/api/busca?padrao=frango&algoritmo=kmp"
# casamento de padrões (Boyer-Moore)
irm "http://localhost:8080/api/busca?padrao=cozid&algoritmo=bm"

# criptografia: demonstração da cifra
irm "http://localhost:8080/api/seguranca/demo?texto=segredo@email.com"
# criptografia: e-mail em claro x bytes cifrados gravados em disco
irm "http://localhost:8080/api/seguranca/usuario/1"
```

### Formulário técnico (Fase V)

**1. Qual campo textual foi escolhido? Por quê?**
`Alimento.nome` — é o campo textual mais consultado da base (o usuário procura alimentos pelo nome)
e é texto livre em que o padrão pode aparecer em qualquer posição. Resolve a busca por **subcadeia**,
complementando a Árvore B+ da Fase III (que faz apenas busca **ordenada / por prefixo**). A comparação é
**insensível a maiúsculas/minúsculas e acentos** (normalização NFD + remoção de diacríticos + minúsculas).

**2. Funcionamento do KMP**
Complexidade **O(n + m)**; o ponteiro do texto nunca retrocede. Usa o **vetor de falha** `lps`, em que
`lps[i]` é o comprimento do maior prefixo próprio de `padrao[0..i]` que também é sufixo. Ao desacasar na
posição `k`, o padrão desliza para `lps[k-1]` reaproveitando o que já casou; ao casar o padrão inteiro,
registra a ocorrência e continua de `lps[m-1]` (acha ocorrências sobrepostas). Pré-processamento em O(m),
busca em O(n). Arquivo: `app.busca.KMP` (`vetorFalha` + `buscar`).

**3. Funcionamento do Boyer-Moore**
Compara a janela **da direita para a esquerda** e usa duas heurísticas:
- **Bad Character (obrigatória):** alinha o caractere que desacasou com sua última ocorrência no padrão
  (ou pula a janela inteira se ele não existe). Tabela em `tabelaBadCharacter` (`Map` caractere → salto).
- **Good Suffix (opcional, também implementada):** quando um sufixo já casou, desloca para a próxima
  ocorrência desse sufixo (ou de um prefixo que seja seu sufixo). Usa o vetor `suff` (`tabelaGoodSuffix`).

A cada desacasamento aplica-se o **maior** dos dois saltos. No caso médio é **sublinear** — buscar `cozid`
na base de demonstração custou **~35 comparações** (BM) contra **~145** (KMP). Arquivo: `app.busca.BoyerMoore`.

**4. Como integrou os algoritmos ao sistema**
Pacote `app.busca`: `KMP` e `BoyerMoore` são puros (operam sobre `char[]`). `BuscaService` varre os
registros via `AlimentoDAO.listar()`, normaliza nome e padrão, aplica o algoritmo escolhido e devolve um
`ResultadoBusca` com os registros encontrados, posições e métricas. Exposto no **console** (opção 6), na
**API** (`GET /api/busca`) e na **tela web** *Busca por Padrão*.

**5. Dificuldades encontradas**
- KMP: acertar a recorrência `k = lps[k-1]` sem retroceder o índice do texto (validado com ocorrências sobrepostas).
- Boyer-Moore: a pré-computação do *good suffix* (vetor `suff` + dois casos) é delicada — seguiu-se a referência clássica de Charras & Lecroq.
- Bad character para alfabeto grande: `Map<Character,Integer>` em vez de vetor de 65.536 posições.
- Acentos/caixa: normalização (NFD) na camada de serviço, mantendo os algoritmos puros.
- Múltiplas ocorrências + métricas: retornar todas as posições e contar comparações para comparar os algoritmos.

**6. Qual campo foi utilizado na criptografia?**
`Usuario.email` — dado pessoal (PII). É gravado **cifrado** no arquivo `usuario.db` e decifrado apenas em
memória (transparente para controllers, JSON e busca). No arquivo, o nome aparece legível mas o e-mail não:
o texto `"@nutritrack..."` não existe em claro no `.db`.

**7. Qual foi o método utilizado na criptografia?**
**XOR de chave repetida** (cifra simétrica): `cifrado[i] = claro[i] XOR chave[i mod |chave|]`. O XOR é a
sua própria inversa, então a mesma rotina cifra e decifra; aplicado byte a byte, preserva o tamanho do dado.
Arquivo: `app.seguranca.CriptografiaXOR`. *(Método didático; em produção usar-se-ia AES/ChaCha20 com a chave
fora do código.)*

---

