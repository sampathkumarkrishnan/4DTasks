import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { delegationsRouter } from './routes/delegations.js';
import { getDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_ORIGIN,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Email'],
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/delegations', delegationsRouter);

// Ensure DB is initialized before listening
getDb();
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
