import { ReceivedFile } from '../types'

const CHUNK_SIZE = 64 * 1024

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function buildIceServers(): RTCIceServer[] {
  const servers = [...STUN_SERVERS]

  const turnUrl = import.meta.env.VITE_TURN_URL
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_PASSWORD,
    })
  }

  return servers
}

function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: buildIceServers() })
}

interface SendOptions {
  files: File[]
  channel: RTCDataChannel
  onProgress: (fileIndex: number, transferred: number, total: number, speedBps: number) => void
  onDone: () => void
  signal: AbortSignal
}

async function sendFiles({ files, channel, onProgress, onDone, signal }: SendOptions): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    if (signal.aborted) break

    const file = files[i]
    const meta = JSON.stringify({ type: 'meta', name: file.name, size: file.size, index: i })
    channel.send(meta)

    let offset = 0
    let lastTime = Date.now()
    let lastOffset = 0

    while (offset < file.size) {
      if (signal.aborted) return

      await waitForBufferDrain(channel)

      const slice = file.slice(offset, offset + CHUNK_SIZE)
      const buffer = await slice.arrayBuffer()
      channel.send(buffer)

      offset += buffer.byteLength

      const now = Date.now()
      const elapsed = (now - lastTime) / 1000
      if (elapsed > 0.2) {
        const speedBps = (offset - lastOffset) / elapsed
        onProgress(i, offset, file.size, speedBps)
        lastTime = now
        lastOffset = offset
      }
    }

    channel.send(JSON.stringify({ type: 'eof', index: i }))
    onProgress(i, file.size, file.size, 0)
  }

  onDone()
}

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

interface ReceiveOptions {
  onFile: (file: ReceivedFile) => void
}

function createReceiver({ onFile }: ReceiveOptions) {
  let currentMeta: { name: string; size: number; index: number } | null = null
  const chunks: ArrayBuffer[] = []
  let receivedBytes = 0

  function handleMessage(event: MessageEvent) {
    if (typeof event.data === 'string') {
      const msg = JSON.parse(event.data)

      if (msg.type === 'meta') {
        currentMeta = { name: msg.name, size: msg.size, index: msg.index }
        chunks.length = 0
        receivedBytes = 0
        return
      }

      if (msg.type === 'eof' && currentMeta) {
        const blob = new Blob(chunks)
        onFile({
          id: `${currentMeta.index}-${Date.now()}`,
          name: currentMeta.name,
          size: currentMeta.size,
          blob,
          receivedAt: Date.now(),
        })
        currentMeta = null
        chunks.length = 0
        receivedBytes = 0
      }

      return
    }

    if (event.data instanceof ArrayBuffer) {
      chunks.push(event.data)
      receivedBytes += event.data.byteLength
    }
  }

  return { handleMessage }
}

export const webrtcService = { createPeerConnection, sendFiles, createReceiver }
