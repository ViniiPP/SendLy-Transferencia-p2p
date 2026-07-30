import { Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReceivedFile } from '../types'
import { formatBytes } from '../utils/formatters'

interface Props {
  files: ReceivedFile[]
}

export function TransferHistory({ files }: Props) {
  if (files.length === 0) return null

  function download(f: ReceivedFile) {
    const url = URL.createObjectURL(f.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = f.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <p className="text-xs font-medium text-purple-500 uppercase tracking-widest">
        arquivos recebidos
      </p>
      <ul className="flex flex-col gap-2">
        <AnimatePresence>
          {files.map((f) => (
            <motion.li
              key={f.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 bg-white/50 backdrop-blur-sm border border-green-100 rounded-xl px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-800 truncate">{f.name}</p>
                <p className="text-xs text-purple-400">{formatBytes(f.size)}</p>
              </div>
              <button
                onClick={() => download(f)}
                className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
              >
                <Download size={14} /> baixar
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
