import { Game, MessageType, PlayerAuth, PlayerWS, Ships, WebSocketMessage } from '@/models/types';
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
      ws.on('message', (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          const payload: unknown = message.data ? JSON.parse(message.data) : '';

          console.log(message.type, message.data);
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
      case MessageType.addToRoom:
        this.addToRoom(payload as { indexRoom: string }, ws);
        break;
      case MessageType.addShips: {
        this.addShips(payload as Ships);
        break;
      }
    }
  }

  private authPlayer({ name, password }: PlayerAuth, ws: PlayerWS) {
    const index = uuidV4();
    ws.name = name;
    ws.index = index;
    players.set(index, { index, name, password, ws });

    this.sendMessage(MessageType.auth, { name, index, error: false, errorText: '' }, ws);
    this.broadcastRooms();
    this.broadcastWinners();
  }

  private broadcast(type: MessageType, data: unknown) {
    for (const [_, player] of players) {
      this.sendMessage(type, data, player.ws);
    }
  }

  private broadcastWinners() {
    this.broadcast(MessageType.updateWinners, winners);
  }

  private broadcastRooms() {
    const rooms = getRooms();
    console.log('rooms', JSON.stringify(rooms));
    this.broadcast(MessageType.updateRoom, rooms);
  }

  private createRoom(first: PlayerWS) {
    const gameId = uuidV4();
    games.set(gameId, { first, second: null, gameBoard: { activePlayer: 'first', first: [], second: [] } });
    this.broadcastRooms();
  }

  private addToRoom({ indexRoom }: { indexRoom: string }, ws: PlayerWS) {
    const game = games.get(indexRoom);
    if (!game || game?.first.index === ws.index) {
      return;
    }

    game.second = ws;
    const gameWithPlayers = [game.first, game.second];
    this.broadcastRooms();
    this.createGame(gameWithPlayers, indexRoom);
  }

  private addShips(data: Ships) {
    const game = games.get(data.gameId);
    if (!game) {
      return;
    }

    if (game.first.index === data.indexPlayer) {
      game.gameBoard.first = data.ships;
    } else {
      game.gameBoard.second = data.ships;
    }

    if (game.gameBoard?.first && game.gameBoard.second) {
      this.startGame(game, data.gameId);
    }
  }

  private startGame(game: Game, gameId: string) {
    this.sendMessage(
      MessageType.startGame,
      {
        gameId,
        ships: game.gameBoard.first,
        currentPlayerIndex: game.first.index,
      },
      game.first
    );
    this.sendMessage(
      MessageType.startGame,
      {
        gameId,
        ships: game.gameBoard.second,
        currentPlayerIndex: game.second!.index,
      },
      game.second!
    );
  }

  private createGame(gameWithPlayers: PlayerWS[], idGame: string) {
    for (const player of gameWithPlayers) {
      this.sendMessage(MessageType.createGame, { idGame, idPlayer: player.index }, player);
    }
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
