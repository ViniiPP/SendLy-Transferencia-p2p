# documentação técnica — sendly

## sumário

1. [visão geral da arquitetura](#arquitetura)
2. [fluxo completo de conexão](#fluxo)
3. [backend](#backend)
   - [tipos](#tipos-backend)
   - [sessionservice](#sessionservice)
   - [signalinghandler](#signalinghandler)
   - [entry point](#entry-point)
4. [frontend](#frontend)
   - [tipos](#tipos-frontend)
   - [socketservice](#socketservice)
   - [webrtcservice](#webrtcservice)
   - [usewebrtc](#usewebrtc)
   - [componentes](#componentes)
   - [página home](#home)
5. [variáveis de ambiente](#env)
6. [glossário](#glossário)

---

## arquitetura

o projeto é um monorepo npm com dois pacotes independentes: `backend` e `frontend`.

```
blip/
├── package.json                  monorepo root com npm workspaces
├── backend/                      node.js + express + socket.io
│   └── src/
│       ├── index.ts              entry point: http server + socket.io
│       ├── types/index.ts        interfaces TypeScript do backend
│       ├── routes/
│       │   └── healthRouter.ts   GET /api/health para keep-alive no Render
│       ├── services/
│       │   └── sessionService.ts gerenciamento de sessões em memória
│       └── socket/
│           └── signalingHandler.ts todos os eventos socket.io por conexão
└── frontend/                     react + vite + tailwind
    └── src/
        ├── types/index.ts        interfaces TypeScript do frontend
        ├── utils/formatters.ts   formatBytes, formatSpeed, formatTimeRemaining
        ├── services/
        │   ├── socketService.ts  singleton do socket.io-client
        │   └── webrtcService.ts  peer connection, chunking, receiver
        ├── hooks/
        │   └── useWebRTC.ts      orquestra socket + webrtc, expõe estado
        ├── components/
        │   ├── CodeDisplay.tsx   exibe código de 6 dígitos animado
        │   ├── CodeInput.tsx     input OTP com foco automático e paste
        │   ├── DropZone.tsx      drag-and-drop com react-dropzone
        │   ├── FileList.tsx      lista de arquivos pendentes com remoção
        │   ├── ProgressBar.tsx   progresso em tempo real com velocidade
        │   ├── SentHistory.tsx   histórico de arquivos enviados na sessão
        │   ├── StatusBadge.tsx   badge de status com cores e pulsação
        │   └── TransferHistory.tsx arquivos recebidos com download
        ├── images/
        │   └── Sendly_Logo.png   logo do produto (PNG sem fundo)
        └── pages/
            └── Home.tsx          página única com máquina de estados visual
```

---

## fluxo completo de conexão

```
usuário A (browser)            servidor (node.js)           usuário B (browser)
      |                              |                              |
      |-- socket.connect() --------->|                              |
      |-- emit('generate-code') ---->|                              |
      |<-- callback(code) -----------|                              |
      |   [status: waiting]          |                              |
      |                              |<-- socket.connect() ---------|
      |                              |<-- emit('join-session',code)-|
      |                              |-- sessionService.join() ---->|
      |<-- emit('peer-joined') ------|-- emit('peer-joined') ------>|
      |   [status: generating]       |   [status: joining]          |
      |                              |                              |
      |-- pc.createOffer() (local)   |                              |
      |-- emit('offer', sdp) ------->|                              |
      |                              |-- emit('offer', sdp) ------->|
      |                              |   pc.setRemoteDescription()  |
      |                              |   pc.createAnswer()          |
      |                              |<-- emit('answer', sdp) ------|
      |<-- emit('answer', sdp) ------|                              |
      |   pc.setRemoteDescription()  |                              |
      |                              |                              |
      |-- emit('ice-candidate') ---->|-- emit('ice-candidate') ---->|
      |<-- emit('ice-candidate') ----|<-- emit('ice-candidate') ----|
      |                              |                              |
      |<===== RTCDataChannel aberto: conexão P2P direta ==========>|
      |   [status: connected]        |   [status: connected]        |
      |                              |                              |
      |-- channel.send(meta) ------->|                              |
      |-- channel.send(chunk×N) ---->|                              |
      |-- channel.send(eof) -------->|                              |
      |                              |                 onFile(blob) |
```

após o datachannel abrir, o servidor não participa mais da transferência.

---

## backend

### tipos backend

**arquivo:** `backend/src/types/index.ts`

```ts
export interface Session {
  code: string
  hostSocketId: string
  guestSocketId: string | null
  createdAt: number
  timer: ReturnType<typeof setTimeout>
}
```

`ReturnType<typeof setTimeout>` extrai o tipo de retorno da função `setTimeout` em vez de hardcodar `NodeJS.Timeout`. isso é mais robusto porque o tipo correto varia entre ambientes (browser vs Node).

`guestSocketId: string | null` — o `null` é intencional: indica que a sessão foi criada mas ainda não tem par. a função `join` verifica esse campo para rejeitar uma segunda tentativa de entrada.

---

### sessionservice

**arquivo:** `backend/src/services/sessionService.ts`

**estrutura de dados:**

```ts
const sessions = new Map<string, Session>()
```

um `Map` é preferível a um objeto literal (`{}`) aqui porque:
- a chave pode ser qualquer string sem conflito com propriedades de `Object.prototype`
- `Map.prototype.delete` é O(1)
- iteração (`sessions.values()`) é na ordem de inserção

**TTL automático:**

```ts
const timer = setTimeout(() => remove(code), SESSION_TTL_MS)
```

ao criar a sessão, o próprio `setTimeout` agenda a limpeza. se o par conectar antes, o `remove` chamado no `disconnect` faz `clearTimeout(session.timer)` — evita que o timer tente remover uma sessão já destruída.

**restrição de par único:**

```ts
if (!session || session.guestSocketId !== null) return null
```

a condição `session.guestSocketId !== null` garante que um código só pode ser usado uma vez. mesmo que dois browsers digitem o mesmo código simultaneamente, o primeiro a chamar `join` atualiza `guestSocketId` e o segundo recebe `null`.

**busca por socket:**

```ts
function findBySocket(socketId: string): Session | undefined {
  for (const session of sessions.values()) {
    if (session.hostSocketId === socketId || session.guestSocketId === socketId) {
      return session
    }
  }
}
```

complexidade O(n) onde n é o número de sessões ativas. para a escala de um servidor free tier com TTL de 5 minutos, isso é completamente aceitável. em produção de larga escala, seria mantido um índice reverso `socketId → code`.

---

### signalinghandler

**arquivo:** `backend/src/socket/signalingHandler.ts`

**gerador de código:**

```ts
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)
```

o alfabeto exclui `I`, `O`, `0`, `1` para evitar ambiguidade visual ao digitar manualmente. `nanoid` usa `crypto.getRandomValues` internamente — criptograficamente seguro.

**relay de signaling:**

```ts
socket.on('offer', (payload: { sdp: unknown; code: string }) => {
  const targetId =
    socket.id === session.hostSocketId ? session.guestSocketId : session.hostSocketId
  if (targetId) io.to(targetId).emit('offer', payload.sdp)
})
```

o servidor usa `unknown` para o `sdp` propositalmente — ele não precisa entender o conteúdo, apenas repassar. isso também elimina dependências de tipos WebRTC que não existem no Node.js.

`io.to(targetId).emit(...)` envia para um socket específico pelo ID, sem broadcast.

**cleanup no disconnect:**

```ts
socket.on('disconnect', () => {
  const session = sessionService.findBySocket(socket.id)
  if (!session) return

  const peerId = socket.id === session.hostSocketId
    ? session.guestSocketId
    : session.hostSocketId

  sessionService.remove(session.code)
  if (peerId) io.to(peerId).emit('peer-disconnected')
})
```

o evento `disconnect` é emitido pelo Socket.IO automaticamente quando o socket fecha por qualquer motivo: fechar aba, perda de rede, refresh. a sessão é destruída antes de avisar o par — garante que o código não possa ser reutilizado.

---

### entry point

**arquivo:** `backend/src/index.ts`

**header de cache:**

```ts
app.use((_, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})
```

`no-store` impede qualquer cache em proxies, CDNs ou browsers. `_` é convenção TypeScript para parâmetro ignorado.

**CORS:**

```ts
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] }
})
```

sem o header CORS correto, o browser bloqueia a conexão WebSocket com `Cross-Origin Request Blocked`. o `CLIENT_URL` vem de variável de ambiente — nunca hardcoded.

---

## frontend

### tipos frontend

**arquivo:** `frontend/src/types/index.ts`

**PeerStatus como union type:**

```ts
export type PeerStatus =
  | 'idle' | 'generating' | 'waiting' | 'joining'
  | 'connected' | 'transferring' | 'done'
  | 'error' | 'disconnected'
```

um union type garante que o TypeScript rejeite qualquer valor não listado em tempo de compilação. o componente `StatusBadge` usa um `Record<PeerStatus, ...>` — se um novo status for adicionado sem atualizar o Record, o compilador aponta o erro.

**SentFile:**

```ts
export interface SentFile {
  id: string
  name: string
  size: number
  sentAt: number
}
```

registra os metadados de cada arquivo enviado durante a sessão. não armazena o conteúdo (Blob) — apenas nome e tamanho para exibir no histórico.

---

### socketservice

**arquivo:** `frontend/src/services/socketService.ts`

**padrão singleton:**

```ts
let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(BACKEND_URL, { transports: ['websocket'] })
  }
  return socket
}
```

sem o singleton, cada chamada a `getSocket()` criaria uma nova conexão WebSocket. o `!socket.connected` reconecta se o socket tiver sido desconectado externamente (ex: timeout do servidor).

`transports: ['websocket']` desativa o polling HTTP que o Socket.IO usa como fallback. em produção com HTTPS/WSS não há motivo para polling.

---

### webrtcservice

**arquivo:** `frontend/src/services/webrtcService.ts`

**iceservers com TURN opcional:**

```ts
function buildIceServers(): RTCIceServer[] {
  const servers = [...STUN_SERVERS]
  const turnUrl = import.meta.env.VITE_TURN_URL
  if (turnUrl) servers.push({ urls: turnUrl, username: ..., credential: ... })
  return servers
}
```

STUN público do Google (`stun:stun.l.google.com:19302`) funciona para a maioria dos casos. TURN é necessário quando ambos os dispositivos estão atrás de NAT simétrico — comum em redes corporativas e alguns provedores 4G.

**chunking e backpressure:**

```ts
const CHUNK_SIZE = 64 * 1024

while (offset < file.size) {
  await waitForBufferDrain(channel)
  const slice = file.slice(offset, offset + CHUNK_SIZE)
  const buffer = await slice.arrayBuffer()
  channel.send(buffer)
  offset += buffer.byteLength
}
```

o `RTCDataChannel` tem um buffer interno (`bufferedAmount`). sem controle de backpressure, enviar dados mais rápido do que a rede processa encheria o buffer e causaria erros ou perda de dados.

```ts
function waitForBufferDrain(channel: RTCDataChannel): Promise<void> {
  const HIGH_WATERMARK = 1024 * 1024
  if (channel.bufferedAmount < HIGH_WATERMARK) return Promise.resolve()

  return new Promise((resolve) => {
    const check = () => {
      if (channel.bufferedAmount < HIGH_WATERMARK) resolve()
      else setTimeout(check, 50)
    }
    check()
  })
}
```

pooling a cada 50ms é uma abordagem simples. a alternativa mais eficiente seria usar `channel.onbufferedamountlow` com `channel.bufferedAmountLowThreshold`, mas o pooling é mais compatível entre browsers.

**protocolo de transferência:**

```
sender                     receiver
  |-- JSON {type:'meta', name, size} -->|   anuncia o arquivo
  |-- ArrayBuffer (chunk 1) ----------->|
  |-- ArrayBuffer (chunk 2) ----------->|
  |-- ...                               |
  |-- JSON {type:'eof'} --------------->|   fim do arquivo
                                        |   Blob(chunks) → onFile()
```

a separação entre mensagens de controle (JSON strings) e dados (ArrayBuffer) é feita pela verificação `typeof event.data === 'string'` no receiver.

**cancelamento com AbortSignal:**

```ts
async function sendFiles({ signal, ... }) {
  for (let i = 0; i < files.length; i++) {
    if (signal.aborted) break
    while (offset < file.size) {
      if (signal.aborted) return
      ...
    }
  }
}
```

o `AbortController/AbortSignal` é o padrão da Web API para cancelamento cooperativo — o código verifica o sinal em pontos seguros em vez de ser interrompido abruptamente.

---

### usewebrtc

**arquivo:** `frontend/src/hooks/useWebRTC.ts`

**separação useRef vs useState:**

```ts
const [status, setStatus] = useState<PeerStatus>('idle')
const pcRef = useRef<RTCPeerConnection | null>(null)
const channelRef = useRef<RTCDataChannel | null>(null)
```

`useState` causa re-render quando muda — correto para `status` porque a UI precisa atualizar. `useRef` não causa re-render — correto para `pcRef` porque mudar a referência não requer atualização visual, e re-renders destruiriam a referência ao objeto WebRTC.

**useCallback para handlers:**

```ts
const setupChannelHandlers = useCallback((channel: RTCDataChannel, files?: File[]) => {
  ...
}, [])
```

`useCallback` com dependências vazias garante referência estável — necessário porque `setupChannelHandlers` é passada como dependência de outros `useCallback`. sem isso, `generateCode` e `joinSession` seriam recriadas a cada render.

**cleanup no beforeunload:**

```ts
useEffect(() => {
  const handleUnload = () => socketService.disconnect()
  window.addEventListener('beforeunload', handleUnload)
  return () => window.removeEventListener('beforeunload', handleUnload)
}, [])
```

o `return` dentro de `useEffect` é a função de cleanup — roda quando o componente desmonta ou antes do efeito rodar novamente. sem o `removeEventListener`, o listener ficaria na memória mesmo após o componente desmontar.

**histórico de arquivos enviados (sentFiles):**

```ts
const [sentFiles, setSentFiles] = useState<SentFile[]>([])

// dentro do onDone da transferência:
const sent: SentFile[] = files.map((f, i) => ({
  id: `sent-${Date.now()}-${i}`,
  name: f.name,
  size: f.size,
  sentAt: Date.now(),
}))
setSentFiles((prev) => [...prev, ...sent])
setStatus('done')
setProgress(null)
setTimeout(() => {
  setStatus((current) => current === 'done' ? 'connected' : current)
}, 2000)
```

após cada envio, os metadados dos arquivos são acumulados em `sentFiles`. o `setTimeout` de 2 segundos volta o status para `'connected'` automaticamente — permitindo que o usuário envie mais arquivos na mesma sessão sem reconectar. a verificação `current === 'done'` garante que o timeout não interfira se o usuário encerrar a sessão antes.

---

### componentes

#### CodeDisplay

animação em cascata por letra:

```tsx
{code.split('').map((char, i) => (
  <motion.span
    key={i}
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.06 }}
  >
    {char}
  </motion.span>
))}
```

`delay: i * 0.06` — cada letra aparece 60ms depois da anterior. com 6 letras, o total da animação é 360ms.

#### CodeInput

```tsx
function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
  e.preventDefault()
  const pasted = e.clipboardData.getData('text')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
  ...
}
```

`e.preventDefault()` cancela o comportamento padrão do paste — sem isso o texto colaria no campo focado em vez de ser distribuído. a regex `/[^A-Z0-9]/g` remove qualquer caractere que não seja letra ou número.

#### ProgressBar

```tsx
<motion.div
  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
  animate={{ width: `${pct}%` }}
  transition={{ ease: 'linear', duration: 0.2 }}
/>
```

framer motion interpola o `width` entre renders — sem isso a barra "pularia" de posição a cada update de progresso.

#### SentHistory

mesmo design visual do `TransferHistory`, porém voltado para o remetente:

- exibe o histórico de todos os arquivos enviados durante a sessão
- sem botão de download — o arquivo já estava no dispositivo do usuário
- ícone `Send` (lucide-react) no lugar de `Download`
- acumula lotes consecutivos: cada envio adiciona ao array sem apagar o anterior

#### TransferHistory

```ts
function download(f: ReceivedFile) {
  const url = URL.createObjectURL(f.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = f.name
  a.click()
  URL.revokeObjectURL(url)
}
```

`URL.createObjectURL` cria uma URL temporária apontando para o `Blob` na memória. `URL.revokeObjectURL` libera essa memória imediatamente após o download iniciar. o arquivo nunca sai do browser do receptor.

---

### home

**arquivo:** `frontend/src/pages/Home.tsx`

**máquina de estados visual com resolveView:**

```ts
function resolveView() {
  if (status === 'error' || status === 'disconnected') return 'error'
  if (status === 'connected' || status === 'transferring' || status === 'done') return 'active'
  if (status === 'joining') return 'connecting'
  if (status === 'waiting' || status === 'generating') return 'code-display'
  if (mode === 'join') return 'code-input'
  return 'idle'
}
```

a função mapeia dois estados independentes (`status` do WebRTC e `mode` do componente) para uma única view. isso evita condicionais aninhadas no JSX e garante que exatamente uma view seja renderizada por vez.

**AnimatePresence:**

```tsx
<AnimatePresence mode="wait">
  {view === 'idle' && <motion.div key="idle" ...>}
  {view === 'active' && <motion.div key="active" ...>}
</AnimatePresence>
```

`mode="wait"` garante que a animação de saída termine antes da entrada começar — sem isso as duas views ficam visíveis simultaneamente durante a transição. `key` único é obrigatório para o AnimatePresence identificar qual elemento está saindo.

---

## variáveis de ambiente

### backend

| variável | padrão | descrição |
|---|---|---|
| `PORT` | `3001` | porta do servidor HTTP |
| `CLIENT_URL` | `http://localhost:5173` | origem permitida no CORS |
| `TURN_URL` | — | endpoint TURN (opcional) |
| `TURN_USERNAME` | — | usuário TURN |
| `TURN_PASSWORD` | — | senha TURN |

### frontend

| variável | padrão | descrição |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:3001` | URL do backend |
| `VITE_TURN_URL` | — | endpoint TURN (opcional) |
| `VITE_TURN_USERNAME` | — | usuário TURN |
| `VITE_TURN_PASSWORD` | — | senha TURN |

variáveis do Vite devem ter o prefixo `VITE_` para serem expostas ao bundle do frontend. variáveis sem esse prefixo não são incluídas no build.

---

## glossário

| termo | definição |
|---|---|
| **WebRTC** | Web Real-Time Communication — API nativa do browser para conexão P2P de áudio, vídeo e dados sem servidor intermediário |
| **RTCPeerConnection** | objeto que representa a conexão WebRTC entre dois peers |
| **RTCDataChannel** | canal de dados bidirecional dentro de uma RTCPeerConnection |
| **Offer/Answer** | mecanismo de negociação WebRTC: um peer cria um offer (proposta SDP), o outro responde com um answer |
| **SDP** | Session Description Protocol — formato de texto que descreve as capacidades de mídia e rede de um peer |
| **ICE** | Interactive Connectivity Establishment — framework para encontrar o melhor caminho de rede entre dois peers |
| **ICE Candidate** | possível rota de rede (IP:porta) que um peer pode usar para conectar |
| **STUN** | Session Traversal Utilities for NAT — servidor que ajuda o browser a descobrir seu IP público |
| **TURN** | Traversal Using Relays around NAT — servidor de relay quando conexão direta falha |
| **NAT** | Network Address Translation — mecanismo de roteadores que mapeia IPs privados para um IP público |
| **Signaling** | processo de trocar metadados (SDP, ICE candidates) para estabelecer a conexão WebRTC; não padronizado — qualquer canal serve |
| **Socket.IO** | biblioteca de comunicação em tempo real com reconexão automática, rooms e namespaces sobre WebSocket |
| **WebSocket** | protocolo de comunicação bidirecional persistente sobre TCP |
| **Chunk** | pedaço de 64KB em que o arquivo é dividido para envio pelo DataChannel |
| **Blob** | Binary Large Object — representação de dados binários (arquivo) na memória do browser |
| **backpressure** | mecanismo de controle de fluxo que pausa o envio quando o receptor não consegue processar na velocidade do emissor |
| **Singleton** | padrão de design onde apenas uma instância de um objeto existe em toda a aplicação |
| **AbortController** | API Web padrão para cancelamento cooperativo de operações assíncronas |
| **useRef** | hook React que armazena uma referência mutável sem causar re-render |
| **useCallback** | hook React que memoriza a referência de uma função entre renders |
| **useEffect** | hook React para efeitos colaterais: subscriptions, event listeners, timers |
| **AnimatePresence** | componente do Framer Motion que detecta saída de filhos e executa animação de saída |
| **union type** | tipo TypeScript que aceita um conjunto fixo de valores literais |
| **monorepo** | repositório único contendo múltiplos pacotes relacionados |
| **TTL** | Time To Live — tempo máximo de vida de um recurso antes de ser destruído |
| **P2P** | Peer-to-Peer — comunicação direta entre dois clientes sem intermediário |
