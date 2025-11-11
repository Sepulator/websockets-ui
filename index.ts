import { httpServer } from './src/http_server/index.ts';
import { WebSocketBattleship } from './src/ws_server/server.ts';

const HTTP_PORT = 8181;
const WS_PORT = 3000;

const server = new WebSocketBattleship(WS_PORT);
server.info();

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);
