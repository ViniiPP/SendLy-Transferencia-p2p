import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import healthRouter from './routes/healthRouter'
import { registerSignalingHandlers } from './socket/signalingHandler'

const app = express()
const httpServer = createServer(app)

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const PORT = process.env.PORT || 3001

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
})

app.use(cors({ origin: CLIENT_URL }))
app.use(express.json())

app.use((_, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

app.use('/api', healthRouter)

io.on('connection', (socket) => {
  registerSignalingHandlers(io, socket)
})

httpServer.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
})
