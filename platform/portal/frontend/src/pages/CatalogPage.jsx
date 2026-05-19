import { useState, useEffect } from 'react';
import { apiGet } from '../api';

export default function CatalogPage() {
  const [items, setItems]   = useState([]);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams({ page, limit: 20 });
    if (search) qs.set('search', search);
    if (domain) qs.set('domain', domain);
    setLoading(true);
    apiGet(`/catalog?${qs}`)
      .then(data => { setItems(data.items); setTotal(data.total); })
      .finally(() => setLoading(false));
  }, [search, domain, page]);

  return (
    <div>
      <h1>Event Catalog</h1>
      <div className="filters">
        <input
          placeholder="Search datasets..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <input
          placeholder="Filter by domain..."
          value={domain}
          onChange={e => { setDomain(e.target.value); setPage(1); }}
        />
      </div>

      {loading && <p className="loading">Loading...</p>}

      <div className="card-grid">
        {items.map(item => (
          <div key={item.id} className="card">
            <div className="card-header">
              <span className="badge">{item.domain}</span>
              <span className="dataset-name">{item.name}</span>
            </div>
            <p className="card-desc">{item.description || '—'}</p>
            <div className="card-meta">
              <span>Owner: {item.owner || '—'}</span>
              {item.topic_name && <span>Topic: <code>{item.topic_name}</code></span>}
            </div>
            <div className="card-tags">
              {(item.tags || []).map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span>Page {page} of {Math.ceil(total / 20) || 1}</span>
        <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
}
