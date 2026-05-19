import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut } from '../api';

export default function AccessPage() {
  const [requests, setRequests]     = useState([]);
  const [pending, setPending]       = useState([]);
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({
    resource: '', resourceType: 'topic', accessLevel: 'read',
    justification: '', duration: '30d'
  });
  const [error, setError] = useState('');

  const reload = () => {
    apiGet('/access/requests').then(setRequests);
    apiGet('/access/requests/pending').then(setPending).catch(() => setPending([]));
  };

  useEffect(reload, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiPost('/access/requests', form);
      setShowRequest(false);
      reload();
    } catch (err) {
      setError(err.message || 'Request failed');
    }
  };

  const approve = (id) => apiPut(`/access/requests/${id}/approve`).then(reload);
  const deny    = (id) => apiPut(`/access/requests/${id}/deny`, { reason: 'Denied via portal' }).then(reload);

  const statusBadge = (status) => ({
    pending:  <span className="badge warn">pending</span>,
    approved: <span className="badge ok">approved</span>,
    denied:   <span className="badge err">denied</span>,
  }[status] || status);

  return (
    <div>
      <div className="page-header">
        <h1>Access Management</h1>
        <button className="btn-primary" onClick={() => setShowRequest(true)}>+ Request Access</button>
      </div>

      {showRequest && (
        <div className="modal-overlay" onClick={() => setShowRequest(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Request Access</h2>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={submit}>
              <label>Resource (topic/schema name) <input value={form.resource} onChange={e=>setForm(f=>({...f,resource:e.target.value}))} required /></label>
              <label>Type
                <select value={form.resourceType} onChange={e=>setForm(f=>({...f,resourceType:e.target.value}))}>
                  <option>topic</option><option>schema</option><option>dataset</option>
                </select>
              </label>
              <label>Access Level
                <select value={form.accessLevel} onChange={e=>setForm(f=>({...f,accessLevel:e.target.value}))}>
                  <option>read</option><option>write</option>
                </select>
              </label>
              <label>Duration
                <select value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))}>
                  <option>7d</option><option>30d</option><option>90d</option><option>permanent</option>
                </select>
              </label>
              <label>Justification (≥20 chars)
                <textarea rows={3} value={form.justification} onChange={e=>setForm(f=>({...f,justification:e.target.value}))} required />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowRequest(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h2>Pending My Approval</h2>
          <table className="data-table">
            <thead><tr><th>Resource</th><th>Requester</th><th>Level</th><th>Justification</th><th>Actions</th></tr></thead>
            <tbody>
              {pending.map(r => (
                <tr key={r.id}>
                  <td><code>{r.resource}</code></td>
                  <td>{r.requested_by}</td>
                  <td>{r.access_level}</td>
                  <td>{r.justification}</td>
                  <td>
                    <button className="btn-sm btn-ok" onClick={() => approve(r.id)}>Approve</button>
                    <button className="btn-sm btn-err" onClick={() => deny(r.id)}>Deny</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h2>My Requests</h2>
        <table className="data-table">
          <thead><tr><th>Resource</th><th>Type</th><th>Level</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id}>
                <td><code>{r.resource}</code></td>
                <td>{r.resource_type}</td>
                <td>{r.access_level}</td>
                <td>{statusBadge(r.status)}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
