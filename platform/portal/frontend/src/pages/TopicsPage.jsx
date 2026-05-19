import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api';

const TIERS = ['critical', 'standard', 'bulk'];

export default function TopicsPage() {
  const [topics, setTopics]   = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    domain: '', name: '', partitions: 6, replicationFactor: 3,
    retentionMs: 604800000, tier: 'standard', description: ''
  });
  const [error, setError] = useState('');

  useEffect(() => { apiGet('/topics').then(setTopics); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiPost('/topics', form);
      setShowCreate(false);
      apiGet('/topics').then(setTopics);
    } catch (err) {
      setError(err.message || 'Topic creation failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Topics</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Create Topic</button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create Topic</h2>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={create}>
              <label>Domain <input value={form.domain} onChange={e => setForm(f=>({...f,domain:e.target.value}))} required /></label>
              <label>Event Name <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></label>
              <label>Tier
                <select value={form.tier} onChange={e => setForm(f=>({...f,tier:e.target.value}))}>
                  {TIERS.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label>Partitions <input type="number" value={form.partitions} min={1} max={200} onChange={e => setForm(f=>({...f,partitions:+e.target.value}))} /></label>
              <label>Retention (ms) <input type="number" value={form.retentionMs} onChange={e => setForm(f=>({...f,retentionMs:+e.target.value}))} /></label>
              <label>Description <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} /></label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr><th>Topic Name</th><th>Domain</th><th>Partitions</th><th>Retention</th><th>Created</th></tr>
        </thead>
        <tbody>
          {topics.map(t => (
            <tr key={t.topic_name}>
              <td><code>{t.topic_name}</code></td>
              <td>{t.domain}</td>
              <td>{t.partitions}</td>
              <td>{Math.round(t.retention_ms / 86400000)}d</td>
              <td>{new Date(t.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
