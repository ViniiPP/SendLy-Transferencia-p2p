import { motion } from 'framer-motion'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  code: string
}

export function CodeDisplay({ code }: Props) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <p className="text-sm text-purple-500 font-medium tracking-widest uppercase">
        compartilhe o código
      </p>

      <div className="flex gap-2">
        {code.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="w-11 h-14 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm border border-purple-200 text-2xl font-bold text-purple-700 shadow-sm"
          >
            {char}
          </motion.span>
        ))}
      </div>

      <button
        onClick={handleCopy}
        className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 transition-colors"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? 'copiado' : 'copiar código'}
      </button>
    </motion.div>
  )
}
