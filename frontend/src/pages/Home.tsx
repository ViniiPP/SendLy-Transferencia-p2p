import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Send, Zap, LogIn, ArrowLeft } from 'lucide-react'
import sendlyLogo from '../images/Sendly_Logo.png'
import { useWebRTC } from '../hooks/useWebRTC'
import { CodeDisplay } from '../components/CodeDisplay'
import { CodeInput } from '../components/CodeInput'
import { DropZone } from '../components/DropZone'
import { FileList } from '../components/FileList'
import { ProgressBar } from '../components/ProgressBar'
import { StatusBadge } from '../components/StatusBadge'
import { TransferHistory } from '../components/TransferHistory'
import { SentHistory } from '../components/SentHistory'
import { FileEntry } from '../types'

let fileIdCounter = 0

type HomeMode = 'idle' | 'generate' | 'join'

export function Home() {
  const {
    status,
    code,
    progress,
    receivedFiles,
    sentFiles,
    error,
    generateCode,
    joinSession,
    sendFiles,
    cancelTransfer,
    reset,
  } = useWebRTC()

  const [mode, setMode] = useState<HomeMode>('idle')
  const [pendingFiles, setPendingFiles] = useState<FileEntry[]>([])

  const addFiles = useCallback((incoming: File[]) => {
    const entries: FileEntry[] = incoming.map((f) => ({
      file: f,
      id: String(++fileIdCounter),
    }))
    setPendingFiles((prev) => [...prev, ...entries])
  }, [])

  function removeFile(id: string) {
    setPendingFiles((prev) => prev.filter((e) => e.id !== id))
  }

  function handleSend() {
    if (pendingFiles.length === 0) return
    sendFiles(pendingFiles.map((e) => e.file))
    setPendingFiles([])
  }

  function handleReset() {
    reset()
    setMode('idle')
    setPendingFiles([])
  }

  function resolveView(): 'idle' | 'code-display' | 'code-input' | 'connecting' | 'active' | 'error' {
    if (status === 'error' || status === 'disconnected') return 'error'
    if (status === 'connected' || status === 'transferring' || status === 'done') return 'active'
    if (status === 'joining') return 'connecting'
    if (status === 'waiting' || status === 'generating') return 'code-display'
    if (mode === 'join') return 'code-input'
    return 'idle'
  }

  const view = resolveView()

  const showStatus = view !== 'idle'

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-8">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <img src={sendlyLogo} alt="Sendly" className="h-45 mx-auto -mb-8" />
          <p className="text-base font-medium text-purple-400 mt-0">Transferência p2p no navegador</p>
        </motion.div>

        <div className="w-full bg-white/60 backdrop-blur-md rounded-3xl border border-purple-100 shadow-xl shadow-purple-100/50 p-8 flex flex-col gap-6">

          {showStatus && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex justify-center"
            >
              <StatusBadge status={status} />
            </motion.div>
          )}

          <AnimatePresence mode="wait">

            {view === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <p className="text-center text-sm text-purple-500 font-medium uppercase">
                  Como deseja conectar?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-generate"
                    onClick={() => { setMode('generate'); generateCode() }}
                    className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-md shadow-purple-200"
                  >
                    <Zap size={20} />
                    <span className="text-sm font-semibold">Gerar código</span>
                  </button>
                  <button
                    id="btn-join"
                    onClick={() => setMode('join')}
                    className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 transition-colors"
                  >
                    <LogIn size={20} />
                    <span className="text-sm font-semibold">Inserir código</span>
                  </button>
                </div>
              </motion.div>
            )}

            {view === 'code-display' && code && (
              <motion.div
                key="code-display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6"
              >
                <CodeDisplay code={code} />
                <p className="text-xs text-purple-400 text-center">
                  aguardando o outro dispositivo inserir o código...
                </p>
              </motion.div>
            )}

            {view === 'code-input' && (
              <motion.div
                key="code-input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-5"
              >
                <CodeInput onSubmit={joinSession} />
                <button
                  id="btn-cancel-join"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-1.5 text-sm text-purple-400 hover:text-purple-600 transition-colors mx-auto"
                >
                  <ArrowLeft size={14} /> voltar
                </button>
              </motion.div>
            )}

            {view === 'connecting' && (
              <motion.div
                key="connecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-4"
              >
                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-purple-500">conectando...</p>
              </motion.div>
            )}

            {view === 'active' && (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-5"
              >
                {status === 'connected' && (
                  <>
                    <DropZone onFiles={addFiles} />
                    <FileList files={pendingFiles} onRemove={removeFile} />
                    {pendingFiles.length > 0 && (
                      <button
                        id="btn-send"
                        onClick={handleSend}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors shadow-md shadow-purple-200"
                      >
                        <Send size={16} />
                        enviar {pendingFiles.length} arquivo{pendingFiles.length > 1 ? 's' : ''}
                      </button>
                    )}
                  </>
                )}

                {status === 'transferring' && progress && (
                  <ProgressBar progress={progress} onCancel={cancelTransfer} />
                )}

                {status === 'done' && (
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center text-green-600 font-semibold text-sm py-2"
                  >
                    transferência concluída
                  </motion.p>
                )}

                <SentHistory files={sentFiles} />
                <TransferHistory files={receivedFiles} />
              </motion.div>
            )}

            {view === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 text-center py-2"
              >
                <p className="text-sm text-red-500 font-medium">
                  {error || 'conexão encerrada'}
                </p>
                <p className="text-xs text-purple-400">
                  feche a aba ou reinicie para tentar novamente
                </p>
                <button
                  id="btn-reset"
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 transition-colors font-medium"
                >
                  <RefreshCw size={15} /> recomeçar
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {(view === 'active' || view === 'code-display' || view === 'connecting' || view === 'code-input') && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            id="btn-reset-active"
            onClick={handleReset}
            className="text-sm text-purple-400 hover:text-purple-600 transition-colors flex items-center gap-1.5 font-medium"
          >
            <RefreshCw size={14} /> encerrar sessão
          </motion.button>
        )}

      </div>
    </main>
  )
}
