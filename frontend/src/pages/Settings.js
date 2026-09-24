import React, { useEffect, useState } from 'react';
import api from '../api';
import './Settings.css';

export default function Settings() {
  const [notifyEmail, setNotifyEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get('/settings').then((res) => {
      setNotifyEmail(res.data.notifyEmail || '');
      setLoading(false);
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    await api.patch('/settings', { notifyEmail });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTestEmail() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/test-email');
      setTestResult(res.data.sent
        ? 'Test email sent -- check your inbox (and spam folder).'
        : `Not sent: ${res.data.reason || 'unknown reason'}. Check the backend terminal for details.`);
    } catch (err) {
      setTestResult(err.response?.data?.error || 'Test failed -- check the backend terminal.');
    }
    setTesting(false);
  }

  if (loading) return <div className="settings-page"><p>Loading...</p></div>;

  return (
    <div className="settings-page">
      <h2>Settings</h2>
      <form className="settings-card" onSubmit={handleSave}>
        <label>Notification email</label>
        <input
          type="email"
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <p className="form-hint">Alerts will be emailed here, if the backend's SMTP settings are configured.</p>
        <button type="submit" className="btn btn-primary">Save</button>
        {saved && <p className="save-confirm">Saved.</p>}
      </form>

      <div className="settings-card" style={{ marginTop: 16 }}>
        <p className="form-hint" style={{ marginTop: 0 }}>
          Send a test email right now to confirm your SMTP setup works, separate from any alert rule.
        </p>
        <button type="button" className="btn btn-secondary" onClick={handleTestEmail} disabled={testing || !notifyEmail}>
          {testing ? 'Sending...' : 'Send test email'}
        </button>
        {testResult && <p className="form-hint" style={{ marginTop: 10 }}>{testResult}</p>}
      </div>
    </div>
  );
}
