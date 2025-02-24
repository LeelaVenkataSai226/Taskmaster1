
# Email PDF Ingestion Application

A web application that monitors email accounts and automatically saves PDF attachments. Built with Express.js, React, and TypeScript.

## Features

- Monitor multiple email accounts simultaneously
- Automatically download and store PDF attachments
- Support for Gmail (using App Passwords) and other IMAP email providers
- Real-time email monitoring
- Web interface for configuration management
- Secure credential storage

## Tech Stack

- Backend: Express.js, Node.js
- Frontend: React, TypeScript, Tailwind CSS
- Database: PostgreSQL with Drizzle ORM
- Email: IMAP, Mailparser
- UI Components: Radix UI, Shadcn/ui

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Configure your email accounts through the web interface
4. For Gmail accounts:
   - Enable 2-Step Verification in Google Account Settings
   - Generate an App Password for use with the application

## Configuration

The application runs on port 5000 by default. Email accounts can be configured through the web interface with the following settings:

- Email address
- Password (App Password for Gmail)
- IMAP host
- IMAP port
- Active status (enable/disable monitoring)

## Development

Start the development server:

```bash
npm run dev
```

## Building for Production

Build the application:

```bash
npm run build
```

Run in production:

```bash
npm run start
```

## License

MIT
