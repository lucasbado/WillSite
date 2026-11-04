# WillSite

React + Flask, com ambiente local separado do banco e da API de produção.

## Executar localmente (PowerShell)

Na raiz `D:\Programacao\WillSite`, com as dependências instaladas em `venv` e `frontend/node_modules`:

```powershell
cd D:\Programacao\WillSite\backend
# Opcional: copie .env.example para .env.local e ajuste o segredo local.
..\venv\Scripts\python.exe -m flask --app run db upgrade
..\venv\Scripts\python.exe seed.py
..\venv\Scripts\python.exe run.py
```

O backend usa `backend/instance/willsite-local.db` por padrão. Desenvolvimento ignora `DATABASE_URL` e o antigo `backend/.env`; só usa `LOCAL_DATABASE_URL` e `backend/.env.local`. E-mails externos ficam desativados. O seed é exclusivo de desenvolvimento e cria `admin@sgat.com` / `admin123` apenas nesse banco local.

Em outro terminal:

```powershell
cd D:\Programacao\WillSite\frontend
npm start
```

Abra `http://localhost:3000`. O frontend usa `/api` e o proxy encaminha ao backend na porta **5001**. Para testar o build servido pelo próprio Flask, execute `npm run build` e abra `http://127.0.0.1:5001`.

## Permissões e retirada

- Rotas administrativas, estoque e fornecedores exigem administrador. Escrita de modelos também.
- Detalhes, status, cancelamento, recibo e confirmação de retirada respeitam o proprietário da OS. Recibos enviados por link exigem login; a tela de login retorna ao recibo solicitado.
- A conclusão do reparo calcula valores e baixa o estoque numa transação, gera um código e deixa a OS em **Pronto para Retirada**. Chamadas repetidas não baixam estoque novamente.
- `/api/os/<id>/entregar` confirma a retirada sem recalcular valores. Os dois formatos antigos de rota QR usam a mesma regra.
- Código aleatório de quatro dígitos, validade padrão de 30 minutos, máximo de cinco tentativas e uso único. Somente administrador pode gerar outro código ou liberar sem código. Liberações registram `delivery_bypassed` e `delivered_by_id`.
- `/healthz` e `/api/healthz`: saúde do processo, sem consulta ao banco. `/api/readyz`: verifica uma conexão ao banco.

## Testes

```powershell
cd D:\Programacao\WillSite\backend
..\venv\Scripts\python.exe -m unittest discover -s tests -v
..\venv\Scripts\python.exe -m flask --app run db check
cd ..\frontend
npm test -- --watchAll=false --runInBand
npm run lint
npm run build
```

Os testes de backend usam SQLite temporário e verificam isolamento, autorização, expiração, bloqueio, uso único, valores, estoque, indicadores financeiros e migração com dados existentes. Os testes do frontend cobrem login, filtros, separação de status, falhas de conexão e o ciclo de vida da câmera. O lint exige zero avisos, e o build foi validado com `CI=true`.

## Usabilidade

- Cliente: filtros de reparos em andamento, aguardando retirada e histórico; entregas mostram a data de confirmação. O laudo e o valor ficam disponíveis quando o reparo está pronto.
- As listas de reparos são atualizadas a cada 30 segundos quando a página está visível. O administrador não sofre atualizações automáticas durante a edição de uma OS.
- Administrador: filtros por status e atraso, busca por OS/nome/aparelho/telefone, filtros preservados ao fechar detalhes e pesquisa de histórico disponível no celular.
- Login com mostrar/ocultar senha, indicação de envio e prevenção de requisições duplicadas. Erros de conexão são diferenciados de credenciais inválidas.
- Falhas de carregamento exibem nova tentativa, preservando dados já carregados. O perfil não permite salvar campos vazios enquanto os dados originais não forem carregados.
- As telas de retirada usam o mesmo leitor de QR, que só abre a câmera ao tocar em Ativar scanner e libera o hardware ao sair.
- Financeiro sem métricas demonstrativas: ticket médio, SKUs com estoque, perdas por motivo e margem por serviço vêm dos registros. A margem usa o custo atual das peças e os custos informados por OS; não representa despesas não registradas.

## Banco e implantação

Iniciar a aplicação não cria nem altera tabelas. As migrações em `backend/migrations` são executadas explicitamente com `flask --app run db upgrade`.

No Render, `RENDER` ativa a configuração de produção automaticamente. Fora dele, defina `APP_ENV=production` antes de iniciar. Configure `DATABASE_URL` (PostgreSQL persistente), um `JWT_SECRET_KEY` privado, `FRONTEND_URL` e `CORS_ORIGINS` com os domínios reais. Se o frontend estiver em outro serviço, defina `REACT_APP_API_URL=https://seu-backend.onrender.com/api` no build. Configure as credenciais de e-mail somente em produção.

**Banco existente sem Alembic:** antes do primeiro deploy desta versão, faça backup e compare o esquema com `0001_baseline.py`. Se todas as tabelas, colunas e restrições dessa revisão já existirem, marque a base com `flask --app run db stamp 0001` e então execute `flask --app run db upgrade`. Não execute `stamp` em uma base incompleta; primeiro prepare uma migração compatível com o esquema real. As migrações foram verificadas localmente com SQLite; a base real de produção não foi acessada nesta alteração.

## Ping periódico externo

Após publicar a nova rota `/healthz`, execute em uma máquina ou servidor que continue ligado:

```powershell
cd D:\Programacao\WillSite
.\venv\Scripts\python.exe scripts\keep_alive.py --url https://willsite.onrender.com/healthz
```

O intervalo padrão é de 600 segundos (10 minutos). O processo faz requisições sem autenticação, com timeout e registro de falhas, e continua tentando após falhas de rede. Pare com Ctrl+C. Também aceita `KEEP_ALIVE_URL` e `--once` para uma única verificação:

```powershell
.\venv\Scripts\python.exe scripts\keep_alive.py --url http://127.0.0.1:5001/healthz --once
```

O processo precisa rodar fora do serviço Render: um loop no backend para junto com a hibernação. Enquanto o computador estiver desligado, o ping local não funciona. O plano gratuito do Render hiberna após 15 minutos sem tráfego de entrada e possui limite mensal de horas; consulte https://render.com/docs/free. Este mecanismo não é uma garantia de disponibilidade.

Para a versão antiga já publicada, a rota `/` também responde ao ping: use `--url https://willsite.onrender.com/` até publicar `/healthz`.

## Testar no Android por USB

Com depuração USB autorizada e ADB disponível, execute `adb reverse tcp:5001 tcp:5001`. No celular, abra `http://localhost:5001`. Esse endereço local permite usar a câmera sem expor o servidor na rede. Para desfazer o encaminhamento: `adb reverse --remove tcp:5001`.
