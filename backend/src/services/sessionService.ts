import { Session } from '../types'

// armazenar todas as sesões na RAM
const sessions = new Map<string, Session>()

// close da sessão em 5min
const SESSION_TTL_MS = 5 * 60 * 1000


function create(code: string, hostSocketId: string): Session {
  const timer = setTimeout(() => remove(code), SESSION_TTL_MS)     // ao criar sessão ja agenda a destruição do code após SESSION_TTL_MS

  const session: Session = {
    code,
    hostSocketId,
    guestSocketId: null,
    createdAt: Date.now(),
    timer,
  }

  sessions.set(code, session)
  return session
}

function get(code: string): Session | undefined {
  return sessions.get(code)
}

function join(code: string, guestSocketId: string): Session | null {
  const session = sessions.get(code)
  if (!session || session.guestSocketId !== null) return null   // rejeita se alguém ja estiver conectado, só um par por vez

  session.guestSocketId = guestSocketId
  return session
}

function remove(code: string): void {
  const session = sessions.get(code)
  if (session) {
    clearTimeout(session.timer)
    sessions.delete(code)
  }
}

// percorre todas as sessões buscando qual pertence a um socket: usado quando o usuário desconecta, sabemos qual sessão destruir
function findBySocket(socketId: string): Session | undefined {
  for (const session of sessions.values()) {
    if (session.hostSocketId === socketId || session.guestSocketId === socketId) {
      return session
    }
  }
  return undefined
}

export const sessionService = { create, get, join, remove, findBySocket }
