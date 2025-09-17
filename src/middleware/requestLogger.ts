import expressWinston from "express-winston";
import logger from "../utils/logger";

const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "{{req.method}} {{req.url}} {{res.statusCode}} - {{res.responseTime}}ms",
  expressFormat: false,
  colorize: false,
});

export default requestLogger;
