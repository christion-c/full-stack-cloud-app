# Backend (Node.js) Setup

### 1. Initializing the Backend Project

#### Creating the Node.js Project

##### Navigate to backend directory

```bash
cd ../backend
```

##### Initialize Node.js project (creates package.json)

```bash
npm init -y
```

![Final-Project](../../_assets/4-initialize-1.PNG)

##### Install production dependencies

```bash
npm install express cors pg dotenv
```

![Final-Project](../../_assets/4-initialize-2.PNG)

##### Install development dependencies (TypeScript support)

```bash
npm install --save-dev typescript @types/express @types/cors @types/node @types/pg nodemon
```

![Final-Project](../../_assets/4-initialize-3.PNG)

#### Key Dependencies:

| Package    | Purpose                                |
| ---------- | -------------------------------------- |
| express    | Web framework                          |
| cors       | Cross-Origin Resource Sharing          |
| pg         | PostgreSQL client                      |
| dotenv     | Environment variables                  |
| typescript | TypeScript compiler                    |
| nodemon    | Auto-restart server during development |

---

### 2. Configuring TypeScript

#### Initialize TypeScript:

```bash
npx tsc --init
```

![Final-Project](../../_assets/4-initialize-4.PNG)

This generates `tsconfig.json` with default settings.

#### Recommended `tsconfig.json` Adjustments:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

![Final-Project](../../_assets/4-Configuring-TypeScript.PNG)

---

### 3. Creating the Backend Application

#### Main Application File (`src/index.ts`)

Location: `backend/src/index.ts`

```typescript
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

// Initialize Express application
const app = express();

// Middleware setup
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Database connection configuration
const pool = new Pool({
  user: process.env.DB_USER,       // Database username
  host: process.env.DB_HOST,       // Database host (RDS endpoint)
  database: process.env.DB_NAME,    // Database name
  password: process.env.DB_PASSWORD,// Database password
  port: parseInt(process.env.DB_PORT || '5432'), // Database port
});

// Simple test endpoint
app.get('/api/message', (req, res) => {
  // Returns a simple JSON response
  res.json({ text: 'Hello from the backend!' });
});

// Database interaction endpoint
app.get('/api/data', async (req, res) => {
  try {
    // Query the database
    const result = await pool.query('SELECT * FROM sample_data');

    // Return query results
    res.json(result.rows);
  } catch (err) {
    // Error handling
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Server configuration
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
```

![Final-Project](../../_assets/4-create-index-ts.PNG)

---

### 4. Database Initialization

#### SQL Script (`src/db-init.sql`)

Location: `backend/src/db-init.sql`

![Final-Project](../../_assets/4-create-sql-db.PNG)

---

### 5. Environment Configuration

#### Create `.env` File

```bash
touch .env
```

#### Sample `.env` Content:

```env
DB_USER=admin
DB_HOST=localhost
DB_NAME=mydatabase
DB_PASSWORD=securepassword
DB_PORT=5432
PORT=3001
```

#### Security Note:

- Add `.env` to `.gitignore`
- Never commit sensitive data to version control

---

### 6. Development Setup

#### `package.json` Scripts

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "nodemon src/index.ts",
  "watch": "tsc -w"
}
```

#### Nodemon Configuration (`nodemon.json`)

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node src/index.ts"
}
```

---

### 7. Running the Backend

#### Development Mode

```bash
npm run dev
```

- Auto-restarts server on file changes
- Uses `ts-node` for direct TypeScript execution

#### Testing Endpoints

1. **Health Check:**
   
   `http://localhost:3001/api/health`
   
   Expected Response:
   
   ```json
   {"status":"OK"}
   ```

![Final-Project](../_assets/8-backend-api-testing.PNG)

1. **Test Message:**
   
   `http://localhost:3001/api/message`
   
   Expected Response:
   
   ```json
   {"message":"Hello from backend!"}
   ```

![Final-Project](../../_assets/8-backend-api-testing-2.PNG)