export type PeerStatus =
  | 'idle'
  | 'generating'
  | 'waiting'
  | 'joining'
  | 'connected'
  | 'transferring'
  | 'done'
  | 'error'
  | 'disconnected'

export interface FileEntry {
  file: File
  id: string
}

export interface TransferProgress {
  fileId: string
  fileName: string
  totalBytes: number
  transferredBytes: number
  speedBps: number
  remainingSeconds: number
}

export interface ReceivedFile {
  id: string
  name: string
  size: number
  blob: Blob
  receivedAt: number
}

export interface SignalingPayload {
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  code: string
}

export interface SentFile {
  id: string
  name: string
  size: number
  sentAt: number
}
