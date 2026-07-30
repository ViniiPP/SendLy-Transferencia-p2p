import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { TransferProgress } from '../types'
import { formatBytes, formatSpeed, formatTimeRemaining } from '../utils/formatters'

interface Props {
  progress: TransferProgress
  onCancel: () => void
}

export function ProgressBar({ progress, onCancel }: Props) {
  const pct = progress.totalBytes > 0
    ? Math.round((progress.transferredBytes / progress.totalBytes) * 100)
    : 0

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-purple-700 font-medium truncate max-w-[60%]">
          {progress.fileName}
        </span>
        <span className="text-purple-400 text-xs">{pct}%</span>
      </div>

      <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: 'linear', duration: 0.2 }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-purple-400">
          {formatBytes(progress.transferredBytes)} de {formatBytes(progress.totalBytes)}
          {progress.speedBps > 0 && ` · ${formatSpeed(progress.speedBps)}`}
          {progress.remainingSeconds > 0 && ` · ${formatTimeRemaining(progress.remainingSeconds)}`}
        </span>

        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          <X size={13} /> cancelar
        </button>
      </div>
    </div>
  )
}
