import { Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SentFile } from '../types'
import { formatBytes } from '../utils/formatters'

interface Props {
  files: SentFile[]
}

export function SentHistory({ files }: Props) {
  if (files.length === 0) return null

  return (
    <div className="w-full flex flex-col gap-2">
      <p className="text-xs font-medium text-purple-500 uppercase tracking-widest">
        arquivos enviados
      </p>
      <ul className="flex flex-col gap-2">
        <AnimatePresence>
          {files.map((f) => (
            <motion.li
              key={f.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 bg-white/50 backdrop-blur-sm border border-purple-100 rounded-xl px-4 py-3"
            >
              <div className="flex-shrink-0 text-purple-400">
                <Send size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-800 truncate">{f.name}</p>
                <p className="text-xs text-purple-400">{formatBytes(f.size)}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
