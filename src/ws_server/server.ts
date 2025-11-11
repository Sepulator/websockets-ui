import { MessageType, PlayerAuth, PlayerWS, WebSocketMessage } from '@/models/types';
import { WebSocketServer } from 'ws';
import { v4 as uuidV4 } from 'uuid';
import { games, players, winners } from '@/db/in-memory-db';
import { getRooms } from '@/utils/getRooms';

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
          const payload = message.data ? await Promise.resolve(JSON.parse(message.data) as unknown) : null;

          console.log(message.data);
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
      case MessageType.createRoom:
        this.createRoom(ws);
        break;
    }
  }

  private authPlayer({ name, password }: PlayerAuth, ws: PlayerWS) {
    const index = uuidV4();
    ws.name = name;
    ws.index = index;
    players.set(index, { index, name, password, ws });

    this.sendMessage(MessageType.auth, { name, index, error: false, errorText: '' }, ws);
    this.updateRooms();
    this.updateWinners();
  }

  private update(type: MessageType, data: unknown) {
    for (const [_, player] of players) {
      this.sendMessage(type, data, player.ws);
    }
  }

  private updateWinners() {
    this.update(MessageType.updateWinners, winners);
  }

  private updateRooms() {
    const rooms = getRooms();
    console.log('rooms', JSON.stringify(rooms));
    this.update(MessageType.updateRoom, rooms);
  }

  private createRoom(first: PlayerWS) {
    const gameId = uuidV4();
    games.set(gameId, { first, second: null });
    this.updateRooms();
  }

  private sendMessage(type: MessageType, data: unknown, ws: PlayerWS) {
    ws.send(
      JSON.stringify({
        type,
        data: JSON.stringify(data),
        id: 0,
      })
    );
  }
}
