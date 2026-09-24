import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './AddSource.css';

export default function AddSource() {
  const [name, setName] = useState('');
  const [type, setType] = useState('agent');
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/sources', { name, type });
      setCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create source');
    }
  }

  if (created) {
    return (
      <div className="add-source-page">
        <div className="add-source-card">
          <h2>Source created</h2>
          <p>Copy this key into the agent's or producer's <code>.env</code> file as <code>SOURCE_KEY</code>:</p>
          <div className="source-key-box">{created.sourceKey}</div>
          <p className="hint">
            Run <code>npm install</code> then <code>npm start</code> inside the <code>agent</code> (or{' '}
            <code>demo-producer</code>) folder. The dashboard's status dot will turn green once
            the first event arrives.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Go to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="add-source-page">
      <form className="add-source-card" onSubmit={handleSubmit}>
        <h2>Add a source</h2>
        {error && <p className="auth-error">{error}</p>}
        <label>Source name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My laptop, Demo store" required />
        <label>Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="agent">Agent (system metrics)</option>
          <option value="webhook">Webhook (custom events)</option>
        </select>
        <button type="submit" className="btn btn-primary">Create source</button>
      </form>
    </div>
  );
}
