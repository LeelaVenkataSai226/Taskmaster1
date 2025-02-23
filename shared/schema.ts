import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const emailConfigs = pgTable("email_configs", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  type: text("type").notNull(), // IMAP, POP3, GMAIL
  active: boolean("active").default(true),
});

export const pdfMetadata = pgTable("pdf_metadata", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  fromAddress: text("from_address").notNull(),
  subject: text("subject").notNull(),
  dateReceived: timestamp("date_received").notNull(),
  filePath: text("file_path").notNull(),
  configId: integer("config_id").references(() => emailConfigs.id),
});

export const insertEmailConfigSchema = createInsertSchema(emailConfigs).pick({
  email: true,
  password: true,
  host: true,
  port: true,
  type: true,
  active: true,
});

export const insertPdfMetadataSchema = createInsertSchema(pdfMetadata).pick({
  filename: true,
  fromAddress: true,
  subject: true,
  dateReceived: true,
  filePath: true,
  configId: true,
});

export type InsertEmailConfig = z.infer<typeof insertEmailConfigSchema>;
export type EmailConfig = typeof emailConfigs.$inferSelect;
export type InsertPdfMetadata = z.infer<typeof insertPdfMetadataSchema>;
export type PdfMetadata = typeof pdfMetadata.$inferSelect;
