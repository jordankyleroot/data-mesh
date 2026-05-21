import { useState, useEffect } from 'react'

/* ── Icon helper ── */
function Icon({ name, className = '', size = '' }) {
  return <span className={`icon ${size ? `icon-${size}` : ''} ${className}`} aria-hidden="true">{name}</span>
}

/* ══════════════════════════════════════════════════════════════
   STAFF ACCOUNTS  (login credentials)
   ══════════════════════════════════════════════════════════════ */
const STAFF_ACCOUNTS = [
  { email: 'admin@kylecorp.com',    password: 'admin2026',  name: 'S. Mitchell',    role: 'Platform Admin' },
  { email: 'engineer@kylecorp.com', password: 'eng2026',    name: 'R. Okonkwo',     role: 'Platform Engineer' },
  { email: 'ops@kylecorp.com',      password: 'ops2026',    name: 'T. Lindqvist',   role: 'Ops & Compliance' },
]

/* ══════════════════════════════════════════════════════════════
   MOCK DATA
   ══════════════════════════════════════════════════════════════ */
const MOCK_SCHEMAS = [
  { id: 'SCH-001', subject: 'crude.barrel-received',          version: 3, format: 'AVRO', domain: 'Refinery',   compat: 'BACKWARD', status: 'active',      lastUpdated: '2026-05-19', fields: 12 },
  { id: 'SCH-002', subject: 'crude.batch-processed',          version: 2, format: 'AVRO', domain: 'Refinery',   compat: 'FULL',     status: 'active',      lastUpdated: '2026-05-14', fields: 9  },
  { id: 'SCH-003', subject: 'pipeline.flow-updated',          version: 1, format: 'AVRO', domain: 'Pipeline',   compat: 'BACKWARD', status: 'active',      lastUpdated: '2026-05-10', fields: 7  },
  { id: 'SCH-004', subject: 'pipeline.leak-alert',            version: 4, format: 'AVRO', domain: 'Pipeline',   compat: 'NONE',     status: 'breaking',    lastUpdated: '2026-05-18', fields: 14 },
  { id: 'SCH-005', subject: 'trading.deal-executed',          version: 2, format: 'AVRO', domain: 'Trading',    compat: 'FULL',     status: 'active',      lastUpdated: '2026-05-12', fields: 18 },
  { id: 'SCH-006', subject: 'trading.price-tick',             version: 1, format: 'AVRO', domain: 'Trading',    compat: 'BACKWARD', status: 'active',      lastUpdated: '2026-05-01', fields: 5  },
  { id: 'SCH-007', subject: 'logistics.shipment-dispatched',  version: 2, format: 'AVRO', domain: 'Logistics',  compat: 'BACKWARD', status: 'active',      lastUpdated: '2026-05-08', fields: 11 },
  { id: 'SCH-008', subject: 'customer.order-placed',          version: 1, format: 'AVRO', domain: 'Customer',   compat: 'FULL',     status: 'deprecated',  lastUpdated: '2026-04-22', fields: 8  },
  { id: 'SCH-009', subject: 'safety.incident-reported',       version: 3, format: 'AVRO', domain: 'Safety',     compat: 'BACKWARD', status: 'active',      lastUpdated: '2026-05-15', fields: 16 },
  { id: 'SCH-010', subject: 'finance.invoice-raised',         version: 2, format: 'AVRO', domain: 'Finance',    compat: 'FULL',     status: 'active',      lastUpdated: '2026-05-17', fields: 13 },
]

const MOCK_TOPICS = [
  { name: 'crude.barrel-received.critical',         domain: 'Refinery',  partitions: 6, retention: '7d',  msgRate: 142,  consumers: 3 },
  { name: 'crude.batch-processed.critical',         domain: 'Refinery',  partitions: 6, retention: '7d',  msgRate: 18,   consumers: 2 },
  { name: 'pipeline.flow-updated.standard',         domain: 'Pipeline',  partitions: 3, retention: '7d',  msgRate: 87,   consumers: 4 },
  { name: 'pipeline.leak-alert.critical',           domain: 'Pipeline',  partitions: 6, retention: '30d', msgRate: 2,    consumers: 6 },
  { name: 'trading.deal-executed.critical',         domain: 'Trading',   partitions: 6, retention: '30d', msgRate: 54,   consumers: 3 },
  { name: 'trading.price-tick.bulk',                domain: 'Trading',   partitions: 1, retention: '1d',  msgRate: 3800, consumers: 2 },
  { name: 'logistics.shipment-dispatched.standard', domain: 'Logistics', partitions: 3, retention: '7d',  msgRate: 31,   consumers: 2 },
  { name: 'customer.order-placed.critical',         domain: 'Customer',  partitions: 6, retention: '30d', msgRate: 28,   consumers: 5 },
  { name: 'safety.incident-reported.critical',      domain: 'Safety',    partitions: 6, retention: '90d', msgRate: 1,    consumers: 8 },
  { name: 'finance.invoice-raised.standard',        domain: 'Finance',   partitions: 3, retention: '90d', msgRate: 9,    consumers: 3 },
]

