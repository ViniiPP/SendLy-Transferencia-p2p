export interface Session {
  code: string                           //  código de 6 letras que os dois usuários compartilham
  hostSocketId: string                   //  o ID do socket de quem gerou o código
  guestSocketId: string | null           //  o ID do socket de quem entrou (começa null até alguém entrar)
  createdAt: number                      //  timestamp de quando foi criada (para saber se expirou)
  timer: ReturnType<typeof setTimeout>   // referência ao temporizador de 5 minutos (para poder cancelar)
}
