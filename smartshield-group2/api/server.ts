/**
 * @file server.ts
 * SmartShield Group 2 API & Web Server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { group2Router } from './routes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API router
app.use('/api', group2Router);

// Serve built frontend assets
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  SMARTSHIELD GROUP 2 VALIDATION SERVER RUNNING       `);
  console.log(`======================================================`);
  console.log(`  Dashboard:   http://localhost:${PORT}`);
  console.log(`  Health API:  http://localhost:${PORT}/api/health`);
  console.log(`  Validate:    POST http://localhost:${PORT}/api/validate`);
  console.log(`  Simulate:    POST http://localhost:${PORT}/api/simulate`);
  console.log(`  Explain:     POST http://localhost:${PORT}/api/explain`);
  console.log(`  Report:      POST http://localhost:${PORT}/api/report`);
  console.log(`======================================================\n`);
});
