import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api';

export default function SchemasPage() {
  const [schemas, setSchemas] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ subject: '', owner: '', description: '', schema: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/schemas').then(data => setSchemas(data.items || []));
  }, []);

  const loadVersions = async (subject) => {
    const versions = await apiGet(`/schemas/${encodeURIComponent(subject)}/versions`);
    const latest   = await apiGet(`/schemas/${encodeURIComponent(subject)}`);
    setSelected({ subject, versions, latest });
  };

  const register = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const schema = JSON.parse(form.schema);
      await apiPost('/schemas', { ...form, schema });
      setShowRegister(false);
      const data = await apiGet('/schemas');
      setSchemas(data.items || []);
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Schema Registry</h1>
        <button className="btn-primary" onClick={() => setShowRegister(true)}>+ Register Schema</button>
      </div>

      {showRegister && (
        <div className="modal-overlay" onClick={() => setShowRegister(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Register Schema</h2>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={register}>
              <label>Subject <small>(e.g. orders.order-placed-value)</small>
                <input value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} required />
              </label>
              <label>Owner
                <input value={form.owner} onChange={e => setForm(f => ({...f, owner: e.target.value}))} required />
              </label>
              <label>Description
                <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              </label>
              <label>Avro Schema (JSON)
                <textarea rows={10} value={form.schema} onChange={e => setForm(f => ({...f, schema: e.target.value}))} required />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowRegister(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="list-panel">
          {schemas.map(s => (
            <div key={s.subject} className={`list-item ${selected?.subject === s.subject ? 'active' : ''}`}
                 onClick={() => loadVersions(s.subject)}>
              <strong>{s.subject}</strong>
              <span className="owner">{s.owner}</span>
              {s.deprecated_at && <span className="badge warn">Deprecated</span>}
            </div>
          ))}
        </div>
        <div className="detail-panel">
          {selected ? (
            <>
              <h2>{selected.subject}</h2>
              <p><strong>Versions:</strong> {selected.versions?.join(', ')}</p>
              <h3>Latest Schema</h3>
              <pre>{JSON.stringify(JSON.parse(selected.latest?.schema || '{}'), null, 2)}</pre>
            </>
          ) : (
            <p className="empty-state">Select a schema to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
