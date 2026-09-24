import React, { useEffect, useState } from 'react';
import api from '../api';
import './Rules.css';

const EMPTY_FORM = {
  sourceId: '', name: '', metricName: '', condition: 'gt', threshold: '', windowMinutes: 10, webhookUrl: '',
};

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [sources, setSources] = useState([]);
  const [metricOptions, setMetricOptions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null = creating, otherwise editing this rule's id
  const [error, setError] = useState('');

  useEffect(() => {
    loadRules();
    api.get('/sources').then((res) => setSources(res.data));
  }, []);

  // Whenever the chosen source changes, fetch the real metric names that
  // source has actually sent -- so people pick from a dropdown of things
  // that genuinely exist, instead of typing a name from memory/code.
  useEffect(() => {
    if (!form.sourceId) {
      setMetricOptions([]);
      return;
    }
    api.get(`/events/${form.sourceId}/metric-names`).then((res) => setMetricOptions(res.data));
  }, [form.sourceId]);

  async function loadRules() {
    const res = await api.get('/rules');
    setRules(res.data);
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMetricOptions([]);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      threshold: Number(form.threshold),
      windowMinutes: Number(form.windowMinutes),
    };
    try {
      if (editingId) {
        await api.patch(`/rules/${editingId}`, payload);
      } else {
        await api.post('/rules', payload);
      }
      resetForm();
      loadRules();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save rule');
    }
  }

  function startEdit(rule) {
    setEditingId(rule._id);
    setForm({
      sourceId: rule.sourceId,
      name: rule.name,
      metricName: rule.metricName,
      condition: rule.condition,
      threshold: String(rule.threshold),
      windowMinutes: rule.windowMinutes || 10,
      webhookUrl: rule.webhookUrl || '',
    });
  }

  async function toggleActive(rule) {
    await api.patch(`/rules/${rule._id}`, { active: !rule.active });
    loadRules();
  }

  async function deleteRule(id) {
    await api.delete(`/rules/${id}`);
    if (editingId === id) resetForm();
    loadRules();
  }

  function sourceName(id) {
    const s = sources.find((s) => s._id === id);
    return s ? s.name : 'Unknown source';
  }

  return (
    <div className="rules-page">
      <h2>Alert rules</h2>

      <form className="rule-form" onSubmit={handleSubmit}>
        {error && <p className="auth-error">{error}</p>}
        <div className="rule-form-row">
          <select
            value={form.sourceId}
            onChange={(e) => setForm({ ...form, sourceId: e.target.value, metricName: '' })}
            required
          >
            <option value="">Select source...</option>
            {sources.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input
            placeholder="Rule name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            value={form.metricName}
            onChange={(e) => setForm({ ...form, metricName: e.target.value })}
            required
            disabled={!form.sourceId}
          >
            <option value="">
              {form.sourceId ? 'Select metric...' : 'Pick a source first'}
            </option>
            {metricOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="rule-form-row">
          <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
            <option value="gt">Value greater than</option>
            <option value="lt">Value less than</option>
            <option value="count_gt">Count over time greater than</option>
          </select>
          <input
            type="number"
            placeholder="Threshold"
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: e.target.value })}
            required
          />
          {form.condition === 'count_gt' && (
            <input
              type="number"
              placeholder="Window (minutes)"
              value={form.windowMinutes}
              onChange={(e) => setForm({ ...form, windowMinutes: e.target.value })}
            />
          )}
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Save changes' : 'Add rule'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
        <div className="rule-form-row">
          <input
            placeholder="Webhook URL (optional) -- e.g. https://webhook.site/your-id"
            value={form.webhookUrl}
            onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
            style={{ flex: 2 }}
          />
        </div>
        {!form.sourceId && (
          <p className="form-hint">Metric names are pulled live from what that source has actually sent -- pick a source to see them.</p>
        )}
        {form.sourceId && metricOptions.length === 0 && (
          <p className="form-hint">No metrics seen yet from this source -- connect it and let it send at least one event first.</p>
        )}
      </form>

      <div className="rules-list">
        {rules.length === 0 && <p className="empty-state">No rules yet.</p>}
        {rules.map((r) => (
          <div className={editingId === r._id ? 'rule-card editing' : 'rule-card'} key={r._id}>
            <div>
              <strong>{r.name}</strong>
              <p className="rule-desc">
                {sourceName(r.sourceId)} -- {r.metricName}{' '}
                {r.condition === 'gt' ? '>' : r.condition === 'lt' ? '<' : 'count >'} {r.threshold}
                {r.condition === 'count_gt' ? ` in ${r.windowMinutes} min` : ''}
              </p>
              {r.webhookUrl && (
                <p className="rule-desc" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  webhook: {r.webhookUrl}
                </p>
              )}
            </div>
            <div className="rule-actions">
              <button className={r.active ? 'toggle-btn active' : 'toggle-btn'} onClick={() => toggleActive(r)}>
                {r.active ? 'Active' : 'Inactive'}
              </button>
              <button className="edit-btn" onClick={() => startEdit(r)}>Edit</button>
              <button className="delete-btn" onClick={() => deleteRule(r._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
