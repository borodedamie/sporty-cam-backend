import { Express, Request, Response } from "express";
import * as swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import logger from "./logger";
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sporty Cam API",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    // security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

function swaggerDocs(app: Express, port: any) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get("/docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  logger.info(`Docs available at http://localhost:${port}/api-docs`);
}

export default swaggerDocs;