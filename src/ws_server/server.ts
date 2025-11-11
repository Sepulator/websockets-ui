import { MessageType, PlayerAuth, PlayerWS, WebSocketMessage } from '@/models/types';
import { WebSocketServer } from 'ws';
import { v4 as uuidV4 } from 'uuid';
import { players, rooms, winners } from '@/db/in-memory-db';

const PORT = 3000;

export class WebSocketBattleship {
  private wss: WebSocketServer;
  private port: number;

  constructor(port = PORT) {
    this.wss = new WebSocketServer({ port });
    this.port = PORT;
    this.setupWSServer();
  }

  public info() {
    console.log(`Battleship server started on port ${this.port}`);
  }

  private setupWSServer() {
    this.wss.on('connection', (ws: PlayerWS) => {
      ws.on('message', async (data) => {
        try {
          const message = await Promise.resolve(JSON.parse(data.toString()) as WebSocketMessage);
          const payload = await Promise.resolve(JSON.parse(message.data) as unknown);
          console.log(message.type, payload);
          this.handleMessage(message.type, payload, ws);
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

  private handleMessage(type: MessageType, payload: unknown, ws: PlayerWS) {
    switch (type) {
      case MessageType.auth:
        this.authPlayer(payload as PlayerAuth, ws);
        break;
    }
  }

  private authPlayer({ name, password }: PlayerAuth, ws: PlayerWS) {
    const index = uuidV4();
    ws.name = name;
    ws.id = index;
    players.set(index, { id: index, name, password, ws });

    this.sendMessage(MessageType.auth, { name, index, error: false, errorText: '' }, ws);
    this.update(winners);
    this.update(rooms);
  }

  private update(data: unknown) {
    for (const [_, player] of players) {
      this.sendMessage(MessageType.updateWinners, data, player.ws);
    }
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
