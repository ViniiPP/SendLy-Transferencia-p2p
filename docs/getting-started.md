# como usar o sendly

## o que é

sendly é uma ferramenta para enviar arquivos de um dispositivo para outro diretamente pelo navegador.

sem instalar nada. sem criar conta. sem o arquivo passar por nenhum servidor.

você abre no computador, a outra pessoa abre no celular, troca um código, e pronto — os arquivos vão direto de um para o outro. você pode continuar enviando mais arquivos na mesma sessão sem precisar reconectar.

---

## como funciona em palavras simples

imagine dois celulares que precisam se encontrar em uma cidade enorme.

o servidor do sendly é como um ponto de encontro: ele diz onde cada um está, apresenta os dois, e vai embora. depois que os dois se conhecem, conversam diretamente — sem ninguém no meio.

o arquivo nunca fica guardado no servidor. ele vai do seu browser direto para o browser da outra pessoa.

---

## passo a passo para usar

**dispositivo 1 — quem vai enviar:**

1. abra o sendly no navegador
2. clique em **Gerar código**
3. um código de 6 letras vai aparecer na tela
4. mande esse código para a outra pessoa (por whatsapp, sms, o que for)

**dispositivo 2 — quem vai receber:**

1. abra o sendly no navegador
2. clique em **Inserir código**
3. digite o código que recebeu
4. aguarde conectar

**quando conectar:**

- os dois lados vão ver que estão conectados
- arraste os arquivos para a área indicada ou clique para selecionar
- clique em **enviar**
- do outro lado aparece o arquivo para baixar
- após o envio, a área de upload reaparece automaticamente — você pode enviar mais arquivos sem precisar reconectar
- o histórico de **arquivos enviados** e **arquivos recebidos** fica visível durante toda a sessão

---

## coisas importantes de saber

- o código expira em 5 minutos se ninguém usar
- se fechar a aba, a conexão encerra imediatamente — use **encerrar sessão** para fechar de forma controlada
- cada código só funciona para uma conexão — não dá para entrar duas vezes no mesmo código
- funciona com qualquer tipo de arquivo (foto, pdf, vídeo, zip, etc)
- funciona entre dispositivos diferentes: pc e celular, mac e windows, android e iphone
- você pode enviar múltiplos lotes de arquivos na mesma sessão

---

## como rodar o projeto localmente

essa parte é para quem quer rodar o dropweb no próprio computador, seja para desenvolver ou para testar.

### o que você precisa ter instalado

- **node.js 20 ou superior** — [baixar em nodejs.org](https://nodejs.org)
- **npm 10 ou superior** — vem junto com o node.js

para verificar se já tem, abra o terminal e rode:

```bash
node --version
npm --version
```

se aparecer a versão, está ok.

### passo 1 — baixar o projeto

```bash
git clone https://github.com/seu-usuario/sendly.git
cd sendly
```

### passo 2 — instalar as dependências

dentro da pasta do projeto:

```bash
npm install
```

isso instala tudo que o projeto precisa de uma vez só.

### passo 3 — configurar as variáveis de ambiente

o projeto precisa de dois arquivos `.env` — um para o backend e um para o frontend.

**backend:**

```bash
cd backend
cp .env.example .env
```

o arquivo `.env` gerado já tem os valores certos para rodar localmente. você não precisa mudar nada por agora.

**frontend:**

```bash
cd ../frontend
cp .env.example .env
```

mesma coisa — os valores padrão já funcionam localmente.

volte para a raiz do projeto:

```bash
cd ..
```

### passo 4 — rodar o projeto

na raiz do projeto:

```bash
npm run dev
```

esse comando inicia o backend e o frontend ao mesmo tempo.

- frontend: abra `http://localhost:5173` no navegador
- backend: rodando em `http://localhost:3001` (você não precisa abrir isso, é automático)

### passo 5 — testar entre dois dispositivos na mesma rede

para testar entre o computador e o celular, você precisa do IP local do computador.

**no windows:**

```bash
ipconfig
```

procure por **endereço ipv4** — vai ser algo como `192.168.1.105`.

**no mac ou linux:**

```bash
ip a
```

procure por uma linha com `inet 192.168.x.x`.

depois edite o arquivo `frontend/.env` e troque:

```env
VITE_BACKEND_URL=http://192.168.1.105:3001
```

use o ip que você encontrou. depois reinicie o projeto com `npm run dev`.

no celular, abra `http://192.168.1.105:5173` — o celular e o computador precisam estar na mesma rede wi-fi.

---

## se algo não funcionar

**o código expirou:**
clique em recomeçar e gere um novo código. cada código dura só 5 minutos.

**a conexão não estabelece:**
isso pode acontecer em redes com restrições (como redes corporativas ou escolas). tente em uma rede wi-fi doméstica ou use um hotspot do celular.

**o backend não inicia:**
verifique se a porta 3001 não está sendo usada por outro programa. você pode mudar a porta no arquivo `backend/.env`.
