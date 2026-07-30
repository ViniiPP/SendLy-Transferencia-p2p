import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Upload } from 'lucide-react'

interface Props {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export function DropZone({ onFiles, disabled }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted.length > 0) onFiles(accepted)
    },
    disabled,
    multiple: true,
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div
        {...getRootProps()}
        className={`
          relative w-full rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-3 cursor-pointer transition-all
          ${isDragActive
            ? 'border-purple-500 bg-purple-50/60'
            : 'border-purple-200 bg-white/40 hover:border-purple-400 hover:bg-white/60'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={isDragActive ? { scale: 1.2 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center"
        >
          <Upload size={22} className="text-purple-500" />
        </motion.div>

        <div className="text-center">
          <p className="text-sm font-medium text-purple-700">
            {isDragActive ? 'solte os arquivos aqui' : 'arraste arquivos ou clique para selecionar'}
          </p>
          <p className="text-xs text-purple-400 mt-1">qualquer formato, múltiplos arquivos</p>
        </div>
      </div>
    </motion.div>
  )
}
