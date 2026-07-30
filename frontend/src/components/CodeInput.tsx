import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react'
import { motion } from 'framer-motion'

interface Props {
  onSubmit: (code: string) => void
  disabled?: boolean
}

export function CodeInput({ onSubmit, disabled }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  function update(index: number, value: string) {
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)

    if (char && index < 5) inputs.current[index + 1]?.focus()

    if (next.every(Boolean)) {
      onSubmit(next.join(''))
    }
  }

  function handleKey(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    const next = Array(6).fill('')
    pasted.split('').forEach((c, i) => (next[i] = c))
    setDigits(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) onSubmit(pasted)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4"
    >
      <p className="text-sm text-purple-500 font-medium tracking-widest uppercase">
        digite o código
      </p>

      <div className="flex gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="text"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className="w-11 h-14 text-center text-2xl font-bold rounded-xl bg-white/60 backdrop-blur-sm border border-purple-200 text-purple-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all caret-transparent"
          />
        ))}
      </div>
    </motion.div>
  )
}
