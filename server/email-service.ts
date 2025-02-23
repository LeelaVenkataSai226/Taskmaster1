import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fs from 'fs/promises';
import path from 'path';
import { storage } from './storage';
import type { EmailConfig } from '@shared/schema';

export class EmailService {
  private checkInterval: NodeJS.Timer | null = null;

  async startMonitoring() {
    // Check emails every 5 minutes
    this.checkInterval = setInterval(async () => {
      const configs = await storage.getEmailConfigs();
      for (const config of configs) {
        if (config.active) {
          await this.checkEmails(config);
        }
      }
    }, 5 * 60 * 1000);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkEmails(config: EmailConfig) {
    const imap = new Imap({
      user: config.email,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: true
    });

    return new Promise((resolve, reject) => {
      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) reject(err);

          // Search for unread messages with attachments
          imap.search(['UNSEEN', ['HEADER', 'content-type', 'application/pdf']], (err, results) => {
            if (err) reject(err);

            const fetch = imap.fetch(results, { bodies: '', markSeen: true });

            fetch.on('message', (msg) => {
              msg.on('body', async (stream) => {
                const parsed = await simpleParser(stream);
                
                if (parsed.attachments) {
                  for (const attachment of parsed.attachments) {
                    if (attachment.contentType === 'application/pdf') {
                      const filename = attachment.filename || 'unnamed.pdf';
                      const filePath = path.join(process.cwd(), 'pdfs', filename);

                      // Ensure pdfs directory exists
                      await fs.mkdir(path.join(process.cwd(), 'pdfs'), { recursive: true });

                      // Save PDF file
                      await fs.writeFile(filePath, attachment.content);

                      // Save metadata
                      await storage.createPdfMetadata({
                        filename,
                        fromAddress: parsed.from?.text || '',
                        subject: parsed.subject || '',
                        dateReceived: parsed.date || new Date(),
                        filePath,
                        configId: config.id
                      });
                    }
                  }
                }
              });
            });

            fetch.once('end', () => {
              imap.end();
              resolve(true);
            });
          });
        });
      });

      imap.once('error', (err) => {
        reject(err);
      });

      imap.connect();
    });
  }
}

export const emailService = new EmailService();
