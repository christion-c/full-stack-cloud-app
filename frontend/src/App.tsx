import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [data, setData] = useState<any[]>([]);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetch(`${apiUrl}/message`).then(r => r.json()).then(d => setMessage(d.text));
    fetch(`${apiUrl}/data`).then(r => r.json()).then(d => setData(d));
  }, [apiUrl]);

  return (
    <div className="App">
      <h1>Cloud Infrastructure Project</h1>
      <p>Message from backend: {message}</p>
      <h2>Data from Database:</h2>
      <ul>{data.map((item, i) => <li key={i}>{JSON.stringify(item)}</li>)}</ul>
    </div>
  );
}
export default App;