const MOCK_POLICIES = [
  { id: 'POL-001', name: 'PII Field Enforcement',         resource: 'crude.*',           effect: 'deny',  enforcement: 'Blocking', status: 'active',   lastEval: '2026-05-20 09:14' },
  { id: 'POL-002', name: 'Schema Compatibility Gate',     resource: 'All domains',       effect: 'deny',  enforcement: 'Blocking', status: 'active',   lastEval: '2026-05-20 09:14' },
  { id: 'POL-003', name: 'Consumer Authorization Check',  resource: 'finance.*',         effect: 'deny',  enforcement: 'Blocking', status: 'active',   lastEval: '2026-05-20 09:13' },
  { id: 'POL-004', name: 'Data Retention Compliance',     resource: 'safety.*',          effect: 'allow', enforcement: 'Advisory', status: 'active',   lastEval: '2026-05-20 09:10' },
  { id: 'POL-005', name: 'Cross-Domain Access Control',   resource: 'trading.*',         effect: 'deny',  enforcement: 'Blocking', status: 'active',   lastEval: '2026-05-20 09:14' },
  { id: 'POL-006', name: 'Bulk Topic Rate Limiting',      resource: '*.bulk',            effect: 'deny',  enforcement: 'Advisory', status: 'inactive', lastEval: '2026-05-19 14:20' },
]

const MOCK_CI_RUNS = [
  { id: 'RUN-2841', pipeline: 'Schema Compatibility Test — Refinery',  commit: 'a4f2c81', branch: 'main',              status: 'passed',  duration: '1m 12s', time: '09:14' },
  { id: 'RUN-2840', pipeline: 'Contract Test Suite — Trading Domain',  commit: 'b9e1d43', branch: 'feat/price-schema', status: 'passed',  duration: '2m 38s', time: '09:02' },
  { id: 'RUN-2839', pipeline: 'Schema Compatibility Test — Pipeline',  commit: 'f3a8c20', branch: 'fix/leak-schema',   status: 'failed',  duration: '0m 44s', time: '08:55' },
  { id: 'RUN-2838', pipeline: 'OPA Policy Evaluation — Finance',       commit: 'd1b7e92', branch: 'main',              status: 'passed',  duration: '0m 31s', time: '08:30' },
  { id: 'RUN-2837', pipeline: 'Contract Test Suite — Customer Domain', commit: 'e5c4f11', branch: 'main',              status: 'passed',  duration: '1m 58s', time: '07:45' },
  { id: 'RUN-2836', pipeline: 'Schema Compatibility Test — Safety',    commit: 'c8d3a45', branch: 'hotfix/v3-fields',  status: 'passed',  duration: '1m 05s', time: '07:10' },
]

const MOCK_CONSUMERS = [
  { group: 'logistics-consumer-v2',    topic: 'crude.barrel-received.critical',         lag: 0,    status: 'healthy' },
  { group: 'safety-monitor',           topic: 'pipeline.leak-alert.critical',           lag: 2,    status: 'healthy' },
  { group: 'finance-invoice-writer',   topic: 'trading.deal-executed.critical',         lag: 1847, status: 'lagging' },
  { group: 'analytics-clickhouse',     topic: 'trading.price-tick.bulk',                lag: 412,  status: 'lagging' },
  { group: 'customer-notifier',        topic: 'customer.order-placed.critical',         lag: 0,    status: 'healthy' },
  { group: 'compliance-recorder',      topic: 'safety.incident-reported.critical',      lag: 0,    status: 'healthy' },
  { group: 'erp-integration',          topic: 'finance.invoice-raised.standard',        lag: 88,   status: 'warning' },
]

