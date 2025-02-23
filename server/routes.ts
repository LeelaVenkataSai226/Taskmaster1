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
      console.log("Fetched email configs:", configs);
      res.json(configs);
    } catch (err) {
      console.error("Error fetching email configs:", err);
      res.status(500).json({ error: "Failed to fetch email configurations" });
    }
  });

  app.post("/api/email-configs", async (req, res) => {
    try {
      const parsed = insertEmailConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error });
      }

      // Test connection before saving
      const testResult = await emailService.testConnection(parsed.data);
      if (!testResult.success) {
        return res.status(400).json({ error: testResult.message });
      }

      const config = await storage.createEmailConfig(parsed.data);
      res.json(config);
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/email-configs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertEmailConfigSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error });
      }

      const existingConfig = await storage.getEmailConfig(id);
      if (!existingConfig) {
        return res.status(404).json({ error: "Config not found" });
      }

      // If credentials are being updated, test the connection
      if (parsed.data.email || parsed.data.password || parsed.data.host || parsed.data.port) {
        const testConfig = { ...existingConfig, ...parsed.data };
        const testResult = await emailService.testConnection(testConfig);
        if (!testResult.success) {
          return res.status(400).json({ error: testResult.message });
        }
      }

      const config = await storage.updateEmailConfig(id, parsed.data);
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }
      res.json(config);
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/email-configs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteEmailConfig(id);
    res.status(204).end();
  });

  // Test connection endpoint
  app.post("/api/test-connection", async (req, res) => {
    try {
      const parsed = insertEmailConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error });
      }

      const result = await emailService.testConnection(parsed.data);
      res.json(result);
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: error.message });
    }
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
      const error = err as Error;
      res.status(500).json({ error: error.message });
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