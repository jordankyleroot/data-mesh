import { useState, useEffect, useRef, useCallback } from 'react'

const API = 'http://localhost:4000'

const DOMAIN_META = {
  'crude.barrel-received.critical':        { domain:'Refinery',   color:'#f59e0b', icon:'🏭' },
  'crude.batch-processed.critical':        { domain:'Refinery',   color:'#f59e0b', icon:'🏭' },
  'pipeline.flow-updated.standard':        { domain:'Pipeline',   color:'#3b82f6', icon:'🔧' },
  'pipeline.leak-alert.critical':          { domain:'Pipeline',   color:'#ef4444', icon:'⚠️' },
  'trading.deal-executed.critical':        { domain:'Trading',    color:'#10b981', icon:'📈' },
  'trading.price-tick.bulk':               { domain:'Trading',    color:'#10b981', icon:'📈' },
  'logistics.shipment-dispatched.standard':{ domain:'Logistics',  color:'#8b5cf6', icon:'🚛' },
  'logistics.delivery-confirmed.critical': { domain:'Logistics',  color:'#8b5cf6', icon:'🚛' },
  'safety.incident-reported.critical':     { domain:'Safety',     color:'#ef4444', icon:'🦺' },
  'finance.invoice-raised.standard':       { domain:'Finance',    color:'#06b6d4', icon:'💰' },
  'customer.order-placed.critical':        { domain:'Customer',   color:'#f97316', icon:'📋' },
}

const SEV_COLOR = { CRITICAL:'#ef4444', HIGH:'#f97316', MEDIUM:'#f59e0b', LOW:'#22c55e' }

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString()
}

