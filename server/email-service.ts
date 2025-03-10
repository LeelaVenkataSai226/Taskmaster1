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

  private getReadableErrorMessage(error: string): string {
    if (error.includes('Invalid credentials')) {
      return 'Invalid email or password. For Gmail accounts:\n1. Enable 2-Step Verification in Google Account Settings > Security\n2. Then go to Security > App Passwords\n3. Generate and use an App Password instead of your regular password';
    }
    if (error.includes('ETIMEDOUT')) {
      return 'Connection timed out. Please check your host and port settings.';
    }
    if (error.includes('ECONNREFUSED')) {
      return 'Connection refused. Please verify your host and port settings.';
    }
    if (error.includes('[AUTH]')) {
      return 'Authentication failed. For Gmail, please use an App Password. For other providers, check your credentials.';
    }
    return `Connection failed: ${error}`;
  }

  async testConnection(config: EmailConfig): Promise<{ success: boolean; message: string }> {
    try {
      if (!config.email?.includes('@')) {
        return { success: false, message: 'Invalid email address format' };
      }

      const imap = new Imap({
        user: config.email,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          imap.end();
          resolve({ 
            success: false, 
            message: 'Connection timed out. Please check your settings and try again.' 
          });
        }, 15000);

        imap.once('ready', () => {
          clearTimeout(timeout);
          imap.end();
          resolve({ 
            success: true, 
            message: 'Connection successful! Your email configuration is working.' 
          });
        });

        imap.once('error', (err: Error) => {
          clearTimeout(timeout);
          const errorMessage = this.getReadableErrorMessage(err.message);
          log(`Test connection failed for ${config.email}: ${errorMessage}`, 'email-service');
          imap.end();
          resolve({ success: false, message: errorMessage });
        });

        try {
          imap.connect();
        } catch (err) {
          clearTimeout(timeout);
          const error = err as Error;
          resolve({ 
            success: false, 
            message: this.getReadableErrorMessage(error.message) 
          });
        }
      });
    } catch (err) {
      const error = err as Error;
      return { 
        success: false, 
        message: this.getReadableErrorMessage(error.message) 
      };
    }
  }

  async startMonitoring() {
    try {
      await fs.mkdir(this.PDF_DIR, { recursive: true });

      this.checkInterval = setInterval(async () => {
        try {
          const configs = await storage.getEmailConfigs();
          log('Checking for new emails...', 'email-service');
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
      }, 5 * 60 * 1000); // Check every 5 minutes

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

  private async checkEmails(config: EmailConfig): Promise<boolean> {
    try {
      // Create PDF directory if it doesn't exist
      await fs.mkdir(this.PDF_DIR, { recursive: true });

      const imap = new Imap({
        user: config.email,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
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

        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Connection timed out. Please check your email settings.'));
        }, 30000);

        imap.once('error', (err) => {
          clearTimeout(timeout);
          log(`IMAP connection error for ${config.email}: ${err}`, 'email-service');
          cleanup();
          reject(new Error(this.getReadableErrorMessage(err.message)));
        });

        imap.once('end', () => {
          clearTimeout(timeout);
          log(`IMAP connection ended for ${config.email}`, 'email-service');
        });

        imap.once('ready', () => {
          clearTimeout(timeout);
          log(`IMAP connected successfully for ${config.email}`, 'email-service');

          imap.openBox('INBOX', false, async (err, box) => {
            if (err) {
              cleanup();
              reject(new Error(`Failed to open inbox: ${this.getReadableErrorMessage(err.message)}`));
              return;
            }

            try {
              imap.search(['UNSEEN'], async (err, results) => {
                if (err) {
                  cleanup();
                  reject(new Error(`Failed to search messages: ${this.getReadableErrorMessage(err.message)}`));
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
                          const isPdf = 
                            attachment.contentType === 'application/pdf' ||
                            (attachment.filename && attachment.filename.toLowerCase().endsWith('.pdf'));

                          if (isPdf) {
                            const filename = attachment.filename || 
                              `${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
                            const filePath = path.join(this.PDF_DIR, filename);

                            try {
                              await fs.writeFile(filePath, attachment.content);
                              log(`Saved PDF: ${filename}`, 'email-service');

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
              reject(new Error(`Failed to process messages: ${this.getReadableErrorMessage(err.message)}`));
            }
          });
        });

        try {
          imap.connect();
        } catch (err) {
          clearTimeout(timeout);
          cleanup();
          reject(new Error(`Failed to initiate connection: ${this.getReadableErrorMessage(err.message)}`));
        }
      });
    } catch (err) {
      throw new Error(`Failed to check emails: ${this.getReadableErrorMessage(err.message)}`);
    }
  }
}

export const emailService = new EmailService();