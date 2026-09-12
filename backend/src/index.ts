import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom.js";
import { LobbyRegistry } from "./lobbies/LobbyRegistry.js";
import { getDeploymentInfo } from "./deploymentInfo.js";

const port = Number(process.env.PORT || 2567);
const app = express();
export const lobbyRegistry = new LobbyRegistry();

app.use(cors());
app.use(express.json());

const gameServer = new Server({
  server: createServer(app)
});

gameServer.define('game_room', GameRoom).filterBy(["lobbyId"]);

app.get("/lobbies", (_request, response) => {
  response.json({ lobbies: lobbyRegistry.list() });
});

app.get("/deployment-info", (_request, response) => {
  response.json(getDeploymentInfo());
});

app.post("/lobbies", (request, response) => {
  const name = typeof request.body?.name === "string" ? request.body.name : "New Game";
  response.status(201).json({ lobby: lobbyRegistry.create(name) });
});

gameServer.listen(port).then(() => {
  console.log(`[GameServer] Listening on Port: ${port}`);
});
