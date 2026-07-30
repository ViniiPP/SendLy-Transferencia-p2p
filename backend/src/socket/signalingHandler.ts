import { Server, Socket } from 'socket.io'
import { customAlphabet } from 'nanoid'
import { sessionService } from '../services/sessionService'

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

type JoinResult = { ok: boolean; error?: string }

export function registerSignalingHandlers(io: Server, socket: Socket): void {
  
  socket.on('generate-code', (callback: (code: string) => void) => {
    const code = nanoid()
    sessionService.create(code, socket.id)
    callback(code)
  })

  socket.on('join-session', (code: string, callback: (result: JoinResult) => void) => {
    const session = sessionService.join(code, socket.id)

    if (!session) {
      callback({ ok: false, error: 'invalid or expired code' })
      return
    }

    callback({ ok: true })
    io.to(session.hostSocketId).emit('peer-joined')
    socket.emit('peer-joined')
  })

  socket.on('offer', (payload: { sdp: unknown; code: string }) => {
    const session = sessionService.get(payload.code)
    if (!session) return

    const targetId =
      socket.id === session.hostSocketId ? session.guestSocketId : session.hostSocketId

    if (targetId) io.to(targetId).emit('offer', payload.sdp)
  })

  socket.on('answer', (payload: { sdp: unknown; code: string }) => {
    const session = sessionService.get(payload.code)
    if (!session) return

    const targetId =
      socket.id === session.hostSocketId ? session.guestSocketId : session.hostSocketId

    if (targetId) io.to(targetId).emit('answer', payload.sdp)
  })

  socket.on('ice-candidate', (payload: { candidate: unknown; code: string }) => {
    const session = sessionService.get(payload.code)
    if (!session) return

    const targetId =
      socket.id === session.hostSocketId ? session.guestSocketId : session.hostSocketId

    if (targetId) io.to(targetId).emit('ice-candidate', payload.candidate)
  })

  socket.on('disconnect', () => {
    const session = sessionService.findBySocket(socket.id)
    if (!session) return

    const peerId =
      socket.id === session.hostSocketId ? session.guestSocketId : session.hostSocketId

    sessionService.remove(session.code)

    if (peerId) io.to(peerId).emit('peer-disconnected')
  })
}
