import { httpServer } from './src/http_server/index.ts';
import { WebSocketBattleship } from './src/ws_server/server.ts';

const HTTP_PORT = 8181;
const server = new WebSocketBattleship(3000);
console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);
