import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

app.get('/api/message', (_req, res) => res.json({ text: 'Hello from the backend!' }));

app.get('/api/data', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM sample_data');
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'OK' }));

const PORT = process.env.PORT || '3001';
app.listen(PORT, () => console.log(`Backend on ${PORT}`));
