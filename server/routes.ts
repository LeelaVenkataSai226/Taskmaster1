import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./email-service";
import { insertEmailConfigSchema, insertPdfMetadataSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Start email monitoring service
  emailService.startMonitoring();

  // Email config routes
  app.get("/api/email-configs", async (_req, res) => {
    const configs = await storage.getEmailConfigs();
    res.json(configs);
  });

  app.post("/api/email-configs", async (req, res) => {
    const parsed = insertEmailConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    const config = await storage.createEmailConfig(parsed.data);
    res.json(config);
  });

  app.patch("/api/email-configs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertEmailConfigSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    const config = await storage.updateEmailConfig(id, parsed.data);
    if (!config) {
      return res.status(404).json({ error: "Config not found" });
    }
    res.json(config);
  });

  app.delete("/api/email-configs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteEmailConfig(id);
    res.status(204).end();
  });

  // PDF metadata routes
  app.get("/api/pdf-metadata", async (_req, res) => {
    const metadata = await storage.getPdfMetadata();
    res.json(metadata);
  });

  const httpServer = createServer(app);
  return httpServer;
}
