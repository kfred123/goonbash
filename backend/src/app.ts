import express from "express";
import cors from "cors";
import { LOBBY_NAME_ERROR, normalizeLobbyName } from "shared";
import { LobbyRegistry, lobbyRegistry } from "./lobbies/LobbyRegistry.js";
import { getDeploymentInfo } from "./deploymentInfo.js";

export function createApp(registry: LobbyRegistry = lobbyRegistry) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/lobbies", (_request, response) => {
    response.json({ lobbies: registry.list() });
  });
  app.get("/deployment-info", (_request, response) => {
    response.json(getDeploymentInfo());
  });
  app.post("/lobbies", (request, response) => {
    const name = normalizeLobbyName(request.body?.name);
    if (!name) {
      response.status(400).json({ error: LOBBY_NAME_ERROR });
      return;
    }
    response.status(201).json({ lobby: registry.create(name) });
  });
  return app;
}
