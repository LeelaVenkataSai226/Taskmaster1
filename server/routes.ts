import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./email-service";
import { insertEmailConfigSchema, insertPdfMetadataSchema } from "@shared/schema";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  // Start email monitoring service
  emailService.startMonitoring();

  // Email config routes
  app.get("/api/email-configs", async (_req, res) => {
    try {
      const configs = await storage.getEmailConfigs();
      console.log("Fetched email configs:", configs); // Add logging
      res.json(configs);
    } catch (err) {
      console.error("Error fetching email configs:", err);
      res.status(500).json({ error: "Failed to fetch email configurations" });
    }
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

  // Manual check inbox route
  app.post("/api/check-inbox", async (_req, res) => {
    try {
      const configs = await storage.getEmailConfigs();
      for (const config of configs) {
        if (config.active) {
          await emailService.checkEmails(config).catch(err => {
            log(`Error checking emails for ${config.email}: ${err.message}`, 'email-service');
          });
        }
      }
      res.json({ message: "Inbox check initiated" });
    } catch (err) {
      res.status(500).json({ error: "Failed to check inbox" });
    }
  });

  // PDF metadata routes
  app.get("/api/pdf-metadata", async (_req, res) => {
    const metadata = await storage.getPdfMetadata();
    res.json(metadata);
  });

  const httpServer = createServer(app);
  return httpServer;
}