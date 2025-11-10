import { MessageType, PlayerAuth, PlayerWS, WebSocketMessage } from '@/models/types';
import { WebSocketServer } from 'ws';
import { v4 as uuidV4 } from 'uuid';
import { players } from '@/db/in-memory-db';

const PORT = 3000;

export class WebSocketBattleship {
  private wss: WebSocketServer;

  constructor(port = PORT) {
    this.wss = new WebSocketServer({ port });
    this.setupWSServer();
  }

  private setupWSServer() {
    this.wss.on('connection', (ws: PlayerWS) => {
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleMessage(message, ws);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error:`, error.message);
      });

      ws.on('close', () => {
        console.log(`Client disconnected.`);
      });
    });
  }

  private handleMessage(message: WebSocketMessage, ws: PlayerWS) {
    switch (message.type) {
      case MessageType.auth:
        const user = JSON.parse(message.data) as PlayerAuth;
        this.authPlayer(user, ws);
        break;
    }
  }

  private authPlayer({ name, password }: PlayerAuth, ws: PlayerWS) {
    const index = uuidV4();
    ws.name = name;
    ws.id = index;
    players.set(index, { id: index, name, password, ws });

    this.sendMessage(MessageType.auth, { name, index, error: false, errorText: '' }, ws);

    console.log(`Player ${name}, password: ${password}`);
  }

  private sendMessage(type: MessageType, data: unknown, ws: PlayerWS) {
    ws.send(
      JSON.stringify({
        type,
        data: JSON.stringify({ data }),
        id: 0,
      })
    );
  }
}
