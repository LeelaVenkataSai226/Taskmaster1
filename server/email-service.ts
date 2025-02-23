import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fs from 'fs/promises';
import path from 'path';
import { storage } from './storage';
import type { EmailConfig } from '@shared/schema';
import { log } from './vite';

export class EmailService {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly PDF_DIR = path.join(process.cwd(), 'pdfs');

  async startMonitoring() {
    try {
      // Ensure PDF directory exists
      await fs.mkdir(this.PDF_DIR, { recursive: true });

      // Check emails every 5 minutes
      this.checkInterval = setInterval(async () => {
        try {
          const configs = await storage.getEmailConfigs();
          for (const config of configs) {
            if (config.active) {
              await this.checkEmails(config).catch(err => {
                log(`Error checking emails for ${config.email}: ${err.message}`, 'email-service');
              });
            }
          }
        } catch (err) {
          log(`Error in email monitoring: ${err}`, 'email-service');
        }
      }, 5 * 60 * 1000);

      log('Email monitoring service started', 'email-service');
    } catch (err) {
      log(`Failed to start email service: ${err}`, 'email-service');
      throw err;
    }
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      log('Email monitoring service stopped', 'email-service');
    }
  }

  private validateConfig(config: EmailConfig): void {
    if (!config.host) {
      throw new Error('Host is required');
    }
    if (!config.port) {
      throw new Error('Port is required');
    }
    if (!config.email) {
      throw new Error('Email is required');
    }
    if (!config.password) {
      throw new Error('Password is required');
    }
  }

  private async checkEmails(config: EmailConfig) {
    // Validate config before attempting connection
    this.validateConfig(config);

    const imap = new Imap({
      user: config.email,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false } // For self-signed certificates
    });

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        try {
          if (imap.state !== 'disconnected') {
            imap.end();
          }
        } catch (err) {
          log(`Error during IMAP cleanup: ${err}`, 'email-service');
        }
      };

      imap.once('error', (err) => {
        log(`IMAP connection error for ${config.email}: ${err}`, 'email-service');
        cleanup();
        reject(err);
      });

      imap.once('end', () => {
        log(`IMAP connection ended for ${config.email}`, 'email-service');
      });

      imap.once('ready', () => {
        log(`IMAP connected successfully for ${config.email}`, 'email-service');

        imap.openBox('INBOX', false, async (err, box) => {
          if (err) {
            cleanup();
            reject(err);
            return;
          }

          try {
            // Search for unread messages
            imap.search(['UNSEEN'], async (err, results) => {
              if (err) {
                cleanup();
                reject(err);
                return;
              }

              if (!results || results.length === 0) {
                log(`No new messages found for ${config.email}`, 'email-service');
                cleanup();
                resolve(true);
                return;
              }

              log(`Found ${results.length} new messages for ${config.email}`, 'email-service');

              const fetch = imap.fetch(results, {
                bodies: '',
                markSeen: true
              });

              fetch.on('message', (msg) => {
                msg.on('body', async (stream) => {
                  try {
                    const parsed = await simpleParser(stream);

                    if (parsed.attachments && parsed.attachments.length > 0) {
                      for (const attachment of parsed.attachments) {
                        // Check if attachment is PDF by content type or filename
                        const isPdf = 
                          attachment.contentType === 'application/pdf' ||
                          (attachment.filename && attachment.filename.toLowerCase().endsWith('.pdf'));

                        if (isPdf) {
                          // Generate a unique filename if none exists
                          const filename = attachment.filename || 
                            `${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
                          const filePath = path.join(this.PDF_DIR, filename);

                          try {
                            // Save PDF file
                            await fs.writeFile(filePath, attachment.content);
                            log(`Saved PDF: ${filename}`, 'email-service');

                            // Save metadata
                            await storage.createPdfMetadata({
                              filename,
                              fromAddress: parsed.from?.text || 'Unknown',
                              subject: parsed.subject || 'No Subject',
                              dateReceived: parsed.date || new Date(),
                              filePath,
                              configId: config.id
                            });
                            log(`Saved metadata for PDF: ${filename}`, 'email-service');
                          } catch (err) {
                            log(`Error saving PDF ${filename}: ${err}`, 'email-service');
                          }
                        }
                      }
                    }
                  } catch (err) {
                    log(`Error processing email: ${err}`, 'email-service');
                  }
                });
              });

              fetch.once('error', (err) => {
                log(`Fetch error: ${err}`, 'email-service');
              });

              fetch.once('end', () => {
                cleanup();
                resolve(true);
              });
            });
          } catch (err) {
            cleanup();
            reject(err);
          }
        });
      });

      try {
        imap.connect();
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }
}

export const emailService = new EmailService();