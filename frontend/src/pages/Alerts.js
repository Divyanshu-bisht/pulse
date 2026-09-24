import React, { useEffect, useState } from 'react';
import api from '../api';
import { getSocket } from '../socket';
import './Alerts.css';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    loadAlerts();
    const socket = getSocket();
    if (!socket) return;
    function handleNewAlert(alert) {
      setAlerts((prev) => [alert, ...prev]);
    }
    socket.on('new_alert', handleNewAlert);
    return () => socket.off('new_alert', handleNewAlert);
  }, []);

  async function loadAlerts() {
    const res = await api.get('/alerts');
    setAlerts(res.data);
  }

  // Group by rule + session -- every crossing within the same session adds to
  // that group's counter; acknowledging (on the backend) advances the rule to
  // a new session, so the next trigger naturally starts a brand new group
  // with its own counter instead of continuing the old one.
  const grouped = Object.values(
    alerts.reduce((acc, a) => {
      const key = `${a.ruleId}-${a.sessionId ?? 0}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          ruleId: a.ruleId,
          message: a.message,
          latestTriggeredAt: a.triggeredAt,
          acknowledged: a.acknowledged,
          acknowledgedAt: a.acknowledgedAt,
          occurrences: [],
        };
      }
      acc[key].occurrences.push(a);
      if (new Date(a.triggeredAt) > new Date(acc[key].latestTriggeredAt)) {
        acc[key].latestTriggeredAt = a.triggeredAt;
        acc[key].message = a.message;
      }
      if (a.acknowledgedAt) acc[key].acknowledgedAt = a.acknowledgedAt;
      acc[key].acknowledged = acc[key].occurrences.every((o) => o.acknowledged);
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.latestTriggeredAt) - new Date(a.latestTriggeredAt));

  async function acknowledgeGroup(ruleId) {
    await api.patch(`/alerts/rule/${ruleId}/acknowledge`);
    loadAlerts();
  }

  async function resetGroup(ruleId) {
    if (!window.confirm('Clear this alert\'s history? If the condition is still true, a new alert can fire again right away.')) {
      return;
    }
    await api.delete(`/alerts/rule/${ruleId}`);
    setExpandedKey(null);
    loadAlerts();
  }

  return (
    <div className="alerts-page">
      <h2>Alert history</h2>
      {grouped.length === 0 && <p className="empty-state">No alerts yet -- that's a good thing.</p>}
      <div className="alerts-list">
        {grouped.map((g) => (
          <div className={g.acknowledged ? 'alert-card ack' : 'alert-card'} key={g.key}>
            <div className="alert-card-main" onClick={() => setExpandedKey(expandedKey === g.key ? null : g.key)}>
              <div className="alert-card-top">
                <p className="alert-message">{g.message}</p>
                <span className="alert-count-badge">{g.occurrences.length}×</span>
              </div>
              <p className="alert-time">Last: {new Date(g.latestTriggeredAt).toLocaleString()}</p>
            </div>

            {expandedKey === g.key && (
              <ul className="alert-occurrence-list">
                {[...g.occurrences]
                  .sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt))
                  .map((o) => (
                    <li key={o._id}>{new Date(o.triggeredAt).toLocaleString()}</li>
                  ))}
              </ul>
            )}

            <div className="alert-actions">
              {!g.acknowledged && (
                <button className="btn btn-sm" onClick={() => acknowledgeGroup(g.ruleId)}>Acknowledge</button>
              )}
              <button className="reset-btn" onClick={() => resetGroup(g.ruleId)}>Reset</button>
            </div>

            {g.acknowledged && g.acknowledgedAt && (
              <p className="ack-footer">
                Acknowledged -- {new Date(g.acknowledgedAt).toLocaleString()}
                <br />
                <span className="paused-note">Paused -- reset this card to resume alerting on this rule.</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
