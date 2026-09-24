import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { getSocket } from '../socket';
import './Dashboard.css';

export default function Dashboard() {
  const [sources, setSources] = useState([]);
  const [feed, setFeed] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    loadSources();
    loadAlertCount();

    const socket = getSocket();
    if (!socket) return;

    function handleNewEvent(event) {
      setFeed((prev) => [event, ...prev].slice(0, 30));
      // refresh source "last seen" status without a full reload
      setSources((prev) =>
        prev.map((s) => (s._id === event.sourceId ? { ...s, lastSeen: new Date().toISOString() } : s))
      );
    }

    function handleNewAlert() {
      setAlertCount((c) => c + 1);
    }

    socket.on('new_event', handleNewEvent);
    socket.on('new_alert', handleNewAlert);

    return () => {
      socket.off('new_event', handleNewEvent);
      socket.off('new_alert', handleNewAlert);
    };
  }, []);

  async function loadSources() {
    const res = await api.get('/sources');
    setSources(res.data);
  }

  async function loadAlertCount() {
    const res = await api.get('/alerts');
    setAlertCount(res.data.filter((a) => !a.acknowledged).length);
  }

  function isOnline(source) {
    if (!source.lastSeen) return false;
    return Date.now() - new Date(source.lastSeen).getTime() < 30000; // 30s heartbeat window
  }

  return (
    <div className="dashboard">
      <div className="dashboard-summary">
        <div className="summary-card card">
          <span className="summary-number">{sources.length}</span>
          <span className="summary-label">Sources</span>
        </div>
        <div className="summary-card card">
          <span className="summary-number">{sources.filter(isOnline).length}</span>
          <span className="summary-label">Online now</span>
        </div>
        <div className="summary-card card">
          <span className="summary-number">{alertCount}</span>
          <span className="summary-label">Unacknowledged alerts</span>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="dashboard-sources card">
          <div className="dashboard-section-header">
            <h3>Sources</h3>
            <Link to="/sources/new" className="btn btn-primary btn-sm">+ Add source</Link>
          </div>
          {sources.length === 0 && <p className="empty-state">No sources yet -- add one to start seeing live data.</p>}
          {sources.map((s) => (
            <Link to={`/sources/${s._id}`} key={s._id} className="source-card">
              <span className={`status-dot ${isOnline(s) ? 'online' : 'offline'}`}></span>
              <span className="source-name">{s.name}</span>
              <span className="source-type">{s.type}</span>
            </Link>
          ))}
        </div>

        <div className="dashboard-feed card">
          <h3>Live event feed</h3>
          {feed.length === 0 && <p className="empty-state">Waiting for events...</p>}
          <ul className="feed-list">
            {feed.map((e) => (
              <li key={e._id} className="feed-item">
                <span className="feed-name">{e.name}</span>
                <span className="feed-value">{String(e.value)}</span>
                <span className="feed-time">{new Date(e.timestamp).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
