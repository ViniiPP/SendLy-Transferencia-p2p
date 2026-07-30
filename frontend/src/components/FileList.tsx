import { File as FileIcon, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatBytes } from '../utils/formatters'

interface FileEntry {
  file: File
  id: string
}

interface Props {
  files: FileEntry[]
  onRemove: (id: string) => void
}

export function FileList({ files, onRemove }: Props) {
  if (files.length === 0) return null

  return (
    <ul className="w-full flex flex-col gap-2">
      <AnimatePresence>
        {files.map(({ file, id }) => (
          <motion.li
            key={id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 bg-white/50 backdrop-blur-sm border border-purple-100 rounded-xl px-4 py-3"
          >
            <FileIcon size={16} className="text-purple-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-purple-800 truncate">{file.name}</p>
              <p className="text-xs text-purple-400">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={() => onRemove(id)}
              className="text-purple-300 hover:text-purple-600 transition-colors"
            >
              <X size={15} />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
