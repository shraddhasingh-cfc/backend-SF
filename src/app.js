import 'dotenv/config'
import express from 'express';
import path from 'path';
import cors from "cors";
import { fileURLToPath } from 'url';
import apiRoutes from './routes/route.api.js';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true, // 🔥 reflect request origin
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- MIDDLEWARE ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// ---------- API ROUTES ----------
app.use('/api', apiRoutes)
// app.post('/api/create-pdf', async (req, res) => {
//   // Example PDF logic
//   res.json({ success: true, message: 'PDF created' });
// });

// app.post('/api/save-data', async (req, res) => {
//   // Example MySQL save
//   res.json({ success: true, message: 'Data saved' });
// });

// ---------- SERVE REACT BUILD ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- SPA FALLBACK ----------
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- START ----------
app.listen(PORT, "0.0.0.0", () => {
  const networkInterfaces = os.networkInterfaces();
  let hostAddress;
  for (const name in networkInterfaces) {
    const interfaces = networkInterfaces[name];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        hostAddress = iface.address;
        break;
      }
    }
    if (hostAddress) break;
  }
  if (hostAddress) {
    console.log(`
        Server started at:\n
        server:       http://localhost:${PORT}
        server:       http://${hostAddress}:${PORT}
      `);
  } else {
    console.log(`
        Server started on port ${PORT}, but could not determine host IP address.
        server:       http://localhost:${PORT}
      `);
  }
});
