import { emailConfigs, pdfMetadata, type EmailConfig, type InsertEmailConfig, type PdfMetadata, type InsertPdfMetadata } from "@shared/schema";

export interface IStorage {
  // Email config operations
  getEmailConfigs(): Promise<EmailConfig[]>;
  getEmailConfig(id: number): Promise<EmailConfig | undefined>;
  createEmailConfig(config: InsertEmailConfig): Promise<EmailConfig>;
  updateEmailConfig(id: number, config: Partial<InsertEmailConfig>): Promise<EmailConfig | undefined>;
  deleteEmailConfig(id: number): Promise<void>;
  
  // PDF metadata operations
  getPdfMetadata(): Promise<PdfMetadata[]>;
  createPdfMetadata(metadata: InsertPdfMetadata): Promise<PdfMetadata>;
}

export class MemStorage implements IStorage {
  private emailConfigs: Map<number, EmailConfig>;
  private pdfMetadata: Map<number, PdfMetadata>;
  private currentEmailConfigId: number;
  private currentPdfMetadataId: number;

  constructor() {
    this.emailConfigs = new Map();
    this.pdfMetadata = new Map();
    this.currentEmailConfigId = 1;
    this.currentPdfMetadataId = 1;
  }

  async getEmailConfigs(): Promise<EmailConfig[]> {
    return Array.from(this.emailConfigs.values());
  }

  async getEmailConfig(id: number): Promise<EmailConfig | undefined> {
    return this.emailConfigs.get(id);
  }

  async createEmailConfig(config: InsertEmailConfig): Promise<EmailConfig> {
    const id = this.currentEmailConfigId++;
    const newConfig = { ...config, id };
    this.emailConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateEmailConfig(id: number, config: Partial<InsertEmailConfig>): Promise<EmailConfig | undefined> {
    const existing = this.emailConfigs.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...config };
    this.emailConfigs.set(id, updated);
    return updated;
  }

  async deleteEmailConfig(id: number): Promise<void> {
    this.emailConfigs.delete(id);
  }

  async getPdfMetadata(): Promise<PdfMetadata[]> {
    return Array.from(this.pdfMetadata.values());
  }

  async createPdfMetadata(metadata: InsertPdfMetadata): Promise<PdfMetadata> {
    const id = this.currentPdfMetadataId++;
    const newMetadata = { ...metadata, id };
    this.pdfMetadata.set(id, newMetadata);
    return newMetadata;
  }
}

export const storage = new MemStorage();
