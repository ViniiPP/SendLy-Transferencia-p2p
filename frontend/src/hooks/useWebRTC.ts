import { useCallback, useEffect, useRef, useState } from 'react'
import { PeerStatus, ReceivedFile, SentFile, TransferProgress } from '../types'
import { socketService } from '../services/socketService'
import { webrtcService } from '../services/webrtcService'

export function useWebRTC() {
  const [status, setStatus] = useState<PeerStatus>('idle')
  const [code, setCode] = useState<string | null>(null)
  const [progress, setProgress] = useState<TransferProgress | null>(null)
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([])
  const [sentFiles, setSentFiles] = useState<SentFile[]>([])
  const [error, setError] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<RTCDataChannel | null>(null)
  const codeRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  function cleanup() {
    pcRef.current?.close()
    pcRef.current = null
    channelRef.current = null
    socketService.disconnect()
  }

  const setupChannelHandlers = useCallback((channel: RTCDataChannel, files?: File[]) => {
    channelRef.current = channel
    const receiver = webrtcService.createReceiver({
      onFile: (file) => setReceivedFiles((prev) => [...prev, file]),
    })

    channel.onopen = () => {
      setStatus('connected')
      if (files && files.length > 0) {
        sendFiles(files, channel)
      }
    }

    channel.onmessage = receiver.handleMessage
    channel.onclose = () => setStatus('disconnected')
  }, [])

  const generateCode = useCallback(async () => {
    setStatus('generating')
    const socket = socketService.getSocket()
    const pc = webrtcService.createPeerConnection()
    pcRef.current = pc

    const channel = pc.createDataChannel('files', { ordered: true })
    setupChannelHandlers(channel)

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && codeRef.current) {
        socket.emit('ice-candidate', { candidate, code: codeRef.current })
      }
    }

    socket.emit('generate-code', (generatedCode: string) => {
      codeRef.current = generatedCode
      setCode(generatedCode)
      setStatus('waiting')
    })

    socket.on('peer-joined', async () => {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit('offer', { sdp: offer, code: codeRef.current })
    })

    socket.on('answer', async (sdp: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(sdp)
    })

    socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
      await pc.addIceCandidate(candidate).catch(() => null)
    })

    socket.on('peer-disconnected', () => {
      setStatus('disconnected')
      cleanup()
    })
  }, [setupChannelHandlers])

  const joinSession = useCallback(async (inputCode: string) => {
    setStatus('joining')
    const socket = socketService.getSocket()
    const pc = webrtcService.createPeerConnection()
    pcRef.current = pc

    pc.ondatachannel = (event) => {
      setupChannelHandlers(event.channel)
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit('ice-candidate', { candidate, code: inputCode })
      }
    }

    socket.emit('join-session', inputCode, async (result: { ok: boolean; error?: string }) => {
      if (!result.ok) {
        setError(result.error || 'código inválido ou expirado')
        setStatus('error')
        cleanup()
        return
      }
      codeRef.current = inputCode
    })

    socket.on('offer', async (sdp: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(sdp)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('answer', { sdp: answer, code: inputCode })
    })

    socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
      await pc.addIceCandidate(candidate).catch(() => null)
    })

    socket.on('peer-disconnected', () => {
      setStatus('disconnected')
      cleanup()
    })
  }, [setupChannelHandlers])

  function sendFiles(files: File[], channel?: RTCDataChannel) {
    const ch = channel || channelRef.current
    if (!ch || ch.readyState !== 'open') return

    abortRef.current = new AbortController()
    setStatus('transferring')

    webrtcService.sendFiles({
      files,
      channel: ch,
      signal: abortRef.current.signal,
      onProgress: (index, transferred, total, speedBps) => {
        const remainingSeconds = speedBps > 0 ? (total - transferred) / speedBps : Infinity
        setProgress({
          fileId: `file-${index}`,
          fileName: files[index].name,
          totalBytes: total,
          transferredBytes: transferred,
          speedBps,
          remainingSeconds,
        })
      },
      onDone: () => {
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
      },
    })
  }

  function cancelTransfer() {
    abortRef.current?.abort()
    setStatus('connected')
    setProgress(null)
  }

  function reset() {
    cleanup()
    setStatus('idle')
    setCode(null)
    setProgress(null)
    setError(null)
    setReceivedFiles([])
    setSentFiles([])
    codeRef.current = null
  }

  useEffect(() => {
    const handleUnload = () => {
      socketService.disconnect()
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      cleanup()
    }
  }, [])

  return {
    status,
    code,
    progress,
    receivedFiles,
    sentFiles,
    error,
    generateCode,
    joinSession,
    sendFiles: (files: File[]) => sendFiles(files),
    cancelTransfer,
    reset,
  }
}
