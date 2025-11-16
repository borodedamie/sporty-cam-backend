import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerDocs from "./utils/swagger";
import routes from "./routes";
import requestLogger from "./middleware/requestLogger";
import logger from "./utils/logger";
import http from "http";
import { initSocket } from "./lib/socket";
// import { scheduleApprovedPlayersSync } from "./jobs/sync-approved-players";

dotenv.config();

const app: Express = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

app.get("/", (_req: Request, res: Response) => {
  res.redirect("/api-docs");
});

app.use("/api", routes);

const server = http.createServer(app);
initSocket(server);

server.listen(port, () => {
  swaggerDocs(app, port);
  logger.info(`Server listening on port ${port}`);
  // scheduleApprovedPlayersSync({ timezone: process.env.TZ || undefined });
});
