import { Server } from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom.js";
import { lobbyRegistry } from "./lobbies/LobbyRegistry.js";
import { createApp } from "./app.js";

const port = Number(process.env.PORT || 2567);
const app = createApp();
export { lobbyRegistry };

const gameServer = new Server({
  server: createServer(app)
});

gameServer.define('game_room', GameRoom).filterBy(["lobbyId"]);

gameServer.listen(port).then(() => {
  console.log(`[GameServer] Listening on Port: ${port}`);
});