const SCHEMA_AVRO_TEMPLATE = `{
  "type": "record",
  "name": "CrudeBarrelReceived",
  "namespace": "com.kylecorp.crude",
  "fields": [
    { "name": "barrel_id",   "type": "string" },
    { "name": "timestamp",   "type": "long" },
    { "name": "volume_bbl",  "type": "double" },
    { "name": "grade",       "type": "string" },
    { "name": "origin",      "type": "string" }
  ]
}`

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function StatusBadge({ status }) {
  const map = {
    active:     'badge-green',
    inactive:   'badge-gray',
    deprecated: 'badge-amber',
    breaking:   'badge-red',
    passed:     'badge-green',
    failed:     'badge-red',
    running:    'badge-blue',
    healthy:    'badge-green',
    lagging:    'badge-red',
    warning:    'badge-amber',
  }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

function CompatBadge({ compat }) {
  if (compat === 'FULL')     return <span className="badge badge-green">Full</span>
  if (compat === 'BACKWARD') return <span className="badge badge-blue">Backward</span>
  if (compat === 'FORWARD')  return <span className="badge badge-amber">Forward</span>
  if (compat === 'NONE')     return <span className="badge badge-red">Breaking</span>
  return <span className="badge badge-gray">{compat}</span>
}

/* Throughput mini-chart */
function TputChart({ base }) {
  const vals = Array.from({ length: 20 }, (_, i) =>
    Math.max(8, Math.min(100, base + (Math.random() - 0.5) * 40))
  )
  const max = Math.max(...vals)
  return (
    <div className="tput-chart">
      {vals.map((v, i) => (
        <div key={i} className="tput-bar" style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   LOGIN
   ══════════════════════════════════════════════════════════════ */
function AdminLogin({ onLogin }) {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')
  const [showHints, setShowHints] = useState(false)
  const [loggedInAs, setLoggedInAs] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    const account = STAFF_ACCOUNTS.find(a => a.email === email.trim().toLowerCase() && a.password === pass)
    if (!account) { setErr('Invalid email or password. Check the demo credentials below.'); return }
    setLoading(true); setErr('')
    setTimeout(() => { setLoading(false); onLogin(account) }, 700)
  }

  const quickFill = (account) => {
    setEmail(account.email)
    setPass(account.password)
    setErr('')
  }

  return (
    <div className="admin-auth">
      <div className="admin-auth-card">
        <div className="admin-auth-logo">
          <div className="admin-brand-icon"><Icon name="bolt" className="icon-fill" /></div>
          <span className="admin-auth-logo-name">Kyle Corp</span>
          <span className="admin-auth-logo-tag">Admin</span>
        </div>
        <div className="admin-auth-title">Staff Sign In</div>
        <div className="admin-auth-sub">Access restricted to authorised personnel only.</div>
        <div className="admin-auth-warn">
          <Icon name="security" size="sm" /> This system is monitored. Unauthorised access is strictly prohibited.
        </div>

        {err && (
          <div className="alert alert-red" style={{marginBottom:12}}>
            <Icon name="error" className="alert-icon" size="sm" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@kylecorp.com" autoFocus />
          </div>
          <div className="form-group" style={{marginBottom:16}}>
            <label className="form-label">Password</label>
            <input className="field" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',gap:6}} type="submit" disabled={loading}>
            {loading ? 'Authenticating…' : <><Icon name="login" size="sm" /> Sign In</>}
          </button>
        </form>

        {/* Demo credentials toggle */}
        <div style={{marginTop:20,borderTop:'1px solid var(--border)',paddingTop:16}}>
          <button className="btn btn-ghost btn-xs" style={{width:'100%',justifyContent:'center',gap:4}} onClick={()=>setShowHints(h=>!h)}>
            <Icon name={showHints ? 'expand_less' : 'expand_more'} size="sm" />
            Demo credentials
          </button>
          {showHints && (
            <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
              {STAFF_ACCOUNTS.map(a => (
                <button
                  key={a.email}
                  className="btn btn-secondary btn-xs"
                  style={{justifyContent:'flex-start',gap:8,fontFamily:'var(--mono,monospace)',fontSize:11}}
                  onClick={() => quickFill(a)}
                >
                  <Icon name="person" size="sm" style={{color:'var(--accent-bright)'}} />
                  <span style={{color:'var(--text-primary)'}}>{a.email}</span>
                  <span style={{marginLeft:'auto',color:'var(--text-secondary)'}}>{a.role}</span>
                </button>
              ))}
              <p style={{fontSize:10,color:'var(--text-muted)',marginTop:4}}>Click any row to auto-fill credentials.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   VIEWS
   ══════════════════════════════════════════════════════════════ */

/* ── Overview ───────────────────────────────────────────────── */
function OverviewView() {
  const breaking = MOCK_SCHEMAS.filter(s => s.status === 'breaking').length
  const failing  = MOCK_CI_RUNS.filter(r => r.status === 'failed').length
  const lagging  = MOCK_CONSUMERS.filter(c => c.status === 'lagging').length

  const recentEvents = [
    { color: 'var(--red)',          msg: 'Schema Compatibility Alert: pipeline.leak-alert v4 introduces breaking change',       time: '09:14' },
    { color: 'var(--accent-bright)',msg: 'CI run RUN-2841 passed: Schema Compatibility Test — Refinery (main)',                 time: '09:14' },
    { color: 'var(--red)',          msg: 'CI run RUN-2839 failed: Schema Compatibility Test — Pipeline (fix/leak-schema)',      time: '08:55' },
    { color: 'var(--amber)',        msg: 'Consumer lag alert: finance-invoice-writer has accumulated 1,847 messages',           time: '08:40' },
    { color: 'var(--blue)',         msg: 'Schema registered: crude.batch-processed v2 (AVRO, FULL compatibility)',              time: '08:20' },
    { color: 'var(--accent-bright)',msg: 'Policy evaluation passed: PII Field Enforcement for crude.barrel-received',          time: '07:58' },
  ]

  return (
    <div className="admin-content">
      <div className="view-header">
        <div>
          <div className="view-title">System Overview</div>
          <div className="view-sub">Platform health as of today, 2026-05-20.</div>
        </div>
      </div>

      {breaking > 0 && (
        <div className="alert alert-amber">
          <span className="alert-icon">⚠</span>
          <div className="alert-body">
            <div className="alert-title">Schema Compatibility Alert</div>
            <div className="alert-desc">{breaking} schema(s) with breaking compatibility detected. Review required before deployment.</div>
          </div>
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Registered Schemas</div>
          <div className="kpi-val">{MOCK_SCHEMAS.length}</div>
          <div className="kpi-sub">Across 6 domains</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Topics</div>
          <div className="kpi-val">{MOCK_TOPICS.length}</div>
          <div className="kpi-sub">10 partitioned streams</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Breaking Schemas</div>
          <div className={`kpi-val ${breaking > 0 ? 'kpi-val-red' : 'kpi-val-green'}`}>{breaking}</div>
          <div className="kpi-sub">Compatibility violations</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">CI Failures (24h)</div>
          <div className={`kpi-val ${failing > 0 ? 'kpi-val-red' : 'kpi-val-green'}`}>{failing}</div>
          <div className="kpi-sub">Contract test failures</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Consumer Lag Alerts</div>
          <div className={`kpi-val ${lagging > 0 ? 'kpi-val-amber' : 'kpi-val-green'}`}>{lagging}</div>
          <div className="kpi-sub">Groups behind threshold</div>
        </div>
      </div>

      <div className="two-col" style={{gap:16}}>
        <div className="card">
          <div className="card-head"><span className="card-title">Recent Activity</span></div>
          <div className="event-feed">
            {recentEvents.map((e, i) => (
              <div key={i} className="event-item">
                <div className="event-dot" style={{background: e.color}} />
                <div className="event-msg">{e.msg}</div>
                <div className="event-time">{e.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="card">
            <div className="card-head"><span className="card-title">Event Throughput (msg/s)</span></div>
            <div style={{padding:'12px 16px'}}>
              {MOCK_TOPICS.slice(0, 5).map(t => (
                <div key={t.name} style={{marginBottom:10}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11}}>
                    <span className="mono" style={{color:'var(--text-secondary)'}}>{t.name.replace('.', '​.')}</span>
                    <span className="mono" style={{color:'var(--text-primary)', fontWeight:600}}>{t.msgRate.toLocaleString()}</span>
                  </div>
                  <TputChart base={Math.min(90, (t.msgRate / 50) * 40)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Schema Registry ────────────────────────────────────────── */
function SchemaRegistryView({ showToast }) {
  const [schemas, setSchemas] = useState(MOCK_SCHEMAS)
  const [filter, setFilter]   = useState('')
  const [domain, setDomain]   = useState('All')
  const [selected, setSelected] = useState(null)
  const [showRegister, setShowRegister] = useState(false)

  const domains = ['All', ...Array.from(new Set(MOCK_SCHEMAS.map(s => s.domain)))]
  const filtered = schemas.filter(s =>
    (domain === 'All' || s.domain === domain) &&
    (filter === '' || s.subject.includes(filter.toLowerCase()) || s.domain.toLowerCase().includes(filter.toLowerCase()))
  )

  const handleRegister = (data) => {
    const newSchema = {
      id: `SCH-0${schemas.length + 11}`,
      subject: data.subject,
      version: 1,
      format: data.format,
      domain: data.domain,
      compat: data.compat,
      status: 'active',
      lastUpdated: new Date().toISOString().slice(0, 10),
      fields: 5,
    }
    setSchemas(prev => [newSchema, ...prev])
    setShowRegister(false)
    showToast('Schema registered successfully.')
  }

  return (
    <div className="admin-content">
      {showRegister && <RegisterSchemaModal onClose={() => setShowRegister(false)} onSubmit={handleRegister} />}
      {selected && <SchemaDetailModal schema={selected} onClose={() => setSelected(null)} />}

      <div className="view-header">
        <div>
          <div className="view-title">Schema Registry</div>
          <div className="view-sub">{schemas.length} schemas across {domains.length - 1} domains.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowRegister(true)}>+ Register Schema</button>
      </div>

      {schemas.some(s => s.status === 'breaking') && (
        <div className="alert alert-red">
          <span className="alert-icon">✕</span>
          <div className="alert-body">
            <div className="alert-title">Breaking Change Detected</div>
            <div className="alert-desc">
              <strong>pipeline.leak-alert v4</strong> introduces a non-backward-compatible change. Consumers must be updated before this schema is promoted to production.
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap'}}>
        <div className="search-bar" style={{flex:'1', minWidth:200}}>
          <span>🔍</span>
          <input placeholder="Search schemas…" value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <div style={{display:'flex', gap:4}}>
          {domains.map(d => (
            <button key={d} className={`tab-btn ${domain === d ? 'active' : ''}`} style={{fontSize:11}} onClick={() => setDomain(d)}>{d}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{padding:0}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Domain</th>
              <th>Ver.</th>
              <th>Format</th>
              <th>Compatibility</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="clickable" onClick={() => setSelected(s)}>
                <td className="mono" style={{color:'var(--blue)'}}>{s.subject}</td>
                <td><span className="badge badge-gray">{s.domain}</span></td>
                <td className="mono">v{s.version}</td>
                <td><span className="badge badge-purple">{s.format}</span></td>
                <td><CompatBadge compat={s.compat} /></td>
                <td><StatusBadge status={s.status} /></td>
                <td className="mono" style={{color:'var(--text-secondary)'}}>{s.lastUpdated}</td>
                <td><button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); setSelected(s) }}>View</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="empty-row">No schemas match the current filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SchemaDetailModal({ schema, onClose }) {
  const [tab, setTab] = useState('definition')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{width:640}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{schema.subject}</div>
            <div className="modal-sub">Version {schema.version} · {schema.domain}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="tab-bar" style={{marginBottom:12}}>
            <button className={`tab-btn ${tab === 'definition' ? 'active' : ''}`} onClick={() => setTab('definition')}>Definition</button>
            <button className={`tab-btn ${tab === 'metadata' ? 'active' : ''}`} onClick={() => setTab('metadata')}>Metadata</button>
          </div>
          {tab === 'definition' && (
            <div className="code-block">{SCHEMA_AVRO_TEMPLATE}</div>
          )}
          {tab === 'metadata' && (
            <div className="schema-detail-grid">
              <div className="schema-detail-item"><span className="schema-detail-label">Subject</span><span className="schema-detail-val mono">{schema.subject}</span></div>
              <div className="schema-detail-item"><span className="schema-detail-label">Version</span><span className="schema-detail-val mono">v{schema.version}</span></div>
              <div className="schema-detail-item"><span className="schema-detail-label">Format</span><span className="schema-detail-val">{schema.format}</span></div>
              <div className="schema-detail-item"><span className="schema-detail-label">Domain</span><span className="schema-detail-val">{schema.domain}</span></div>
              <div className="schema-detail-item"><span className="schema-detail-label">Compatibility</span><span className="schema-detail-val"><CompatBadge compat={schema.compat} /></span></div>
              <div className="schema-detail-item"><span className="schema-detail-label">Status</span><span className="schema-detail-val"><StatusBadge status={schema.status} /></span></div>
              <div className="schema-detail-item"><span className="schema-detail-label">Fields</span><span className="schema-detail-val mono">{schema.fields}</span></div>
              <div className="schema-detail-item"><span className="schema-detail-label">Last Updated</span><span className="schema-detail-val mono">{schema.lastUpdated}</span></div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-secondary">Download Schema</button>
        </div>
      </div>
    </div>
  )
}

function RegisterSchemaModal({ onClose, onSubmit }) {
  const [subject, setSubject] = useState('')
  const [domain, setDomain]   = useState('Refinery')
  const [format, setFormat]   = useState('AVRO')
  const [compat, setCompat]   = useState('BACKWARD')
  const [schema, setSchema]   = useState(SCHEMA_AVRO_TEMPLATE)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{width:640}} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="modal-title">Register Schema</div><div className="modal-sub">Submit a new schema to the registry.</div></div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input className="field" value={subject} onChange={e => setSubject(e.target.value)} placeholder="domain.event-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Domain</label>
              <select className="field" value={domain} onChange={e => setDomain(e.target.value)}>
                {['Refinery', 'Pipeline', 'Trading', 'Logistics', 'Safety', 'Finance', 'Customer'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Format</label>
              <select className="field" value={format} onChange={e => setFormat(e.target.value)}>
                <option>AVRO</option><option>JSON</option><option>PROTOBUF</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Compatibility Mode</label>
              <select className="field" value={compat} onChange={e => setCompat(e.target.value)}>
                <option value="BACKWARD">Backward</option>
                <option value="FORWARD">Forward</option>
                <option value="FULL">Full</option>
                <option value="NONE">None (Breaking)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Schema Definition</label>
            <textarea className="field mono" rows={10} value={schema} onChange={e => setSchema(e.target.value)} style={{fontSize:11}} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!subject} onClick={() => onSubmit({ subject, domain, format, compat })}>
            Register Schema
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Event Catalog ──────────────────────────────────────────── */
function EventCatalogView() {
  const [filter, setFilter] = useState('')
  const filtered = MOCK_TOPICS.filter(t =>
    filter === '' || t.name.includes(filter.toLowerCase()) || t.domain.toLowerCase().includes(filter.toLowerCase())
  )
  return (
    <div className="admin-content">
      <div className="view-header">
        <div>
          <div className="view-title">Event Catalog</div>
          <div className="view-sub">Browsable directory of all active Kafka topics and their data contracts.</div>
        </div>
      </div>
      <div className="search-bar" style={{marginBottom:16, maxWidth:400}}>
        <span>🔍</span>
        <input placeholder="Search topics or domains…" value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <div className="card" style={{padding:0}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Topic Name</th>
              <th>Domain</th>
              <th>Partitions</th>
              <th>Retention</th>
              <th>Msg Rate (msg/s)</th>
              <th>Consumers</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.name}>
                <td className="mono" style={{color:'var(--blue)'}}>{t.name}</td>
                <td><span className="badge badge-gray">{t.domain}</span></td>
                <td className="mono">{t.partitions}</td>
                <td className="mono">{t.retention}</td>
                <td className="mono">{t.msgRate.toLocaleString()}</td>
                <td className="mono">{t.consumers}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="empty-row">No topics match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Policy Engine ──────────────────────────────────────────── */
function PolicyEngineView({ showToast }) {
  const [policies, setPolicies] = useState(MOCK_POLICIES)
  const [showNew, setShowNew]   = useState(false)

  const toggle = (id) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p))
    showToast('Policy status updated.')
  }

  return (
    <div className="admin-content">
      {showNew && <NewPolicyModal onClose={() => setShowNew(false)} onSubmit={(d) => {
        setPolicies(prev => [...prev, { id: `POL-00${prev.length + 1}`, ...d, status: 'active', lastEval: 'Never' }])
        setShowNew(false)
        showToast('Policy rule created.')
      }} />}

      <div className="view-header">
        <div>
          <div className="view-title">Policy Engine</div>
          <div className="view-sub">OPA-enforced governance rules for data access and schema compliance.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Add Policy</button>
      </div>

      <div className="card" style={{padding:0}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Resource</th>
              <th>Effect</th>
              <th>Enforcement</th>
              <th>Status</th>
              <th>Last Evaluated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {policies.map(p => (
              <tr key={p.id}>
                <td>
                  <div style={{fontWeight:500}}>{p.name}</div>
                  <div className="mono" style={{color:'var(--text-secondary)',fontSize:10}}>{p.id}</div>
                </td>
                <td className="mono">{p.resource}</td>
                <td>
                  {p.effect === 'deny'
                    ? <span className="policy-effect-deny">Deny</span>
                    : <span className="policy-effect-allow">Allow</span>
                  }
                </td>
                <td>
                  <span className={`badge ${p.enforcement === 'Blocking' ? 'badge-red' : 'badge-amber'}`}>
                    {p.enforcement}
                  </span>
                </td>
                <td><StatusBadge status={p.status} /></td>
                <td className="mono" style={{color:'var(--text-secondary)'}}>{p.lastEval}</td>
                <td>
                  <button
                    className={`btn btn-xs ${p.status === 'active' ? 'btn-ghost' : 'btn-secondary'}`}
                    onClick={() => toggle(p.id)}
                  >
                    {p.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewPolicyModal({ onClose, onSubmit }) {
  const [name, setName]         = useState('')
  const [resource, setResource] = useState('')
  const [effect, setEffect]     = useState('deny')
  const [enforce, setEnforce]   = useState('Blocking')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="modal-title">Add Policy Rule</div></div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Policy Name</label>
            <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PII Field Enforcement" />
          </div>
          <div className="form-group">
            <label className="form-label">Resource Pattern</label>
            <input className="field mono" value={resource} onChange={e => setResource(e.target.value)} placeholder="e.g. crude.* or *.bulk" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Effect</label>
              <select className="field" value={effect} onChange={e => setEffect(e.target.value)}>
                <option value="deny">Deny</option>
                <option value="allow">Allow</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Enforcement</label>
              <select className="field" value={enforce} onChange={e => setEnforce(e.target.value)}>
                <option>Blocking</option>
                <option>Advisory</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name || !resource} onClick={() => onSubmit({ name, resource, effect, enforcement: enforce })}>
            Create Policy
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── CI / CD Results ────────────────────────────────────────── */
function CICDView({ showToast }) {
  const [runs, setRuns] = useState(MOCK_CI_RUNS)

  const rerun = (id) => {
    setRuns(prev => prev.map(r => r.id === id ? { ...r, status: 'running' } : r))
    setTimeout(() => {
      setRuns(prev => prev.map(r => r.id === id ? { ...r, status: 'passed' } : r))
      showToast('Re-run completed successfully.')
    }, 1800)
  }

  const passed  = runs.filter(r => r.status === 'passed').length
  const failed  = runs.filter(r => r.status === 'failed').length
  const running = runs.filter(r => r.status === 'running').length

  return (
    <div className="admin-content">
      <div className="view-header">
        <div>
          <div className="view-title">CI / CD Results</div>
          <div className="view-sub">Schema contract test and compatibility check results.</div>
        </div>
        <button className="btn btn-secondary">Trigger All Tests</button>
      </div>

      <div className="kpi-row" style={{gridTemplateColumns:'repeat(3, 1fr)', maxWidth:480}}>
        <div className="kpi-card">
          <div className="kpi-label">Passed</div>
          <div className="kpi-val kpi-val-green">{passed}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Failed</div>
          <div className={`kpi-val ${failed > 0 ? 'kpi-val-red' : 'kpi-val-green'}`}>{failed}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Running</div>
          <div className="kpi-val kpi-val-amber">{running}</div>
        </div>
      </div>

      {failed > 0 && (
        <div className="alert alert-red" style={{marginBottom:16}}>
          <span className="alert-icon">✕</span>
          <div className="alert-body">
            <div className="alert-title">Contract Test Failure</div>
            <div className="alert-desc">
              Run RUN-2839 failed on branch <span className="mono">fix/leak-schema</span>. The schema change violates backward compatibility for registered consumers.
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{padding:0}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Pipeline</th>
              <th>Branch</th>
              <th>Commit</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map(r => (
              <tr key={r.id}>
                <td className="mono" style={{color:'var(--text-secondary)'}}>{r.id}</td>
                <td style={{fontWeight:500}}>{r.pipeline}</td>
                <td className="mono" style={{color:'var(--text-secondary)'}}>{r.branch}</td>
                <td className="mono" style={{color:'var(--blue)'}}>{r.commit}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="mono" style={{color:'var(--text-secondary)'}}>{r.duration}</td>
                <td className="mono" style={{color:'var(--text-secondary)'}}>{r.time}</td>
                <td>
                  {r.status === 'failed' && (
                    <button className="btn btn-xs btn-secondary" onClick={() => rerun(r.id)}>Re-run</button>
                  )}
                  {r.status === 'running' && (
                    <span className="badge badge-blue">Running…</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Observability ──────────────────────────────────────────── */
function ObservabilityView() {
  return (
    <div className="admin-content">
      <div className="view-header">
        <div>
          <div className="view-title">Observability</div>
          <div className="view-sub">System health, consumer lag, and platform metrics.</div>
        </div>
        <div className="admin-header-status">
          <div className="status-dot status-dot-green" />
          <span>All systems operational</span>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Broker Health</div>
          <div className="kpi-val kpi-val-green">Healthy</div>
          <div className="kpi-sub">Redpanda v23.3.21</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Schema Registry</div>
          <div className="kpi-val kpi-val-green">Healthy</div>
          <div className="kpi-sub">Port 8081 · 12ms p99</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">OPA Policy Engine</div>
          <div className="kpi-val kpi-val-green">Healthy</div>
          <div className="kpi-sub">Port 8181 · 6ms p99</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">ClickHouse</div>
          <div className="kpi-val kpi-val-green">Healthy</div>
          <div className="kpi-sub">Port 8123 · 24ms p99</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Consumer Group Lag</span>
            <span className="badge badge-red">{MOCK_CONSUMERS.filter(c => c.status === 'lagging').length} lagging</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Consumer Group</th>
                <th>Topic</th>
                <th>Lag</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CONSUMERS.map(c => (
                <tr key={c.group} className={c.status === 'lagging' ? 'lag-high' : c.status === 'warning' ? 'lag-med' : ''}>
                  <td className="mono">{c.group}</td>
                  <td className="mono" style={{color:'var(--text-secondary)',fontSize:10}}>{c.topic}</td>
                  <td className="mono">{c.lag.toLocaleString()}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="card">
            <div className="card-head"><span className="card-title">Platform Services</span></div>
            <div style={{padding:'8px 0'}}>
              {[
                { name: 'Redpanda Broker',    port: '9092',  status: 'healthy', latency: '4ms'  },
                { name: 'Schema Registry',    port: '8081',  status: 'healthy', latency: '12ms' },
                { name: 'OPA Policy Engine',  port: '8181',  status: 'healthy', latency: '6ms'  },
                { name: 'ClickHouse OLAP',    port: '8123',  status: 'healthy', latency: '24ms' },
                { name: 'PostgreSQL',         port: '5432',  status: 'healthy', latency: '8ms'  },
                { name: 'Prometheus',         port: '9090',  status: 'healthy', latency: '2ms'  },
                { name: 'Grafana',            port: '3001',  status: 'healthy', latency: '18ms' },
              ].map(svc => (
                <div key={svc.name} style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'7px 16px', borderBottom:'1px solid var(--border-muted)', fontSize:12
                }}>
                  <div className={`status-dot status-dot-green`} />
                  <span style={{flex:1, fontWeight:500}}>{svc.name}</span>
                  <span className="mono" style={{color:'var(--text-secondary)'}}>{svc.port}</span>
                  <span className="mono" style={{color:'var(--accent-bright)'}}>{svc.latency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ADMIN SHELL
   ════════════════════════════════════════════════════════════ */
const NAV = [
  { section: 'Platform', items: [
    { key: 'overview',     label: 'Overview',        icon: 'dashboard' },
  ]},
  { section: 'Data Mesh', items: [
    { key: 'schemas',      label: 'Schema Registry',  icon: 'schema',   alert: MOCK_SCHEMAS.filter(s => s.status === 'breaking').length },
    { key: 'catalog',      label: 'Event Catalog',    icon: 'table_chart' },
    { key: 'policies',     label: 'Policy Engine',    icon: 'policy' },
  ]},
  { section: 'Engineering', items: [
    { key: 'cicd',         label: 'CI / CD Results',  icon: 'rocket_launch', alertBlue: MOCK_CI_RUNS.filter(r => r.status === 'failed').length },
    { key: 'observability',label: 'Observability',    icon: 'monitoring' },
  ]},
]

function AdminShell({ onLogout, user }) {
  const [page, setPage]   = useState('overview')
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const pageTitle = NAV.flatMap(g => g.items).find(i => i.key === page)?.label || ''

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon"><Icon name="bolt" className="icon-fill" /></div>
          <span className="admin-brand-name">Kyle Corp</span>
          <span className="admin-brand-badge">Admin</span>
        </div>

        <nav className="admin-nav">
          {NAV.map(group => (
            <div key={group.section}>
              <div className="admin-nav-section">{group.section}</div>
              {group.items.map(item => (
                <button
                  key={item.key}
                  className={`admin-nav-item ${page === item.key ? 'active' : ''}`}
                  onClick={() => setPage(item.key)}
                >
                  <Icon name={item.icon} className={`admin-nav-icon ${page === item.key ? 'icon-fill' : ''}`} />
                  <span>{item.label}</span>
                  {item.alert > 0 && <span className="admin-nav-badge">{item.alert}</span>}
                  {item.alertBlue > 0 && <span className="admin-nav-badge-blue">{item.alertBlue}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <div className="admin-user-row">
            <div className="admin-user-avatar">{(user?.name || 'S').charAt(0)}</div>
            <div>
              <div className="admin-user-name">{user?.name || 'S. Mitchell'}</div>
              <div className="admin-user-role">{user?.role || 'Platform Engineer'}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" style={{width:'100%', justifyContent:'center', gap:4}} onClick={onLogout}>
            <Icon name="logout" size="sm" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-body">
        <header className="admin-header">
          <div className="admin-header-title">{pageTitle}</div>
          <div className="admin-header-status">
            <div className="status-dot status-dot-green" />
            <span>Platform operational</span>
          </div>
          <div style={{display:'flex', gap:8, marginLeft:12}}>
            <span className="badge badge-gray mono">redpanda:29092</span>
            <span className="badge badge-green"><Icon name="check_circle" size="sm" className="icon-fill" /> Schema Registry</span>
            <span className="badge badge-green"><Icon name="check_circle" size="sm" className="icon-fill" /> OPA</span>
          </div>
        </header>
        <main className="admin-main">
          {page === 'overview'      && <OverviewView />}
          {page === 'schemas'       && <SchemaRegistryView showToast={showToast} />}
          {page === 'catalog'       && <EventCatalogView />}
          {page === 'policies'      && <PolicyEngineView showToast={showToast} />}
          {page === 'cicd'          && <CICDView showToast={showToast} />}
          {page === 'observability' && <ObservabilityView />}
        </main>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   ROOT APP
   ════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState('login')
  const [user, setUser]     = useState(null)
  return (
    <>
      {screen === 'login' && <AdminLogin onLogin={(account) => { setUser(account); setScreen('app') }} />}
      {screen === 'app'   && <AdminShell onLogout={() => { setUser(null); setScreen('login') }} user={user} />}
    </>
  )
}
