# Tarefas Web

Interface web para cadastro e priorizacao de tarefas. Este app consome uma API REST e permite criar, editar, excluir e reordenar tarefas (inclusive com drag and drop).

## Requisitos
- Node.js (LTS recomendado)
- npm

## Instalacao
1) Entre na pasta do projeto:
   ```
   cd c:\Users\tiagg\Desktop\Repositories\Tarefas\web
   ```
2) Instale as dependencias:
   ```
   npm install
   ```

## Configuracao
A URL base da API e lida da variavel `VITE_API_BASE_URL`.

Crie um arquivo `.env` na raiz do projeto com:
```
VITE_API_BASE_URL=http://localhost:3000
```

Obs: se a variavel nao for definida, o app usa URL relativa (mesmo host).

## Como executar
1) Inicie o servidor da API (backend).
2) Rode o front-end:
   ```
   npm run dev
   ```
3) Abra o endereco exibido no terminal (geralmente `http://localhost:5173`).

## Funcionamento passo a passo
### 1) Carregamento inicial
- Ao abrir o app, ele faz GET em `/api/tarefas` para listar as tarefas cadastradas.
- Cada tarefa deve ter pelo menos: `id`, `nome`, `custo`, `data_limite` (ISO `yyyy-mm-dd`).

### 2) Criar tarefa
1) Clique em **Nova tarefa**.
2) Preencha:
   - Nome
   - Custo (numero)
   - Data limite (dd/MM/yyyy)
3) Clique no icone de calendario dentro do campo de data para abrir o seletor nativo, ou digite a data manualmente.
4) Clique em **Salvar**.
5) O app faz POST em `/api/tarefas` com:
   ```json
   {
     "nome": "Tarefa exemplo",
     "custo": 150.5,
     "data_limite": "2026-12-31"
   }
   ```
6) A lista e atualizada apos o retorno.

### 3) Editar tarefa
1) Clique no icone de lapis na linha da tarefa.
2) Ajuste os campos desejados.
3) Clique em **Salvar**.
4) O app faz PUT em `/api/tarefas/{id}` com o mesmo payload do cadastro.

### 4) Excluir tarefa
1) Clique no icone de lixeira.
2) Confirme no modal.
3) O app faz DELETE em `/api/tarefas/{id}`.

### 5) Reordenar tarefas
Use **drag and drop**: clique e arraste a linha da tarefa para a posicao desejada.

Quando voce solta a tarefa:
1) O app calcula quantas posicoes precisa mover.
2) Dispara PATCH em `/api/tarefas/{id}/mover` repetidas vezes (uma por passo), com body:
   ```json
   { "direction": "up" }
   ```
   ou
   ```json
   { "direction": "down" }
   ```
3) Ao final, recarrega a lista com GET `/api/tarefas`.

## Notas
- O campo de data aceita digitacao limpa (dd/MM/yyyy) e valida datas invalidas.
- Tarefas com custo >= 1000 sao destacadas na tabela.

## Scripts
- `npm run dev`: ambiente de desenvolvimento
- `npm run build`: build de producao
- `npm run preview`: preview do build
