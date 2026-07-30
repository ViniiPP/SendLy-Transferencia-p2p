import { PeerStatus } from '../types'
import { motion } from 'framer-motion'

const CONFIG: Record<PeerStatus, { label: string; color: string; dot: string; pulse: boolean }> = {
  idle:         { label: 'aguardando',    color: 'bg-purple-50 text-purple-400', dot: 'bg-purple-300', pulse: false },
  generating:   { label: 'gerando...',   color: 'bg-purple-50 text-purple-500', dot: 'bg-purple-400', pulse: true  },
  waiting:      { label: 'aguardando par', color: 'bg-yellow-50 text-yellow-600', dot: 'bg-yellow-400', pulse: true },
  joining:      { label: 'conectando...', color: 'bg-purple-50 text-purple-500', dot: 'bg-purple-400', pulse: true  },
  connected:    { label: 'conectado',    color: 'bg-green-50 text-green-600',   dot: 'bg-green-400',  pulse: false },
  transferring: { label: 'transferindo', color: 'bg-blue-50 text-blue-600',     dot: 'bg-blue-400',   pulse: true  },
  done:         { label: 'concluído',    color: 'bg-green-50 text-green-600',   dot: 'bg-green-500',  pulse: false },
  error:        { label: 'erro',         color: 'bg-red-50 text-red-500',       dot: 'bg-red-400',    pulse: false },
  disconnected: { label: 'desconectado', color: 'bg-gray-50 text-gray-400',     dot: 'bg-gray-300',   pulse: false },
}

interface Props {
  status: PeerStatus
}

export function StatusBadge({ status }: Props) {
  const cfg = CONFIG[status]

  return (
    <motion.span
      key={status}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${cfg.color} ${cfg.pulse ? 'animate-pulse' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </motion.span>
  )
}
