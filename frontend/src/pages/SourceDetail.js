import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import api from '../api';
import Modal from '../components/Modal';
import { getSocket } from '../socket';
import './SourceDetail.css';

export default function SourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [source, setSource] = useState(null);
  const [events, setEvents] = useState([]);
  const [range, setRange] = useState('24h');
  const [rotatedKey, setRotatedKey] = useState(null);
  const [keyCopied, setKeyCopied] = useState(false);

  const loadHistory = useCallback(async () => {
    const res = await api.get(`/events/${id}`, { params: { range } });
    setEvents(res.data);
  }, [id, range]);

  useEffect(() => {
    api.get(`/sources/${id}`).then((res) => setSource(res.data));
  }, [id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    function handleNewEvent(event) {
      if (event.sourceId === id) {
        setEvents((prev) => [...prev, event]);
      }
    }
    socket.on('new_event', handleNewEvent);
    return () => socket.off('new_event', handleNewEvent);
  }, [id]);

  async function handleClearHistory() {
    if (!window.confirm('Delete all stored events for this source? Graphs and the raw log will reset. This cannot be undone.')) {
      return;
    }
    await api.delete(`/events/${id}`);
    setEvents([]);
  }

  async function handleDeleteSource() {
    if (!window.confirm(`Delete "${source.name}" entirely, including its events, rules, and alerts? This cannot be undone.`)) {
      return;
    }
    await api.delete(`/sources/${id}`);
    navigate('/dashboard');
  }

  async function handleRotateKey() {
    if (!window.confirm('Rotate this source\'s key? The old key will stop working immediately -- update your agent/producer .env with the new one.')) {
      return;
    }
    const res = await api.post(`/sources/${id}/rotate-key`);
    setSource(res.data);
    setRotatedKey(res.data.sourceKey);
  }

  async function copyRotatedKey() {
    await navigator.clipboard.writeText(rotatedKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1500);
  }

  const metricNames = [...new Set(events.filter((e) => typeof e.value === 'number').map((e) => e.name))];

  function chartDataFor(metricName) {
    return events
      .filter((e) => e.name === metricName)
      .map((e) => ({
        time: new Date(e.timestamp).toLocaleTimeString(),
        value: e.value,
      }));
  }

  return (
    <div className="source-detail">
      <div className="source-detail-header">
        <h2>{source ? source.name : 'Loading...'}</h2>
        <div className="source-detail-actions">
          <div className="range-picker">
            {['1h', '24h', '7d'].map((r) => (
              <button key={r} className={r === range ? 'range-btn active' : 'range-btn'} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
          <button className="clear-history-btn" onClick={handleClearHistory}>Clear history</button>
          <button className="rotate-key-btn" onClick={handleRotateKey}>Rotate key</button>
          <button className="delete-source-btn" onClick={handleDeleteSource}>Delete source</button>
        </div>
      </div>

      {metricNames.length === 0 && <p className="empty-state">No numeric metrics yet for this range.</p>}

      {metricNames.map((name) => (
        <div className="chart-card" key={name}>
          <h4>{name}</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartDataFor(name)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#223154" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#5C6C8A' }} stroke="#223154" />
              <YAxis tick={{ fontSize: 11, fill: '#5C6C8A' }} stroke="#223154" />
              <Tooltip contentStyle={{ background: '#17203A', border: '1px solid #223154', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#8FA0BF' }} />
              <Line type="monotone" dataKey="value" stroke="#4FD1C5" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}

      <div className="raw-log-card">
        <h4>Raw event log</h4>
        <table className="raw-log-table">
          <thead>
            <tr><th>Time</th><th>Name</th><th>Value</th></tr>
          </thead>
          <tbody>
            {[...events].reverse().slice(0, 50).map((e) => (
              <tr key={e._id}>
                <td>{new Date(e.timestamp).toLocaleString()}</td>
                <td>{e.name}</td>
                <td>{String(e.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rotatedKey && (
        <Modal title="Source key rotated" onClose={() => setRotatedKey(null)}>
          <p className="form-hint" style={{ marginBottom: 6 }}>
            The old key no longer works. Copy this new one into your agent or producer's <code>.env</code> file as <code>SOURCE_KEY</code>.
          </p>
          <div className="key-display-box">{rotatedKey}</div>
          <button className="btn btn-primary copy-btn" onClick={copyRotatedKey}>
            {keyCopied ? 'Copied!' : 'Copy key'}
          </button>
        </Modal>
      )}
    </div>
  );
}
