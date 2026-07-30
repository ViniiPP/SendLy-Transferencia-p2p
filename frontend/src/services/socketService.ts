import { io, Socket } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(BACKEND_URL, {
      transports: ['websocket'],
      autoConnect: true,
    })
  }
  return socket
}

function disconnect(): void {
  socket?.disconnect()
  socket = null
}

export const socketService = { getSocket, disconnect }
