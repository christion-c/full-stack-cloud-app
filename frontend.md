# Frontend (React) Setup

### 1. Initializing the React Application

#### Creating the React App

**Command:**

```bash
npx create-react-app frontend --template typescript
cd frontend
```

![Final-Project](../../_assets/3-initializing-react.PNG)

#### What Happens?

- `npx` downloads and runs `create-react-app` without global installation.
- Creates a `frontend/` directory with:
  - TypeScript preconfigured (`tsconfig.json`).
  - Starter files (`.tsx` instead of `.js`).
  - All required dependencies installed.

#### Key Generated Files:

| File            | Purpose                  |
| --------------- | ------------------------ |
| `tsconfig.json` | TypeScript configuration |
| `src/App.tsx`   | Main React component     |
| `src/index.tsx` | Entry point              |
| `package.json`  | Dependencies and scripts |

#### Verification:

```bash
npm start
```

- Starts dev server at `http://localhost:3000`.

![Final-Project](../../_assets/3-verifying-react-locally-2.PNG)

- Displays default React welcome page.

![Final-Project](../../_assets/3-verifying-react-locally.PNG)

- Stop server: Press `Ctrl+C` in the terminal.

---

### 2. Building the Frontend Application

#### Modifying `App.tsx`

**Location:** `frontend/src/App.tsx`

![Final-Project](../../_assets/3-edit-app-tsx.PNG)

```typescript
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // State for storing the message from backend
  const [message, setMessage] = useState('');

  // State for storing data from database
  const [data, setData] = useState<any[]>([]);

  // Get API URL from environment variables or use localhost as fallback
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Effect hook to fetch data when component mounts
  useEffect(() => {
    // Fetch simple message from backend
    fetch(`${apiUrl}/message`)
      .then(res => res.json())
      .then(data => setMessage(data.text))
      .catch(err => console.error('Error fetching message:', err));

    // Fetch data from backend (which comes from database)
    fetch(`${apiUrl}/data`)
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => console.error('Error fetching data:', err));
  }, [apiUrl]); // Dependency array ensures effect runs when apiUrl changes

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cloud Infrastructure Project</h1>

        {/* Display message from backend */}
        <p>Message from backend: {message}</p>

        <h2>Data from Database:</h2>
        <ul>
          {/* Map through data array and display each item */}
          {data.map((item, index) => (
            <li key={index}>{JSON.stringify(item)}</li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;

**Key Features:**
- **State Management**: `useState` for dynamic data.
- **API Calls**: `fetch` to connect to the backend.
- **TypeScript**: Define interfaces for type safety (replace `any[]` later).
- **Error Handling**: Basic `try/catch` for API errors.
```

---

### 3. Configuring Environment Variables

#### Creating `.env`

**Location:** `frontend/.env`

![Final-Project](../../_assets/3-create-env.PNG)

**Purpose:**

- Store environment-specific settings (e.g., API URLs).
- Keep secrets out of source control.

#### Content:

```env
REACT_APP_API_URL=http://your-ec2-public-ip:3001
```

---

### 4. Testing the Frontend Locally

#### Steps:

1. Start the dev server:
   
   ```bash
   cd frontend
   npm start
   ```

2. Verify:
   
   - App opens at `http://localhost:3000`.
   - No errors in the browser console.

![Final-Project](../../_assets/3-verifying-react-locally.PNG)

---