function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60000) return `${Math.floor(diff/1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
  return `${Math.floor(diff/3600000)}h ago`
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER PORTAL
// ─────────────────────────────────────────────────────────────────────────────
function CustomerPortal({ orders, onOrderPlaced }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({
    customerName:'', customerId:'', product:'DIESEL',
    quantityLtrs:'', deliveryAddress:'', priority:'STANDARD',
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/products`).then(r => r.json()).then(setProducts).catch(console.error)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError(null); setResult(null)
    try {
      const body = {
        ...form,
        quantityLtrs: parseFloat(form.quantityLtrs),
        customerId: form.customerId || `CUST-${form.customerName.replace(/\s+/g,'-').toUpperCase().slice(0,8)}`,
      }
      const res = await fetch(`${API}/api/orders`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({ ...data, customerName: form.customerName, product: form.product })
      onOrderPlaced({ ...body, ...data })
      setForm(f => ({ ...f, quantityLtrs:'', deliveryAddress:'' }))
    } catch(e) { setError(e.message) }
    finally { setSubmitting(false) }
  }

  const availableProducts = products.filter(p => p.available)

  return (
    <div className="tab-content">
      <div className="two-col">
        {/* Order Form */}
        <div className="card">
          <h2 className="card-title">🛒 Place a Product Order</h2>
          <form className="order-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Your Name</label>
              <input required value={form.customerName} onChange={e => setForm(f=>({...f,customerName:e.target.value}))} placeholder="e.g. Emeka Okafor" />
            </div>
            <div className="form-row">
              <label>Company ID (optional)</label>
              <input value={form.customerId} onChange={e => setForm(f=>({...f,customerId:e.target.value}))} placeholder="Auto-generated if blank" />
            </div>
            <div className="form-row">
              <label>Product</label>
              <select value={form.product} onChange={e => setForm(f=>({...f,product:e.target.value}))}>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${p.pricePerUnit}/{p.unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Quantity ({availableProducts.find(p=>p.id===form.product)?.unit || 'units'})</label>
              <input required type="number" min="1" value={form.quantityLtrs} onChange={e => setForm(f=>({...f,quantityLtrs:e.target.value}))} placeholder="e.g. 5000" />
            </div>
            <div className="form-row">
              <label>Delivery Address</label>
              <input required value={form.deliveryAddress} onChange={e => setForm(f=>({...f,deliveryAddress:e.target.value}))} placeholder="e.g. 14 Broad St, Lagos" />
            </div>
            <div className="form-row">
              <label>Priority</label>
              <div className="priority-group">
                {['STANDARD','EXPRESS','EMERGENCY'].map(p => (
                  <button key={p} type="button" className={`priority-btn ${form.priority===p?'active':''} pri-${p.toLowerCase()}`}
                    onClick={() => setForm(f=>({...f,priority:p}))}>
                    {p === 'STANDARD' ? '🕐 Standard (48h)' : p === 'EXPRESS' ? '⚡ Express (24h)' : '🚨 Emergency (6h)'}
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="alert-banner">{error}</div>}
            <button className="submit-btn" type="submit" disabled={submitting}>
              {submitting ? 'Placing Order...' : '🛢️ Place Order'}
            </button>
          </form>
        </div>

        {/* Confirmation + Order History */}
        <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>
          {result && (
            <div className="card success-card">
              <div className="success-icon">✅</div>
              <h3>Order Confirmed!</h3>
              <div className="order-detail">
                <span className="detail-label">Order ID</span>
                <span className="detail-val order-id">{result.orderId}</span>
              </div>
              <div className="order-detail">
                <span className="detail-label">Product</span>
                <span className="detail-val">{result.product}</span>
              </div>
              <div className="order-detail">
                <span className="detail-label">Total Value</span>
                <span className="detail-val">${result.totalUsd?.toLocaleString('en',{minimumFractionDigits:2})}</span>
              </div>
              <div className="order-detail">
                <span className="detail-label">Est. Delivery</span>
                <span className="detail-val">{result.estimatedDeliveryHours}h</span>
              </div>
              <p className="order-note">Your order has entered the Kyle Corp pipeline. Logistics will dispatch from the nearest depot.</p>
            </div>
          )}

          <div className="card">
            <h3 className="card-title">📦 Your Recent Orders</h3>
            {orders.length === 0 ? (
              <p className="empty-msg">No orders placed yet in this session.</p>
            ) : (
              <div className="order-list">
                {[...orders].reverse().map(o => (
                  <div key={o.orderId} className="order-item">
                    <div className="order-item-top">
                      <span className="order-id-small">{o.orderId}</span>
                      <span className={`status-badge status-${o.status?.toLowerCase()}`}>{o.status}</span>
                    </div>
                    <div className="order-item-meta">
                      <span>{o.productName || o.product}</span>
                      <span>{o.quantityLtrs?.toLocaleString()} units</span>
                      <span className="order-time">{relTime(o.placedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="card" style={{marginTop:'1.5rem'}}>
        <h3 className="card-title">🔄 What Happens After You Order</h3>
        <div className="flow-steps">
          {[
            {icon:'📋', label:'Customer places order', desc:'Your order enters the Customer domain event stream'},
            {icon:'🏭', label:'Refinery allocates batch', desc:'Refinery checks inventory & schedules a processing run'},
            {icon:'🚛', label:'Logistics dispatches', desc:'Nearest depot assigns vehicle & dispatches shipment'},
            {icon:'📡', label:'Pipeline monitors route', desc:'Pipeline sensors track product movement in real-time'},
            {icon:'✅', label:'Delivery confirmed', desc:'Proof of delivery recorded on the event stream'},
            {icon:'💰', label:'Finance invoices', desc:'Automated invoice raised and sent to your account'},
          ].map((s,i) => (
            <div key={i} className="flow-step">
              <div className="step-icon">{s.icon}</div>
              <div className="step-connector">{i < 5 && <span className="arrow-right">→</span>}</div>
              <div className="step-label">{s.label}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS CENTER
// ─────────────────────────────────────────────────────────────────────────────
function OperationsCenter({ eventFeed, domainStats }) {
  const feedRef = useRef(null)
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0
  }, [eventFeed.length])

  const domains = [
    { key:'Refinery',  icon:'🏭', color:'#f59e0b', desc:'Crude processing & product yield' },
    { key:'Pipeline',  icon:'🔧', color:'#3b82f6', desc:'Flow monitoring & leak detection' },
    { key:'Trading',   icon:'📈', color:'#10b981', desc:'Commodity buy/sell & price ticks' },
    { key:'Logistics', icon:'🚛', color:'#8b5cf6', desc:'Shipment dispatch & delivery' },
    { key:'Safety',    icon:'🦺', color:'#ef4444', desc:'HSE incidents & compliance' },
    { key:'Finance',   icon:'💰', color:'#06b6d4', desc:'Invoicing & revenue tracking' },
  ]

  const totalEvents = Object.values(domainStats).reduce((a,b) => a + (b.count||0), 0)

  return (
    <div className="tab-content">
      {/* KPI bar */}
      <div className="kpi-bar">
        <div className="kpi"><span className="kpi-val">{totalEvents}</span><span className="kpi-lbl">Total Events</span></div>
        <div className="kpi"><span className="kpi-val">{domainStats['Pipeline']?.count||0}</span><span className="kpi-lbl">Pipeline Readings</span></div>
        <div className="kpi"><span className="kpi-val">{domainStats['Refinery']?.count||0}</span><span className="kpi-lbl">Refinery Events</span></div>
        <div className="kpi"><span className="kpi-val">{domainStats['Trading']?.count||0}</span><span className="kpi-lbl">Trade Events</span></div>
        <div className="kpi"><span className="kpi-val">{domainStats['Safety']?.count||0}</span><span className="kpi-lbl">Safety Alerts</span></div>
        <div className="kpi"><span className="kpi-val">{domainStats['Logistics']?.count||0}</span><span className="kpi-lbl">Shipments</span></div>
      </div>

      {/* Domain cards */}
      <div className="domain-grid">
        {domains.map((d,i) => {
          const stats = domainStats[d.key] || {}
          return (
            <div key={d.key} className="domain-card" style={{'--accent':d.color}}>
              <div className="domain-card-top">
                <span className="domain-icon">{d.icon}</span>
                <span className="domain-name">{d.key}</span>
                <span className="domain-count">{stats.count || 0}</span>
              </div>
              <div className="domain-desc">{d.desc}</div>
              {stats.lastEvent && (
                <div className="domain-last">
                  <span className="last-topic">{stats.lastTopic?.split('.').slice(0,2).join('.')}</span>
                  <span className="last-time">{relTime(stats.lastEvent)}</span>
                </div>
              )}
              <div className="domain-pulse" style={{background: d.color}} />
            </div>
          )
        })}
      </div>

      {/* Flow diagram */}
      <div className="card" style={{marginTop:'1.5rem'}}>
        <h3 className="card-title">🔀 Domain Event Flow</h3>
        <div className="flow-diagram">
          <div className="flow-row">
            <div className="flow-box customer-box">📋 Customer<br/><small>Places Order</small></div>
            <div className="flow-arrow">→</div>
            <div className="flow-box refinery-box">🏭 Refinery<br/><small>Allocates Product</small></div>
            <div className="flow-arrow">→</div>
            <div className="flow-box logistics-box">🚛 Logistics<br/><small>Dispatches</small></div>
            <div className="flow-arrow">→</div>
            <div className="flow-box finance-box">💰 Finance<br/><small>Invoices</small></div>
          </div>
          <div className="flow-side-row">
            <div className="flow-box pipeline-box">🔧 Pipeline<br/><small>Monitors Flow</small></div>
            <div className="flow-side-arrow">↕</div>
            <div className="flow-box safety-box">🦺 Safety<br/><small>HSE Alerts</small></div>
            <div className="flow-side-arrow">↕</div>
            <div className="flow-box trading-box">📈 Trading<br/><small>Sets Prices</small></div>
          </div>
          <div className="flow-center">
            <div className="kafka-bus">
              <span className="kafka-label">⚡ Kafka Event Bus (Redpanda)</span>
              <span className="kafka-sub">All domains publish & subscribe here</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live event feed */}
      <div className="card" style={{marginTop:'1.5rem'}}>
        <h3 className="card-title">📡 Live Event Feed</h3>
        <div className="event-feed" ref={feedRef}>
          {eventFeed.length === 0 ? (
            <div className="empty-feed">Waiting for events... Start the producers to see live data.</div>
          ) : (
            eventFeed.map((ev,i) => {
              const meta = DOMAIN_META[ev.topic] || { color:'#6b7280', icon:'📦', domain:'Unknown' }
              return (
                <div key={i} className="feed-row" style={{'--ev-color': meta.color}}>
                  <span className="feed-icon">{meta.icon}</span>
                  <span className="feed-domain" style={{color: meta.color}}>{meta.domain}</span>
                  <span className="feed-topic">{ev.topic}</span>
                  <span className="feed-time">{fmt(ev.ts)}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REFINERY & TRADING
// ─────────────────────────────────────────────────────────────────────────────
function RefineryTrading({ prices, deals }) {
  const [throughput, setThroughput] = useState([])
  const [revenue, setRevenue] = useState([])

  useEffect(() => {
    const load = () => {
      fetch(`${API}/api/analytics/throughput`).then(r=>r.json()).then(setThroughput).catch(()=>{})
      fetch(`${API}/api/analytics/revenue`).then(r=>r.json()).then(setRevenue).catch(()=>{})
    }
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  const priceList = [
    { id:'BRENT_CRUDE', label:'Brent Crude', unit:'/bbl' },
    { id:'WTI_CRUDE',   label:'WTI Crude',   unit:'/bbl' },
    { id:'DIESEL',      label:'Diesel',      unit:'/L'   },
    { id:'PETROL',      label:'Petrol',      unit:'/L'   },
    { id:'LPG',         label:'LPG',         unit:'/kg'  },
    { id:'KEROSENE',    label:'Kerosene',    unit:'/L'   },
  ]

  return (
    <div className="tab-content">
      {/* Price ticker */}
      <div className="price-ticker">
        {priceList.map(p => {
          const tick = prices[p.id]
          const change = tick?.change24h || 0
          return (
            <div key={p.id} className="tick-item">
              <span className="tick-name">{p.label}</span>
              <span className="tick-price">${tick?.midPrice?.toFixed(p.unit==='/bbl'?2:4) || '—'}{p.unit}</span>
              <span className={`tick-change ${change >= 0 ? 'up' : 'down'}`}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>

      <div className="two-col" style={{marginTop:'1.5rem'}}>
        {/* Refinery Throughput */}
        <div className="card">
          <h3 className="card-title">🏭 Refinery Throughput</h3>
          {throughput.length === 0 ? (
            <p className="empty-msg">No throughput data yet. Start the crude producer.</p>
          ) : (
            throughput.map((r,i) => (
              <div key={i} className="throughput-row">
                <div className="refinery-name">{r.refineryId || 'Refinery-1'}</div>
                <div className="yield-bars">
                  {[
                    {label:'Total Input', val: r.totalBarrels, color:'#f59e0b', max: r.totalBarrels},
                    {label:'Diesel',      val: r.diesel,       color:'#3b82f6', max: r.totalBarrels},
                    {label:'Petrol',      val: r.petrol,       color:'#10b981', max: r.totalBarrels},
                    {label:'LPG',         val: r.lpg,          color:'#8b5cf6', max: r.totalBarrels},
                    {label:'Kerosene',    val: r.kerosene,     color:'#06b6d4', max: r.totalBarrels},
                  ].map(y => (
                    <div key={y.label} className="yield-row">
                      <span className="yield-label">{y.label}</span>
                      <div className="yield-bar-track">
                        <div className="yield-bar-fill" style={{
                          width: `${Math.min(100, (y.val/y.max)*100)||0}%`,
                          background: y.color
                        }} />
                      </div>
                      <span className="yield-val">{Number(y.val||0).toLocaleString()} bbl</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {revenue.length > 0 && (
            <div style={{marginTop:'1.5rem'}}>
              <h4 className="card-title" style={{fontSize:'0.85rem'}}>💰 Revenue by Product</h4>
              {revenue.map((r,i) => (
                <div key={i} className="rev-row">
                  <span className="rev-product">{r.product}</span>
                  <span className="rev-count">{r.invoiceCount} invoices</span>
                  <span className="rev-amount">${Number(r.revenue||0).toLocaleString('en',{minimumFractionDigits:2})}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Deal Feed */}
        <div className="card">
          <h3 className="card-title">📈 Live Deal Feed</h3>
          {deals.length === 0 ? (
            <p className="empty-msg">No deals yet. Start the trading producer.</p>
          ) : (
            <div className="deal-list">
              {deals.slice(0,15).map((d,i) => (
                <div key={i} className={`deal-row ${d.side?.toLowerCase()}`}>
                  <span className={`deal-side ${d.side?.toLowerCase()}`}>{d.side}</span>
                  <span className="deal-product">{d.product?.replace('_',' ')}</span>
                  <span className="deal-qty">{Number(d.quantity||0).toLocaleString()} bbl</span>
                  <span className="deal-price">${Number(d.priceUsd||0).toFixed(2)}</span>
                  <span className="deal-trader">{d.traderId}</span>
                  <span className="deal-time">{fmt(d.executedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE MONITOR
// ─────────────────────────────────────────────────────────────────────────────
function PipelineMonitor({ leakAlerts, pipelineData }) {
  const PIPELINES = ['PIPE-WARRI-01','PIPE-LAGOS-02','PIPE-PH-03','PIPE-KADUNA-04']

  const latestByPipeline = {}
  for (const row of pipelineData) {
    if (!latestByPipeline[row.pipelineId] || row.recordedAt > latestByPipeline[row.pipelineId].recordedAt) {
      latestByPipeline[row.pipelineId] = row
    }
  }

  function statusColor(s) {
    if (s === 'NORMAL') return '#22c55e'
    if (s === 'DEGRADED') return '#f59e0b'
    return '#ef4444'
  }

  function flowPercent(bph) {
    return Math.min(100, ((bph||0) / 15000) * 100)
  }

  return (
    <div className="tab-content">
      {leakAlerts.length > 0 && (
        <div className="alert-banner-red">
          🚨 ACTIVE LEAK ALERTS: {leakAlerts.length} — Immediate action required!
        </div>
      )}

      <div className="pipeline-grid">
        {PIPELINES.map(pid => {
          const d = latestByPipeline[pid]
          const status = d?.status || 'NORMAL'
          const flow = d?.flowRateBph || 0
          const pressure = d?.pressurePsi || 0

          return (
            <div key={pid} className="pipeline-card" style={{'--pipe-color': statusColor(status)}}>
              <div className="pipe-header">
                <span className="pipe-id">🔧 {pid}</span>
                <span className="pipe-status-badge" style={{background: statusColor(status)}}>{status}</span>
              </div>

              <div className="pipe-metric">
                <span className="pipe-metric-label">Flow Rate</span>
                <span className="pipe-metric-val">{flow.toLocaleString()} bph</span>
              </div>
              <div className="pipe-flow-bar">
                <div className="pipe-flow-fill" style={{width:`${flowPercent(flow)}%`, background: statusColor(status)}} />
              </div>

              <div className="pipe-row">
                <div className="pipe-metric">
                  <span className="pipe-metric-label">Pressure</span>
                  <span className="pipe-metric-val">{pressure.toFixed(1)} PSI</span>
                </div>
                <div className="pipe-metric">
                  <span className="pipe-metric-label">Segment</span>
                  <span className="pipe-metric-val">{d?.segmentId || '—'}</span>
                </div>
              </div>

              {d?.recordedAt && (
                <div className="pipe-updated">Last reading: {relTime(d.recordedAt)}</div>
              )}
            </div>
          )
        })}
      </div>

      {leakAlerts.length > 0 && (
        <div className="card" style={{marginTop:'1.5rem', borderColor:'#ef4444'}}>
          <h3 className="card-title" style={{color:'#ef4444'}}>⚠️ Leak Alert Log</h3>
          <div className="incident-table">
            <div className="table-header">
              <span>Alert ID</span><span>Pipeline</span><span>KM</span>
              <span>Severity</span><span>Est. Loss (bbl)</span><span>Detected</span>
            </div>
            {leakAlerts.map((a,i) => (
              <div key={i} className="table-row" style={{borderLeft:`3px solid ${SEV_COLOR[a.severity]||'#ef4444'}`}}>
                <span>{a.alertId?.slice(0,12)}</span>
                <span>{a.pipelineId}</span>
                <span>{a.segmentKm?.toFixed(1)}</span>
                <span style={{color: SEV_COLOR[a.severity]}}>{a.severity}</span>
                <span>{a.estimatedLossBarrels?.toFixed(0)}</span>
                <span>{fmt(a.ts || a.detectedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{marginTop:'1.5rem'}}>
        <h3 className="card-title">📊 How Pipeline Monitoring Works</h3>
        <div className="explainer-grid">
          <div className="explainer-item">
            <span className="ex-icon">📡</span>
            <strong>Sensor Readings</strong>
            <p>Every 5 minutes, pressure & flow sensors across all 4 pipeline segments publish readings to the <code>pipeline.flow-updated.standard</code> topic</p>
          </div>
          <div className="explainer-item">
            <span className="ex-icon">🔍</span>
            <strong>Anomaly Detection</strong>
            <p>A sudden pressure drop (≥15 PSI in 10 minutes) automatically triggers a <code>pipeline.leak-alert.critical</code> event</p>
          </div>
          <div className="explainer-item">
            <span className="ex-icon">🚨</span>
            <strong>Auto-Response</strong>
            <p>Critical alerts fan-out to: Safety team, Operations center, Maintenance crew, and Regulatory compliance simultaneously</p>
          </div>
          <div className="explainer-item">
            <span className="ex-icon">📈</span>
            <strong>ClickHouse Views</strong>
            <p>All readings materialize into ClickHouse for historical analysis, SLA reporting, and corrosion trend detection</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────
function SafetyCompliance({ incidents }) {
  const counts = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 }
  for (const inc of incidents) counts[inc.severity] = (counts[inc.severity]||0)+1

  const INC_ICONS = { SPILL:'💧', FIRE:'🔥', INJURY:'🩹', NEAR_MISS:'⚠️', EQUIPMENT_FAILURE:'⚙️' }

  return (
    <div className="tab-content">
      <div className="sev-counters">
        <div className="sev-card total"><span className="sev-num">{incidents.length}</span><span className="sev-lbl">Total Incidents</span></div>
        <div className="sev-card critical"><span className="sev-num">{counts.CRITICAL}</span><span className="sev-lbl">CRITICAL</span></div>
        <div className="sev-card high"><span className="sev-num">{counts.HIGH}</span><span className="sev-lbl">HIGH</span></div>
        <div className="sev-card medium"><span className="sev-num">{counts.MEDIUM}</span><span className="sev-lbl">MEDIUM</span></div>
        <div className="sev-card low"><span className="sev-num">{counts.LOW}</span><span className="sev-lbl">LOW</span></div>
      </div>

      <div className="card" style={{marginTop:'1.5rem'}}>
        <h3 className="card-title">🦺 HSE Incident Board</h3>
        {incidents.length === 0 ? (
          <p className="empty-msg">No incidents reported. All operations running safely.</p>
        ) : (
          <div className="incident-table">
            <div className="table-header">
              <span>Time</span><span>Type</span><span>Severity</span>
              <span>Location</span><span>Description</span><span>Details</span>
            </div>
            {incidents.map((inc,i) => (
              <div key={i} className="table-row incident-row"
                style={{borderLeft:`4px solid ${SEV_COLOR[inc.severity]||'#6b7280'}`}}>
                <span className="inc-time">{fmt(inc.reportedAt || inc.ts)}</span>
                <span className="inc-type">{INC_ICONS[inc.type]||'📋'} {inc.type?.replace('_',' ')}</span>
                <span className="inc-sev" style={{color: SEV_COLOR[inc.severity]}}>{inc.severity}</span>
                <span className="inc-loc">{inc.location}</span>
                <span className="inc-desc">{inc.description}</span>
                <span className="inc-details">
                  {inc.barrelsSpilled != null && `${inc.barrelsSpilled} bbl spilled`}
                  {inc.injuredCount != null && ` ${inc.injuredCount} injured`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{marginTop:'1.5rem'}}>
        <h3 className="card-title">📋 Regulatory Compliance Flow</h3>
        <div className="explainer-grid">
          <div className="explainer-item">
            <span className="ex-icon">📝</span>
            <strong>NUPRC Reporting</strong>
            <p>All spills of ≥1 barrel auto-generate a Nigerian Upstream Petroleum Regulatory Commission (NUPRC) report within 2 hours via the compliance domain</p>
          </div>
          <div className="explainer-item">
            <span className="ex-icon">🌿</span>
            <strong>Emissions Tracking</strong>
            <p>CO₂ and NOₓ sensors publish to <code>safety.emissions-reading.bulk</code> every minute for EPA carbon credit calculations</p>
          </div>
          <div className="explainer-item">
            <span className="ex-icon">🔒</span>
            <strong>OPA Policy Gate</strong>
            <p>The Open Policy Agent blocks any event with unmasked employee names or GPS coordinates of incident sites from entering the public event catalog</p>
          </div>
          <div className="explainer-item">
            <span className="ex-icon">📊</span>
            <strong>SLO Dashboard</strong>
            <p>Safety KPIs — Total Recordable Incident Rate (TRIR) and Lost Time Injury Frequency (LTIF) — stream live into Grafana</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('customer')
  const [liveStatus, setLiveStatus] = useState('connecting')

  // Shared state
  const [myOrders,     setMyOrders]     = useState([])
  const [eventFeed,    setEventFeed]    = useState([])
  const [domainStats,  setDomainStats]  = useState({})
  const [prices,       setPrices]       = useState({})
  const [deals,        setDeals]        = useState([])
  const [leakAlerts,   setLeakAlerts]   = useState([])
  const [pipelineData, setPipelineData] = useState([])
  const [incidents,    setIncidents]    = useState([])

  // Load analytics from ClickHouse on mount
  useEffect(() => {
    fetch(`${API}/api/analytics/deals`).then(r=>r.json()).then(setDeals).catch(()=>{})
    fetch(`${API}/api/analytics/pipeline`).then(r=>r.json()).then(setPipelineData).catch(()=>{})
    fetch(`${API}/api/analytics/incidents`).then(r=>r.json()).then(setIncidents).catch(()=>{})
  }, [])

  // SSE
  useEffect(() => {
    let es
    function connect() {
      es = new EventSource(`${API}/api/events/stream`)
      es.onopen = () => setLiveStatus('live')
      es.onerror = () => { setLiveStatus('reconnecting'); setTimeout(connect, 5000) }

      es.addEventListener('connected', () => setLiveStatus('live'))

      es.addEventListener('domain_event', (e) => {
        const data = JSON.parse(e.data)
        const meta = DOMAIN_META[data.topic] || { domain:'Unknown', color:'#6b7280' }
        const ev = { topic: data.topic, payload: data.payload, ts: new Date(data.ts).toISOString() }

        // Feed
        setEventFeed(f => [ev, ...f].slice(0, 50))

        // Domain stats
        setDomainStats(s => ({
          ...s,
          [meta.domain]: {
            count: ((s[meta.domain]?.count)||0) + 1,
            lastEvent: ev.ts,
            lastTopic: data.topic,
          }
        }))

        // Price ticks
        if (data.topic === 'trading.price-tick.bulk') {
          const p = data.payload
          if (p?.product) setPrices(ps => ({ ...ps, [p.product]: p }))
        }

        // Deals
        if (data.topic === 'trading.deal-executed.critical') {
          setDeals(d => [{ ...data.payload, ts: ev.ts }, ...d].slice(0,20))
        }

        // Leak alerts
        if (data.topic === 'pipeline.leak-alert.critical') {
          setLeakAlerts(a => [{ ...data.payload, ts: ev.ts }, ...a].slice(0,20))
        }

        // Pipeline data
        if (data.topic === 'pipeline.flow-updated.standard') {
          const p = data.payload
          if (p?.pipelineId) {
            setPipelineData(pd => {
              const next = pd.filter(r => r.pipelineId !== p.pipelineId)
              return [{ ...p, recordedAt: ev.ts }, ...next].slice(0,20)
            })
          }
        }

        // Incidents
        if (data.topic === 'safety.incident-reported.critical') {
          setIncidents(inc => [{ ...data.payload, ts: ev.ts }, ...inc].slice(0,10))
        }
      })

      es.addEventListener('order_placed', (e) => {
        const data = JSON.parse(e.data)
        setEventFeed(f => [{ topic:'customer.order-placed.critical', payload:data, ts:new Date().toISOString() }, ...f].slice(0,50))
      })
    }
    connect()
    return () => es?.close()
  }, [])

  const tabs = [
    { id:'customer',   label:'🛒 Customer Portal' },
    { id:'operations', label:'📡 Operations Center' },
    { id:'refinery',   label:'🏭 Refinery & Trading' },
    { id:'pipeline',   label:'🔧 Pipeline Monitor' },
    { id:'safety',     label:'🦺 Safety & Compliance' },
  ]

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="brand-icon">🛢️</span>
          <div>
            <span className="brand-name">Kyle Corp</span>
            <span className="brand-tagline">Energy Services Platform</span>
          </div>
        </div>

        <div className="nav-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn ${activeTab===t.id?'active':''}`}
              onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="nav-right">
          <span className={`live-badge live-${liveStatus}`}>
            <span className="live-dot" />
            {liveStatus === 'live' ? 'LIVE' : liveStatus === 'reconnecting' ? 'RECONNECTING' : 'CONNECTING'}
          </span>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'customer'   && <CustomerPortal  orders={myOrders} onOrderPlaced={o => setMyOrders(prev=>[...prev,o])} />}
        {activeTab === 'operations' && <OperationsCenter eventFeed={eventFeed} domainStats={domainStats} />}
        {activeTab === 'refinery'   && <RefineryTrading  prices={prices} deals={deals} />}
        {activeTab === 'pipeline'   && <PipelineMonitor  leakAlerts={leakAlerts} pipelineData={pipelineData} />}
        {activeTab === 'safety'     && <SafetyCompliance incidents={incidents} />}
      </main>

      <footer className="footer">
        <span>Kyle Corp Energy Services Platform © 2026</span>
        <span>Powered by Apache Kafka (Redpanda) · ClickHouse · OPA</span>
        <span>
          <a href="http://localhost:8080" target="_blank">Redpanda Console</a> ·&nbsp;
          <a href="http://localhost:3001" target="_blank">Grafana</a> ·&nbsp;
          <a href="http://localhost:8181" target="_blank">OPA</a>
        </span>
      </footer>
    </div>
  )
}
