import { useState, useEffect, useRef, useCallback } from 'react'

const API = 'http://localhost:4000'

const DOMAIN_META = {
  'crude.barrel-received.critical':         { domain:'Refinery',  color:'var(--primary)',   ev:'ev-primary',  icon:'oil_barrel',       label:'crude.barrel-received.critical'  },
  'crude.batch-processed.critical':         { domain:'Refinery',  color:'var(--primary)',   ev:'ev-primary',  icon:'factory',          label:'crude.batch-processed.critical'  },
  'pipeline.flow-updated.standard':         { domain:'Pipeline',  color:'var(--secondary)', ev:'ev-secondary',icon:'settings_input_component', label:'pipeline.flow-updated.standard' },
  'pipeline.leak-alert.critical':           { domain:'Pipeline',  color:'var(--error)',     ev:'ev-error',    icon:'warning',          label:'pipeline.leak-alert.critical'    },
  'trading.deal-executed.critical':         { domain:'Trading',   color:'var(--tertiary)',  ev:'ev-tertiary', icon:'currency_exchange', label:'trading.deal-executed.critical'  },
  'trading.price-tick.bulk':                { domain:'Trading',   color:'var(--tertiary)',  ev:'ev-tertiary', icon:'show_chart',        label:'trading.price-tick.bulk'         },
  'logistics.shipment-dispatched.standard': { domain:'Logistics', color:'var(--secondary)', ev:'ev-secondary',icon:'local_shipping',    label:'logistics.shipment-dispatched.standard' },
  'logistics.delivery-confirmed.critical':  { domain:'Logistics', color:'var(--tertiary)',  ev:'ev-tertiary', icon:'check_circle',      label:'logistics.delivery-confirmed.critical' },
  'safety.incident-reported.critical':      { domain:'Safety',    color:'var(--error)',     ev:'ev-error',    icon:'gpp_maybe',         label:'safety.incident-reported.critical' },
  'finance.invoice-raised.standard':        { domain:'Finance',   color:'var(--secondary)', ev:'ev-secondary',icon:'payments',          label:'finance.invoice-raised.standard' },
  'customer.order-placed.critical':         { domain:'Customer',  color:'var(--primary)',   ev:'ev-primary',  icon:'shopping_cart',     label:'customer.order-placed.critical'  },
}

const SEV_COLOR = { CRITICAL:'var(--error)', HIGH:'#f97316', MEDIUM:'var(--primary-dim)', LOW:'var(--tertiary)' }
const SEV_CSSCLS = { CRITICAL:'ai-error', HIGH:'ai-primary', MEDIUM:'ai-primary', LOW:'ai-tertiary' }
const INC_ICONS  = { SPILL:'water_drop', FIRE:'local_fire_department', INJURY:'personal_injury', NEAR_MISS:'warning', EQUIPMENT_FAILURE:'settings_alert' }

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit',second:'2-digit'})
}
function relTime(ts) {
  const d = Date.now() - new Date(ts).getTime()
  if (d < 60000)   return `${Math.floor(d/1000)}s ago`
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`
  return `${Math.floor(d/3600000)}h ago`
}
function fmtNum(n, dec=0) {
  return Number(n||0).toLocaleString('en', {minimumFractionDigits:dec, maximumFractionDigits:dec})
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon helper
// ─────────────────────────────────────────────────────────────────────────────
function Icon({ name, className='' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT LOG ITEM
// ─────────────────────────────────────────────────────────────────────────────
function EventLogItem({ ev }) {
  const meta = DOMAIN_META[ev.topic] || { ev:'ev-dim', icon:'circle', label: ev.topic, color:'var(--outline)' }
  return (
    <div className={`event-log-item ${meta.ev}`}>
      <Icon name={meta.icon} className="ev-icon" style={{color: meta.color}} />
      <div className="ev-content">
        <div className="ev-toprow">
          <span className="ev-topic data-md" style={{color: meta.color}}>{meta.label}</span>
          <span className="ev-time">{fmt(ev.ts)}</span>
        </div>
        <div className="ev-desc">
          {ev.payload?.incidentId && `${ev.payload.type?.replace('_',' ')} — ${ev.payload.location?.split('—')[0]?.trim()}`}
          {ev.payload?.shipmentId && `${ev.payload.product} → ${ev.payload.destination?.split(',')[0]}`}
          {ev.payload?.pipelineId && `${ev.payload.pipelineId} / ${ev.payload.segmentId} — ${ev.payload.status || ev.payload.severity}`}
          {ev.payload?.dealId     && `${ev.payload.side} ${ev.payload.product?.replace('_',' ')} ${fmtNum(ev.payload.quantity)} @ $${Number(ev.payload.priceUsd||0).toFixed(2)}`}
          {ev.payload?.batchId    && `Batch ${ev.payload.batchId} — ${ev.payload.inputBarrels?.toLocaleString()} bbl`}
          {ev.payload?.barrelBatchId && `Received ${ev.payload.barrels?.toLocaleString()} bbl at ${ev.payload.terminal}`}
          {ev.payload?.orderId    && `Order ${ev.payload.orderId} — ${ev.payload.product} ${fmtNum(ev.payload.quantityLtrs)} L`}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS — Command Center (Kafka Backbone Matrix)
// ─────────────────────────────────────────────────────────────────────────────
function OperationsCenter({ eventFeed, domainStats, liveStatus }) {
  const totalEvents  = Object.values(domainStats).reduce((a,b) => a+(b.count||0), 0)
  const leakCount    = eventFeed.filter(e=>e.topic==='pipeline.leak-alert.critical').length
  const brentPrice   = eventFeed.find(e=>e.topic==='trading.price-tick.bulk' && e.payload?.product==='BRENT_CRUDE')
  const brentPriceVal = brentPrice?.payload?.midPrice?.toFixed(2) || '—'

  return (
    <div className="page-content" style={{display:'flex',flexDirection:'column',gap:'var(--gutter)'}}>

      {/* KPI row */}
      <div className="kpi-grid">
        <div className="kpi-card panel-glow-gold">
          <div className="kpi-hover-glow" />
          <div className="kpi-label-row">
            <span className="kpi-label">Refinery Throughput</span>
            <span className="led led-gold animate-pulse" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{color:'var(--primary)'}}>{domainStats['Refinery']?.count||0}</span>
            <span className="kpi-unit">events</span>
          </div>
          <div className="kpi-sub" style={{color:'var(--tertiary)'}}>
            <Icon name="trending_up" className="material-symbols-outlined" style={{fontSize:12}} />
            Active processing
          </div>
        </div>

        <div className="kpi-card panel-glow-blue">
          <div className="kpi-hover-glow" />
          <div className="kpi-label-row">
            <span className="kpi-label">Pipeline Integrity</span>
            <span className={`led ${leakCount>0?'led-red animate-pulse':'led-green'}`} />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{color: leakCount>0?'var(--error)':'var(--secondary)'}}>{domainStats['Pipeline']?.count||0}</span>
            <span className="kpi-unit">readings</span>
          </div>
          <div className="kpi-sub" style={{color: leakCount>0?'var(--error)':'var(--on-surface-var)'}}>
            <Icon name={leakCount>0?'warning':'check_circle'} style={{fontSize:12}} />
            {leakCount>0 ? `${leakCount} alert(s) pending` : 'Optimal flow'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-hover-glow" />
          <div className="kpi-label-row">
            <span className="kpi-label">Trading Volatility</span>
            <span className="led led-gold animate-pulse" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{color:'var(--primary-dim)'}}>${brentPriceVal}</span>
            <span className="kpi-unit">USD/BBL</span>
          </div>
          <div className="kpi-sub" style={{color:'var(--primary-dim)'}}>
            <Icon name="keyboard_double_arrow_up" style={{fontSize:12}} />
            Active execution
          </div>
        </div>
      </div>

      {/* Main 8/4 grid */}
      <div className="grid-12" style={{alignItems:'stretch'}}>
        {/* Kafka Backbone Matrix */}
        <div className="col-8 panel" style={{display:'flex',flexDirection:'column',minHeight:380}}>
          <div className="panel-header">
            <span className="panel-title">
              <Icon name="waves" />
              Kafka Backbone Matrix
            </span>
            <div style={{display:'flex',gap:16,alignItems:'center'}}>
              <span style={{display:'flex',alignItems:'center',gap:6,fontSize:10,fontFamily:'JetBrains Mono',color:'var(--primary)'}}>
                <span className="led led-gold" style={{width:7,height:7}} /> PRODUCERS
              </span>
              <span style={{display:'flex',alignItems:'center',gap:6,fontSize:10,fontFamily:'JetBrains Mono',color:'var(--secondary)'}}>
                <span className="led led-blue" style={{width:7,height:7}} /> BROKERS
              </span>
              <span style={{display:'flex',alignItems:'center',gap:6,fontSize:10,fontFamily:'JetBrains Mono',color:'var(--tertiary)'}}>
                <span className="led led-green" style={{width:7,height:7}} /> CONSUMERS
              </span>
            </div>
          </div>

          <div className="topology-canvas" style={{flex:1}}>
            <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="lineGrad" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="transparent"/>
                  <stop offset="50%" stopColor="#ffdca1"/>
                  <stop offset="100%" stopColor="transparent"/>
                </linearGradient>
                <linearGradient id="lineGradGreen" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="transparent"/>
                  <stop offset="50%" stopColor="#4cff8f"/>
                  <stop offset="100%" stopColor="transparent"/>
                </linearGradient>
              </defs>
              {/* Producer nodes */}
              <circle cx="90" cy="70"  r="8" fill="#ffba20" className="animate-pulse"/>
              <text x="80" y="54" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">REFINERY_TX</text>
              <circle cx="90" cy="150" r="8" fill="#ffba20"/>
              <text x="80" y="134" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">PIPELINE_TX</text>
              <circle cx="90" cy="230" r="8" fill="#ffba20"/>
              <text x="80" y="214" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">TRADING_TX</text>
              {/* Kafka cluster */}
              <rect x="330" y="90" width="110" height="140" rx="6" fill="rgba(0,175,254,0.08)" stroke="#00affe" strokeWidth="1"/>
              <text x="345" y="167" fill="#8dcdff" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700">KAFKA</text>
              <text x="340" y="181" fill="#8dcdff" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700">CLUSTER</text>
              {/* Consumer nodes */}
              <circle cx="700" cy="70"  r="8" fill="#4cff8f"/>
              <text x="660" y="54" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">LOGISTICS_RX</text>
              <circle cx="700" cy="150" r="8" fill="#4cff8f" className="animate-pulse"/>
              <text x="672" y="134" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">SAFETY_RX</text>
              <circle cx="700" cy="230" r="8" fill="#4cff8f"/>
              <text x="670" y="214" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">FINANCE_RX</text>
              {/* Producer → Kafka */}
              <path d="M98 70 L330 130" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5" opacity="0.7"/>
              <path d="M98 150 L330 160" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5" opacity="0.7"/>
              <path d="M98 230 L330 190" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5" opacity="0.7"/>
              {/* Kafka → Consumers */}
              <path d="M440 130 L692 70"  fill="none" stroke="#4cff8f" strokeDasharray="6 4" strokeWidth="1" opacity="0.5">
                <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.5s" repeatCount="indefinite"/>
              </path>
              <path d="M440 160 L692 150" fill="none" stroke="#4cff8f" strokeDasharray="6 4" strokeWidth="1" opacity="0.5">
                <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.2s" repeatCount="indefinite"/>
              </path>
              <path d="M440 190 L692 230" fill="none" stroke="#4cff8f" strokeDasharray="6 4" strokeWidth="1" opacity="0.5">
                <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.8s" repeatCount="indefinite"/>
              </path>
            </svg>

            <div className="topology-stats">
              <div className="stat-chip">
                <span className="stat-chip-label">STREAM_LOAD</span>
                <span className="stat-chip-value">{(totalEvents * 0.0042).toFixed(1)} MB/s</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-label">LATENCY</span>
                <span className="stat-chip-value" style={{color:'var(--tertiary)'}}>12ms</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip-label">TOTAL EVENTS</span>
                <span className="stat-chip-value">{totalEvents.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Consumer nodes bar */}
          <div style={{marginTop:16}}>
            <div className="consumer-node">
              <Icon name="local_shipping" className="cn-icon" />
              <span className="cn-name label-caps" style={{fontSize:10}}>Logistics Optimizer</span>
              <div className="cn-bar-track">
                <div className="cn-bar-fill" style={{width:`${Math.min(100,(domainStats['Logistics']?.count||0)*2)}%`, background:'var(--tertiary)'}} />
              </div>
              <span className="cn-pct">{Math.min(100,(domainStats['Logistics']?.count||0)*2)}%</span>
            </div>
            <div className="consumer-node">
              <Icon name="security" className="cn-icon" />
              <span className="cn-name label-caps" style={{fontSize:10}}>Safety Response</span>
              <div className="cn-bar-track">
                <div className="cn-bar-fill" style={{width:`${Math.min(100,(domainStats['Safety']?.count||0)*10)}%`, background:'var(--error)'}} />
              </div>
              <span className="cn-pct">{Math.min(100,(domainStats['Safety']?.count||0)*10)}%</span>
            </div>
            <div className="consumer-node">
              <Icon name="payments" className="cn-icon" />
              <span className="cn-name label-caps" style={{fontSize:10}}>Finance Ledger</span>
              <div className="cn-bar-track">
                <div className="cn-bar-fill" style={{width:`${Math.min(100,(domainStats['Finance']?.count||0)*5)}%`, background:'var(--secondary)'}} />
              </div>
              <span className="cn-pct">{Math.min(100,(domainStats['Finance']?.count||0)*5)}%</span>
            </div>
          </div>
        </div>

        {/* Critical Event Log */}
        <div className="col-4 panel" style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div className="panel-header">
            <span className="label-caps" style={{color:'var(--primary)'}}>CRITICAL_EVENT_LOG</span>
            <Icon name="filter_list" style={{color:'var(--outline)',cursor:'pointer',fontSize:20}} />
          </div>
          <div className="event-log" style={{flex:1,overflowY:'auto'}}>
            {eventFeed.length === 0
              ? <div className="empty-state">Waiting for events...<br/>Start the producers to see live data.</div>
              : eventFeed.slice(0,20).map((ev,i) => <EventLogItem key={i} ev={ev} />)
            }
          </div>
          <div style={{paddingTop:12,borderTop:'1px solid rgba(81,69,50,0.15)',marginTop:8}}>
            <span className="label-caps" style={{color:'var(--outline)',fontSize:9,cursor:'pointer'}}>
              VIEW FULL HISTORICAL TRACE →
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REFINERY
// ─────────────────────────────────────────────────────────────────────────────
function RefineryView({ eventFeed }) {
  const [throughput, setThroughput] = useState([])
  const [revenue,    setRevenue]    = useState([])

  useEffect(() => {
    const load = () => {
      fetch(`${API}/api/analytics/throughput`).then(r=>r.json()).then(setThroughput).catch(()=>{})
      fetch(`${API}/api/analytics/revenue`).then(r=>r.json()).then(setRevenue).catch(()=>{})
    }
    load(); const id = setInterval(load,10000); return ()=>clearInterval(id)
  }, [])

  const crudeEvents = eventFeed.filter(e => e.topic?.startsWith('crude.'))
  const alerts      = eventFeed.filter(e => e.topic === 'crude.batch-processed.critical')

  return (
    <div className="page-content" style={{display:'flex',flexDirection:'column',gap:'var(--gutter)'}}>
      {/* Hero metrics */}
      <div className="grid-12" style={{marginBottom:0}}>
        <div className="col-6 panel glass-rim" style={{position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:12,right:12,opacity:0.12}}>
            <Icon name="oil_barrel" style={{fontSize:64,color:'var(--primary)'}} />
          </div>
          <div className="label-caps" style={{color:'var(--on-surface-var)',marginBottom:8}}>Crude Barrels Received</div>
          <div style={{display:'flex',alignItems:'baseline',gap:16,flexWrap:'wrap'}}>
            <span style={{fontFamily:'JetBrains Mono',fontSize:44,fontWeight:500,color:'var(--primary)',lineHeight:1}}>
              {fmtNum(crudeEvents.reduce((s,e)=>(s+(e.payload?.barrels||0)),0))}
            </span>
            {crudeEvents.length > 0 && (
              <span className="label-caps animate-pulse" style={{color:'var(--error)',display:'flex',alignItems:'center',gap:4}}>
                <Icon name="warning" style={{fontSize:14}} /> CAPACITY ALERT
              </span>
            )}
          </div>
          <div style={{marginTop:16,height:6,background:'var(--surface-highest)',borderRadius:3,overflow:'hidden'}}>
            <div className="glow-gold" style={{height:'100%',width:'88%',background:'var(--primary-dim)',borderRadius:3,transition:'width 1s'}} />
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontFamily:'JetBrains Mono',fontSize:11,color:'var(--on-surface-var)'}}>
            <span>Current Intake: {fmtNum(crudeEvents.length * 12.4, 1)}k BBL/h</span>
            <span>Threshold: 1.4M BBL</span>
          </div>
        </div>

        <div className="col-3 panel glass-rim">
          <div className="label-caps" style={{color:'var(--on-surface-var)',marginBottom:8}}>Refinery Efficiency</div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontFamily:'JetBrains Mono',fontSize:40,fontWeight:700,color:'var(--tertiary)',lineHeight:1}}>94.8%</span>
            <span style={{fontFamily:'JetBrains Mono',fontSize:11,background:'rgba(76,255,143,0.1)',color:'var(--tertiary)',padding:'3px 8px',borderRadius:4}}>+1.2%</span>
          </div>
          <div style={{marginTop:16,height:36,display:'flex',alignItems:'flex-end',gap:3}}>
            {[0.6,0.75,0.7,0.85,1].map((h,i)=>(
              <div key={i} style={{flex:1,background:`rgba(76,255,143,${h*0.8})`,height:`${h*100}%`,borderRadius:'2px 2px 0 0'}} className={i===4?'glow-green':''} />
            ))}
          </div>
        </div>

        <div className="col-3 panel glass-rim">
          <div className="label-caps" style={{color:'var(--on-surface-var)',marginBottom:8}}>System Status</div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <span className="led led-green glow-green" style={{width:14,height:14}} />
            <span style={{fontSize:18,fontWeight:600}}>NOMINAL</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,fontFamily:'JetBrains Mono',fontSize:12}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'var(--on-surface-var)'}}>Cooling System</span>
              <span style={{color:'var(--tertiary)'}}>ACTIVE</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'var(--on-surface-var)'}}>Pressure Nodes</span>
              <span style={{color:'var(--tertiary)'}}>STABLE</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{color:'var(--on-surface-var)'}}>Heat Exchangers</span>
              <span style={{color:'var(--primary)'}}>NOMINAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Batch processing + right alerts */}
      <div className="grid-12">
        <div className="col-8 panel">
          <div className="panel-header">
            <span className="panel-title">
              <Icon name="factory" /> Batch Processing Status
            </span>
            <div style={{display:'flex',gap:8}}>
              <span className="label-caps" style={{background:'var(--surface-highest)',padding:'4px 10px',borderRadius:20,color:'var(--on-surface-var)'}}>LIVE TELEMETRY</span>
              <span className="label-caps" style={{background:'rgba(255,220,161,0.1)',padding:'4px 10px',borderRadius:20,color:'var(--primary)',border:'1px solid rgba(255,220,161,0.2)'}}>
                {alerts.length > 0 ? `${alerts.length} ACTIVE BATCHES` : '6 ACTIVE BATCHES'}
              </span>
            </div>
          </div>

          {throughput.length === 0 ? (
            <>
              {/* Static mock batches until real data arrives */}
              {[
                {id:'RX-9902-A', name:'Heavy Crude Fractionation',   pct:78, color:'var(--primary)',    temp:'342°C', pres:'12.4 PSI', flow:'450 BBL/m', ok:true},
                {id:'RX-9904-C', name:'Light Sweet Stabilization',    pct:32, color:'var(--secondary)', temp:'210°C', pres:'8.1 PSI',  flow:'280 BBL/m', ok:true},
                {id:'RX-9882-B', name:'Naphtha Hydrotreating',        pct:12, color:'var(--error)',     temp:'45°C',  pres:'2.4 PSI',  flow:'0 BBL/m',   ok:false},
              ].map(b => (
                <div key={b.id} className="batch-card">
                  <div className="batch-header">
                    <div>
                      <div className="batch-id">BATCH ID: {b.id}</div>
                      <div className="batch-name">{b.name}</div>
                    </div>
                    <span className="batch-status" style={{color: b.ok ? b.color : 'var(--error)'}}>
                      {b.ok ? `${b.pct}% Complete` : 'CRITICAL DELAY'}
                    </span>
                  </div>
                  <div className="batch-bar">
                    <div className="batch-fill glow-gold" style={{width:`${b.pct}%`, background:b.color}} />
                  </div>
                  <div className="batch-metrics">
                    <div><span className="bm-label">TEMP</span><span className="bm-val">{b.temp}</span></div>
                    <div><span className="bm-label">PRESSURE</span><span className="bm-val">{b.pres}</span></div>
                    <div><span className="bm-label">THROUGHPUT</span><span className="bm-val">{b.flow}</span></div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            throughput.slice(0,4).map((r,i) => (
              <div key={i} className="batch-card">
                <div className="batch-header">
                  <div>
                    <div className="batch-id">REFINERY: {r.refineryId||'WARRI-01'}</div>
                    <div className="batch-name">Crude Processing Run</div>
                  </div>
                  <span className="batch-status" style={{color:'var(--tertiary)'}}>
                    {fmtNum(r.totalBarrels)} BBL
                  </span>
                </div>
                <div className="batch-bar">
                  <div className="batch-fill glow-gold" style={{width:'78%',background:'var(--primary-dim)'}} />
                </div>
                <div className="batch-metrics">
                  <div><span className="bm-label">DIESEL</span><span className="bm-val">{fmtNum(r.diesel)} bbl</span></div>
                  <div><span className="bm-label">PETROL</span><span className="bm-val">{fmtNum(r.petrol)} bbl</span></div>
                  <div><span className="bm-label">LPG</span><span className="bm-val">{fmtNum(r.lpg)} bbl</span></div>
                </div>
              </div>
            ))
          )}

          {/* ClickHouse outbound trends chart (visual) */}
          <div style={{marginTop:16}}>
            <div className="label-caps" style={{color:'var(--on-surface-var)',marginBottom:10}}>ClickHouse shipment_view | Outbound Trends</div>
            <div style={{height:80,background:'rgba(6,14,32,0.5)',borderRadius:'var(--radius-lg)',border:'1px solid rgba(81,69,50,0.1)',display:'flex',alignItems:'flex-end',padding:'8px 12px',gap:4,overflow:'hidden'}}>
              {throughput.length > 0
                ? throughput.slice(0,12).map((r,i)=>(
                    <div key={i} style={{flex:1,background:`rgba(255,186,32,${0.3+i*0.05})`,borderRadius:'2px 2px 0 0',height:`${30+(i*5)}px`,transition:'height 0.5s'}} />
                  ))
                : [40,55,35,70,50,80,45,65,55,90,60,85].map((h,i)=>(
                    <div key={i} style={{flex:1,background:`rgba(${i%3===0?'141,205,255':'255,186,32'},${0.3+i*0.04})`,borderRadius:'2px 2px 0 0',height:`${h}%`}} />
                  ))
              }
            </div>
          </div>
        </div>

        {/* Right: Critical alerts + revenue */}
        <div className="col-4 panel" style={{display:'flex',flexDirection:'column'}}>
          <div className="panel-header">
            <span className="panel-title" style={{color:'var(--on-surface)',fontSize:15}}>
              <Icon name="gpp_maybe" style={{color:'var(--error)'}} /> Critical Alerts
            </span>
          </div>
          <div style={{flex:1,overflowY:'auto',marginBottom:16}}>
            {crudeEvents.slice(0,6).map((ev,i)=>(
              <div key={i} className="alert-item ai-primary">
                <div className="alert-item-header">
                  <span className="alert-item-tag" style={{color:'var(--primary)'}}>BARREL RECEIVED</span>
                  <span className="alert-item-time">{fmt(ev.ts)}</span>
                </div>
                <div className="alert-item-desc">
                  {ev.payload?.terminal || 'Terminal'} — {fmtNum(ev.payload?.barrels||0)} bbl received
                </div>
              </div>
            ))}
            {crudeEvents.length === 0 && (
              <>
                {[
                  {tag:'PRESSURE EXCURSION', t:'14:32:01', cls:'ai-error', c:'var(--error)', desc:'Tank 402 high-pressure warning. Ventilation bypass engaged.'},
                  {tag:'MAINTENANCE NOTICE', t:'13:10:45', cls:'ai-primary', c:'var(--primary)', desc:'Node Cluster 04 entering calibration mode. Backup nodes ready.'},
                  {tag:'SENSOR DISCONNECT', t:'12:55:22', cls:'ai-secondary', c:'var(--secondary)', desc:'Refinery Section C telemetry loss. Manual visual check required.'},
                  {tag:'BATCH FAILURE', t:'12:04:10', cls:'ai-error', c:'var(--error)', desc:'Batch RX-9882-B hydrotreating halted. Catalyst saturation reached.'},
                ].map((a,i)=>(
                  <div key={i} className={`alert-item ${a.cls}`}>
                    <div className="alert-item-header">
                      <span className="alert-item-tag" style={{color:a.c}}>{a.tag}</span>
                      <span className="alert-item-time">{a.t}</span>
                    </div>
                    <div className="alert-item-desc">{a.desc}</div>
                  </div>
                ))}
              </>
            )}
          </div>
          <div style={{paddingTop:12,borderTop:'1px solid rgba(81,69,50,0.15)'}}>
            <div className="label-caps" style={{color:'var(--on-surface-var)',marginBottom:10,fontSize:9}}>REVENUE BY PRODUCT</div>
            {(revenue.length > 0 ? revenue : [
              {product:'DIESEL',  invoiceCount:12, revenue:280000},
              {product:'PETROL',  invoiceCount:8,  revenue:190000},
              {product:'LPG',     invoiceCount:5,  revenue:72000},
              {product:'KEROSENE',invoiceCount:3,  revenue:48000},
            ]).map((r,i)=>(
              <div key={i} className="rev-row">
                <span className="rev-product">{r.product}</span>
                <span className="rev-count">{r.invoiceCount} inv.</span>
                <span className="rev-amount">${fmtNum(r.revenue||0,2)}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,fontFamily:'JetBrains Mono',fontSize:10,color:'var(--on-surface-var)',display:'flex',alignItems:'center',gap:6}}>
            <span className="led led-green" style={{width:6,height:6}} />
            SYNCED TO CLICKHOUSE CLUSTER
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
function PipelineView({ leakAlerts, pipelineData, eventFeed }) {
  const PIPES = ['PIPE-WARRI-01','PIPE-LAGOS-02','PIPE-PH-03','PIPE-KADUNA-04']
  const latest = {}
  for (const r of pipelineData) {
    if (!latest[r.pipelineId] || r.recordedAt > latest[r.pipelineId].recordedAt) latest[r.pipelineId] = r
  }
  function sColor(s) { return s==='NORMAL'?'var(--tertiary)':s==='DEGRADED'?'var(--primary-dim)':'var(--error)' }

  const pipeEvents = eventFeed.filter(e=>e.topic?.startsWith('pipeline.'))

  return (
    <div className="page-content" style={{display:'flex',flexDirection:'column',gap:'var(--gutter)'}}>

      {leakAlerts.length > 0 && (
        <div style={{background:'rgba(147,0,10,0.12)',border:'1px solid rgba(255,180,171,0.3)',borderRadius:'var(--radius-lg)',padding:'12px 16px',display:'flex',alignItems:'center',gap:12,animation:'pulse 1.5s ease-in-out infinite'}}>
          <Icon name="warning" style={{color:'var(--error)',fontSize:22}} />
          <span style={{fontFamily:'JetBrains Mono',fontSize:12,fontWeight:700,color:'var(--error)'}}>
            ACTIVE LEAK ALERTS: {leakAlerts.length} — Immediate action required!
          </span>
        </div>
      )}

      {/* Pipeline SVG map */}
      <div className="pipeline-map">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{position:'absolute',inset:0,width:'100%',height:'100%'}} viewBox="0 0 1000 320">
          {/* Main pipeline path */}
          <path d="M80,160 L240,160 L380,80 L620,80 L760,200 L900,200"
            fill="none" stroke="#ffdca1" strokeDasharray="12,6" strokeWidth="3" opacity="0.7">
            <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="2s" repeatCount="indefinite"/>
          </path>
          {/* Secondary branch */}
          <path d="M380,80 L380,240 L620,240 L760,200"
            fill="none" stroke="#8dcdff" strokeDasharray="8,5" strokeWidth="2" opacity="0.45">
            <animate attributeName="stroke-dashoffset" from="0" to="-13" dur="2.5s" repeatCount="indefinite"/>
          </path>
          {/* Node dots */}
          <circle cx="80"  cy="160" r="7" fill="#ffba20" className="glow-gold"/>
          <circle cx="240" cy="160" r="7" fill="#ffba20"/>
          <circle cx="380" cy="80"  r="9" fill="#ffb4ab"/>
          <circle cx="620" cy="80"  r="7" fill="#ffba20"/>
          <circle cx="760" cy="200" r="7" fill="#ffba20"/>
          <circle cx="900" cy="200" r="7" fill="#4cff8f" className="glow-green"/>
          <circle cx="380" cy="240" r="7" fill="#8dcdff"/>
          <circle cx="620" cy="240" r="7" fill="#4cff8f"/>
          {/* Labels */}
          <text x="55"  y="148" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">WARRI-01</text>
          <text x="215" y="148" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">LAGOS-02</text>
          <text x="355" y="68"  fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="9">SECTOR-4</text>
          <text x="600" y="68"  fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">PH-03</text>
          <text x="730" y="218" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">KADUNA-04</text>
          <text x="870" y="218" fill="#d5c4ab" fontFamily="JetBrains Mono" fontSize="9">TERMINAL</text>
        </svg>

        {/* Overlay telemetry card */}
        <div className="pipe-overlay-card">
          <div>
            <div className="label-caps" style={{color:'var(--on-surface-var)',fontSize:9}}>NODE ALPHA-9</div>
            <div className="data-lg" style={{color:'var(--primary)',fontSize:18}}>
              {latest['PIPE-LAGOS-02'] ? `${fmtNum(latest['PIPE-LAGOS-02'].flowRateBph)} BBL/m` : '1,419 BBL/m'}
            </div>
          </div>
          <div className="poc-divider" />
          <div>
            <div className="label-caps" style={{color:'var(--on-surface-var)',fontSize:9}}>TEMP</div>
            <div className="data-lg" style={{color:'var(--tertiary)',fontSize:18}}>
              {latest['PIPE-LAGOS-02'] ? `${latest['PIPE-LAGOS-02'].tempCelsius?.toFixed(1)}°C` : '42.4°C'}
            </div>
          </div>
        </div>

        {leakAlerts.length > 0 && (
          <div className="pipe-leak-banner">
            <Icon name="warning" style={{color:'var(--error)',fontSize:20}} className="animate-pulse" />
            <div>
              <div className="label-caps" style={{color:'var(--error)',fontSize:9}}>LEAK ALERT: SECTOR 4</div>
              <div style={{fontSize:12,color:'var(--on-surface)'}}>
                {leakAlerts[0]?.pipelineId} — Pressure drop {leakAlerts[0]?.pressureDrop?.toFixed(1)} PSI
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline status cards */}
      <div className="pipe-grid">
        {PIPES.map(pid=>{
          const d = latest[pid]
          const status = d?.status || 'NORMAL'
          const flow   = d?.flowRateBph || 0
          const pct    = Math.min(100, (flow/6500)*100)
          const col    = sColor(status)
          return (
            <div key={pid} className="pipe-card" style={{'--pc-color':col}}>
              <div className="pipe-card-header">
                <span className="pipe-card-id"><Icon name="settings_input_component" style={{fontSize:14,marginRight:4}} />{pid.replace('PIPE-','')}</span>
                <span className="pipe-status-pill" style={{background:col}}>{status}</span>
              </div>
              <div>
                <span className="pipe-metric-label">Flow Rate</span>
                <span className="pipe-metric-val" style={{color:col}}>{flow>0?fmtNum(flow):'—'} bph</span>
              </div>
              <div className="pipe-flow-bar">
                <div className="pipe-flow-fill" style={{width:`${pct}%`,background:col}} />
              </div>
              <div className="pipe-row">
                <div>
                  <span className="pipe-metric-label">Pressure</span>
                  <span className="pipe-metric-val" style={{fontSize:13}}>{d?.pressurePsi?.toFixed(1)||'—'} PSI</span>
                </div>
                <div>
                  <span className="pipe-metric-label">Segment</span>
                  <span className="pipe-metric-val" style={{fontSize:13}}>{d?.segmentId||'—'}</span>
                </div>
              </div>
              {d && <div className="pipe-updated">Updated {relTime(d.recordedAt)}</div>}
            </div>
          )
        })}
      </div>

      {/* Alerts + Logistics shipments */}
      <div className="grid-12">
        <div className="col-4 panel" style={{display:'flex',flexDirection:'column'}}>
          <div className="panel-header">
            <span className="panel-title">
              <Icon name="notifications_active" /> ALERTS
            </span>
            <span style={{background:'rgba(255,180,171,0.15)',color:'var(--error)',padding:'2px 8px',borderRadius:4,fontFamily:'JetBrains Mono',fontSize:10,fontWeight:700}}>
              LIVE FEED
            </span>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {pipeEvents.slice(0,6).map((ev,i)=>{
              const isLeak = ev.topic==='pipeline.leak-alert.critical'
              return (
                <div key={i} className={`alert-item ${isLeak?'ai-error':'ai-secondary'}`}>
                  <div className="alert-item-header">
                    <span className="alert-item-tag" style={{color:isLeak?'var(--error)':'var(--secondary)'}}>{ev.topic.toUpperCase()}</span>
                    <span className="alert-item-time">{fmt(ev.ts)}</span>
                  </div>
                  <div className="alert-item-desc">
                    {isLeak
                      ? `${ev.payload?.pipelineId} — ${ev.payload?.severity} leak at km ${ev.payload?.segmentKm?.toFixed(1)}`
                      : `${ev.payload?.pipelineId}/${ev.payload?.segmentId} — ${ev.payload?.flowRateBph?.toFixed(0)} bph`
                    }
                  </div>
                </div>
              )
            })}
            {pipeEvents.length === 0 && (
              <>
                {[
                  {c:'ai-error',    col:'var(--error)',     tag:'PIPELINE.LEAK-ALERT.CRITICAL',    t:'04:12', desc:'Critical pressure loss at Pumping Station 04. Automatic containment sequence initiated.'},
                  {c:'ai-secondary',col:'var(--secondary)', tag:'PIPELINE.FLOW-UPDATED.STANDARD',   t:'03:55', desc:'Flow rate at Keystone-A increased to 92% capacity following terminal approval.'},
                  {c:'ai-dim',      col:'var(--outline)',   tag:'SYSTEM.CHECK.SUCCESS',             t:'03:30', desc:'Daily integrity scan completed. No anomalies found in sectors 1-3.'},
                ].map((a,i)=>(
                  <div key={i} className={`alert-item ${a.c}`}>
                    <div className="alert-item-header">
                      <span className="alert-item-tag" style={{color:a.col}}>{a.tag}</span>
                      <span className="alert-item-time">{a.t}</span>
                    </div>
                    <div className="alert-item-desc">{a.desc}</div>
                  </div>
                ))}
              </>
            )}
          </div>
          <button style={{marginTop:12,width:'100%',padding:'8px',border:'1px solid rgba(81,69,50,0.3)',background:'none',color:'var(--on-surface-var)',fontFamily:'JetBrains Mono',fontSize:10,fontWeight:700,letterSpacing:'0.06em',cursor:'pointer',borderRadius:'var(--radius)',transition:'background 0.15s'}}
            onMouseOver={e=>e.target.style.background='var(--surface-highest)'}
            onMouseOut={e=>e.target.style.background='none'}>
            CLEAR ALL ACKNOWLEDGED
          </button>
        </div>

        <div className="col-8 panel">
          <div className="panel-header">
            <span className="panel-title panel-title-secondary">
              <Icon name="local_shipping" /> LOGISTICS: SHIPMENT_VIEW
            </span>
            <div style={{display:'flex',gap:8}}>
              <Icon name="filter_list" style={{color:'var(--on-surface-var)',cursor:'pointer',fontSize:20}} />
              <Icon name="download"    style={{color:'var(--on-surface-var)',cursor:'pointer',fontSize:20}} />
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>DESTINATION</th><th>PRODUCT</th>
                  <th style={{textAlign:'right'}}>VOLUME (L)</th>
                  <th>STATUS</th><th style={{textAlign:'right'}}>ETA (h)</th>
                </tr>
              </thead>
              <tbody>
                {leakAlerts.length === 0 && pipelineData.length === 0 ? (
                  <>
                    {[
                      {id:'KC-9921',dest:'Plot 14 Apapa, Lagos',        prod:'DIESEL',   vol:'450,000', st:'TRANSIT',  stc:'led-blue', eta:'14:20Z'},
                      {id:'KC-9922',dest:'KM 5 Warri-Sapele Road',     prod:'LPG',      vol:'1,200,000',st:'LOADING', stc:'led-green',eta:'--:--'},
                      {id:'KC-9884',dest:'Trans-Amadi, Port Harcourt', prod:'PETROL',   vol:'25,000',  st:'QUEUED',   stc:'led-dim',  eta:'08/14'},
                    ].map((r,i)=>(
                      <tr key={i}>
                        <td className="td-id">#{r.id}</td>
                        <td>{r.dest}</td>
                        <td>{r.prod}</td>
                        <td className="td-right">{r.vol}</td>
                        <td><span className="status-chip"><span className={`led ${r.stc}`} />{r.st}</span></td>
                        <td className="td-right">{r.eta}</td>
                      </tr>
                    ))}
                  </>
                ) : (
                  eventFeed.filter(e=>e.topic?.startsWith('logistics.')).slice(0,8).map((e,i)=>(
                    <tr key={i}>
                      <td className="td-id">{e.payload?.shipmentId?.slice(0,10)||'—'}</td>
                      <td>{e.payload?.destination?.split(',')[0]||'—'}</td>
                      <td>{e.payload?.product||'—'}</td>
                      <td className="td-right">{fmtNum(e.payload?.quantityLtrs||0)}</td>
                      <td><span className="status-chip"><span className="led led-blue" />TRANSIT</span></td>
                      <td className="td-right">{e.payload?.etaHours?.toFixed(1)||'—'}h</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div style={{marginTop:8,fontFamily:'JetBrains Mono',fontSize:10,color:'var(--on-surface-var)',textAlign:'right'}}>SOURCE: CLICKHOUSE_BACKBONE</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADING
// ─────────────────────────────────────────────────────────────────────────────
function TradingView({ prices, deals }) {
  const [execForm, setExecForm] = useState({ instrument:'WTI_CRUDE_FRONT', qty:'100', price:'' })

  const priceList = [
    {id:'BRENT_CRUDE', label:'BRENT_ICE',     ticker:'BRN12',    unit:'/bbl'},
    {id:'WTI_CRUDE',   label:'WTI_HOUSTON',   ticker:'CLU24',    unit:'/bbl'},
    {id:'DIESEL',      label:'DIESEL_SWAP',   ticker:'DSL_SPOT', unit:'/L' },
    {id:'PETROL',      label:'PETROL_SPOT',   ticker:'PTL_SPOT', unit:'/L' },
    {id:'LPG',         label:'LPG_SWAP',      ticker:'LPG_V4',   unit:'/kg'},
    {id:'KEROSENE',    label:'KEROSENE_SPOT', ticker:'KER_SPOT', unit:'/L' },
  ]

  const newsItems = [
    'WTI CRUDE FUTURE AT $78.42 (-0.4%) AS INVENTORIES RISE',
    'OPEC+ MEETING EXPECTED TO EXTEND VOLUNTARY CUTS THROUGH Q3',
    'BRENT CRUDE SPOT GAINS 0.8% ON NIGERIA PIPELINE DISRUPTION',
    'KYLE CORP EXECUTES 500K BBL BLOCK TRADE — LARGEST THIS QUARTER',
    'NATURAL GAS FUTURES FALL 2.1% ON MILD WEATHER FORECAST',
  ]

  const totalPortfolio = deals.reduce((s,d)=>{
    const sign = d.side==='BUY' ? 1 : -1
    return s + sign * (d.quantity||0) * (d.priceUsd||0)
  }, 12482900)

  return (
    <div className="page-content" style={{display:'flex',flexDirection:'column',gap:'var(--gutter)'}}>

      {/* Bloomberg-style market news ticker */}
      <div className="ticker-wrapper">
        <div className="ticker-label">
          <span className="led led-gold animate-pulse" style={{marginRight:6}} />
          <span>MARKET NEWS</span>
        </div>
        <div className="ticker-track">
          <div className="ticker-inner">
            {[...newsItems,...newsItems].map((n,i)=>(
              <span key={i} style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--on-surface)',whiteSpace:'nowrap',padding:'0 24px',borderRight:'1px solid rgba(81,69,50,0.2)'}}>
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3-col layout */}
      <div className="grid-12">
        {/* Price table */}
        <div className="col-4 panel">
          <div className="panel-header">
            <span className="panel-title"><Icon name="candlestick_chart" /> Crude Grades</span>
            <span className="label-caps" style={{color:'var(--on-surface-var)',fontSize:9}}>LIVE SEC: 240ms</span>
          </div>
          <table className="price-table">
            <thead>
              <tr>
                <th>INSTRUMENT</th>
                <th style={{textAlign:'right'}}>PRICE</th>
                <th style={{textAlign:'right'}}>CHG%</th>
              </tr>
            </thead>
            <tbody>
              {priceList.map(p=>{
                const tick = prices[p.id]
                const chg  = tick?.change24h||0
                const curPrice = tick?.midPrice
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="pt-id" style={{fontSize:12}}>{p.label}</div>
                      <div style={{fontSize:10,color:'var(--on-surface-var)'}}>{p.ticker}</div>
                    </td>
                    <td className="td-right pt-price">
                      {curPrice ? (p.unit==='/bbl' ? curPrice.toFixed(2) : curPrice.toFixed(4)) : '—'}
                    </td>
                    <td className={`td-right ${chg>=0?'pt-up':'pt-dn'}`}>
                      {chg>=0?'+':''}{chg.toFixed(2)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Execute order */}
          <div style={{marginTop:20,borderTop:'1px solid rgba(81,69,50,0.15)',paddingTop:16}}>
            <div className="label-caps" style={{color:'var(--on-surface-var)',marginBottom:12}}>Execute Order</div>
            <div className="exec-form">
              <div>
                <label className="field-label">Instrument</label>
                <select className="field-select" value={execForm.instrument} onChange={e=>setExecForm(f=>({...f,instrument:e.target.value}))}>
                  {priceList.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div>
                  <label className="field-label">Quantity (Lots)</label>
                  <input className="field-input" value={execForm.qty} onChange={e=>setExecForm(f=>({...f,qty:e.target.value}))} />
                </div>
                <div>
                  <label className="field-label">Price ($)</label>
                  <input className="field-input" value={execForm.price||prices[execForm.instrument]?.midPrice?.toFixed(2)||''} onChange={e=>setExecForm(f=>({...f,price:e.target.value}))} placeholder="Market" />
                </div>
              </div>
              <div className="exec-btn-row">
                <button className="btn-buy">BUY / LONG</button>
                <button className="btn-sell">SELL / SHORT</button>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio performance chart */}
        <div className="col-4 panel" style={{display:'flex',flexDirection:'column'}}>
          <div style={{marginBottom:8}}>
            <div className="label-caps" style={{color:'var(--on-surface-var)',marginBottom:4}}>Portfolio Performance</div>
            <div className="label-caps" style={{color:'var(--on-surface-var)',fontSize:9}}>AGGREGATE SPOT &amp; FUTURES EXPOSURE</div>
          </div>
          <div style={{fontFamily:'JetBrains Mono',fontSize:36,fontWeight:700,color:'var(--tertiary)',lineHeight:1,marginBottom:4}}>
            ${fmtNum(totalPortfolio, 2)}
          </div>
          <div style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--tertiary)',marginBottom:16}}>+4.2% (WEEKLY)</div>

          {/* Fake chart — SVG wave */}
          <div style={{flex:1,minHeight:120,position:'relative',overflow:'hidden',borderRadius:'var(--radius)'}}>
            <svg width="100%" height="100%" viewBox="0 0 400 140" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#ffba20" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#ffba20" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0,120 C40,115 60,90 100,80 C140,70 160,95 200,85 C240,75 260,50 300,40 C340,30 370,55 400,30"
                fill="none" stroke="#ffba20" strokeWidth="2"/>
              <path d="M0,120 C40,115 60,90 100,80 C140,70 160,95 200,85 C240,75 260,50 300,40 C340,30 370,55 400,30 L400,140 L0,140 Z"
                fill="url(#chartGrad)"/>
            </svg>
            <div style={{position:'absolute',bottom:4,right:8,fontFamily:'JetBrains Mono',fontSize:9,color:'var(--on-surface-var)'}}>
              LAST UPDATED: {new Date().toISOString().slice(0,10)} {fmt(Date.now())} UTC
            </div>
          </div>

          {/* Revenue table */}
          <div style={{marginTop:16,borderTop:'1px solid rgba(81,69,50,0.15)',paddingTop:12}}>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
              <Icon name="database" style={{fontSize:16,color:'var(--secondary)'}} />
              <span className="label-caps" style={{color:'var(--secondary)',fontSize:10}}>revenue_view | ClickHouse Nodes</span>
              <span className="label-caps" style={{fontSize:9,color:'var(--tertiary)',marginLeft:'auto'}}>NODE_ALPHA: ONLINE</span>
            </div>
            <table className="data-table" style={{fontSize:11}}>
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>CONTRACT_ID</th>
                  <th style={{textAlign:'right'}}>VOLUME</th>
                  <th style={{textAlign:'right'}}>GROSS_REV ($)</th>
                  <th style={{textAlign:'right'}}>NET_MARGIN</th>
                </tr>
              </thead>
              <tbody>
                {deals.slice(0,5).map((d,i)=>(
                  <tr key={i}>
                    <td>{fmt(d.executedAt||d.ts)}</td>
                    <td>{d.product?.replace('_','-')}-{d.dealId?.slice(5,9)||'F'}</td>
                    <td className="td-right">{fmtNum(d.quantity||0)}</td>
                    <td className="td-right">{fmtNum((d.quantity||0)*(d.priceUsd||0),2)}</td>
                    <td className={`td-right ${Math.random()>0.2?'pt-up':'pt-dn'}`}>
                      {(10+Math.random()*8).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {deals.length === 0 && [
                  ['14:31:05','WTI-JUL-24-F','50,000','3,921,000.00','14.2%','pt-up'],
                  ['14:29:44','BRN-AUG-24-C','12,500','1,027,375.00','11.8%','pt-up'],
                  ['14:28:12','OIL-SPOT-DUB','100,000','7,988,000.00','-2.1%','pt-dn'],
                  ['14:25:30','WTI-HOU-BAS','25,000','1,960,500.00','16.5%','pt-up'],
                ].map(([t,c,v,g,m,mc],i)=>(
                  <tr key={i}>
                    <td>{t}</td><td>{c}</td>
                    <td className="td-right">{v}</td>
                    <td className="td-right">{g}</td>
                    <td className={`td-right ${mc}`}>{m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Execution stream */}
        <div className="col-4 panel" style={{display:'flex',flexDirection:'column'}}>
          <div className="panel-header">
            <span className="panel-title"><Icon name="bolt" /> Execution Stream</span>
            <Icon name="tune" style={{color:'var(--outline)',cursor:'pointer',fontSize:20}} />
          </div>
          <div className="deal-feed" style={{flex:1}}>
            {deals.slice(0,12).map((d,i)=>(
              <div key={i} className={`deal-row ${d.side==='BUY'?'dr-buy':'dr-sell'}`}>
                <span className="dr-side">{d.side}</span>
                <span className="dr-product">{d.product?.replace('_',' ')}</span>
                <span className="dr-num">{fmtNum(d.quantity||0)}</span>
                <span className="dr-price">${(d.priceUsd||0).toFixed(2)}</span>
                <span className="dr-time">{fmt(d.executedAt||d.ts)}</span>
              </div>
            ))}
            {deals.length === 0 && (
              <>
                <div style={{padding:'10px 12px',background:'rgba(147,0,10,0.08)',border:'1px solid rgba(255,180,171,0.15)',borderLeft:'3px solid var(--error)',borderRadius:'var(--radius)',marginBottom:8,animation:'fadeSlideIn 0.3s ease-out'}}>
                  <div className="label-caps" style={{fontSize:9,color:'var(--error)',marginBottom:4}}>DEAL EXECUTED — CRITICAL</div>
                  <div style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--on-surface)'}}>Large block trade detected: 500k BBL WTI_JUN at 78.45. Kyle Corp Exposure increased.</div>
                  <div style={{display:'flex',gap:16,marginTop:6,fontFamily:'JetBrains Mono',fontSize:10,color:'var(--on-surface-var)'}}>
                    <span>TRADER: AUTO_01</span><span>SLIPPAGE: 0.002%</span>
                  </div>
                </div>
                {[
                  {t:'MARGIN UPDATE', time:'14:31:55', desc:'Collateral re-indexed for Midland hub storage contracts.'},
                  {t:'ORDER FILL',    time:'14:30:40', desc:'WTI_HOUSTON_DIFF filled: 20 lots at +$0.15 index.'},
                ].map((e,i)=>(
                  <div key={i} style={{padding:'10px 12px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(81,69,50,0.15)',borderLeft:'3px solid var(--primary)',borderRadius:'var(--radius)',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span className="label-caps" style={{fontSize:9,color:'var(--primary)'}}>{e.t}</span>
                      <span style={{fontFamily:'JetBrains Mono',fontSize:10,color:'var(--on-surface-var)'}}>{e.time}</span>
                    </div>
                    <div style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--on-surface)'}}>{e.desc}</div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Market Volatility gauge */}
          <div style={{marginTop:16,borderTop:'1px solid rgba(81,69,50,0.15)',paddingTop:12}}>
            <div className="label-caps" style={{color:'var(--on-surface-var)',marginBottom:10}}>Market Volatility (VIX_OIL)</div>
            <div style={{display:'flex',gap:16,alignItems:'center'}}>
              <div style={{position:'relative',width:80,height:80}}>
                <svg viewBox="0 0 80 80" width="80" height="80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-highest)" strokeWidth="8"/>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--primary-dim)" strokeWidth="8"
                    strokeDasharray={`${34.2*2*Math.PI*0.56} ${34.2*2*Math.PI*0.44}`}
                    strokeLinecap="round" transform="rotate(-90 40 40)" className="glow-gold"/>
                  <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
                    fill="var(--primary)" fontFamily="JetBrains Mono" fontSize="16" fontWeight="700">34.2</text>
                  <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle"
                    fill="var(--error)" fontFamily="JetBrains Mono" fontSize="8" fontWeight="700">HIGH</text>
                </svg>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6,fontFamily:'JetBrains Mono',fontSize:11}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:20}}><span style={{color:'var(--on-surface-var)'}}>Historical Avg</span><span>22.5</span></div>
                <div style={{display:'flex',justifyContent:'space-between',gap:20}}><span style={{color:'var(--on-surface-var)'}}>12h Peak</span><span style={{color:'var(--error)'}}>38.9</span></div>
                <div style={{height:4,background:'var(--surface-highest)',borderRadius:2,marginTop:4}}>
                  <div style={{height:'100%',width:'88%',background:'var(--primary-dim)',borderRadius:2}} className="glow-gold" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────
function SafetyView({ incidents }) {
  const counts = {CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0}
  for (const inc of incidents) counts[inc.severity] = (counts[inc.severity]||0)+1

  const lti    = (incidents.filter(i=>i.injuredCount>0).length/Math.max(incidents.length,1)*0.02).toFixed(3)
  const daysSafe = Math.floor((Date.now() - new Date('2024-10-25').getTime())/86400000)

  return (
    <div className="page-content" style={{display:'flex',flexDirection:'column',gap:'var(--gutter)'}}>

      {/* Severity counter cards */}
      <div className="sev-grid">
        <div className="sev-card" style={{'--sv-color':'var(--on-surface-var)'}}>
          <span className="sev-num">{incidents.length}</span>
          <span className="sev-lbl">Total Incidents</span>
        </div>
        <div className="sev-card" style={{'--sv-color':'var(--error)'}}>
          <span className="sev-num">{counts.CRITICAL}</span>
          <span className="sev-lbl">Critical</span>
        </div>
        <div className="sev-card" style={{'--sv-color':'#f97316'}}>
          <span className="sev-num">{counts.HIGH}</span>
          <span className="sev-lbl">High</span>
        </div>
        <div className="sev-card" style={{'--sv-color':'var(--primary-dim)'}}>
          <span className="sev-num">{counts.MEDIUM}</span>
          <span className="sev-lbl">Medium</span>
        </div>
        <div className="sev-card" style={{'--sv-color':'var(--tertiary)'}}>
          <span className="sev-num">{counts.LOW}</span>
          <span className="sev-lbl">Low</span>
        </div>
      </div>

      <div className="grid-12">
        {/* HSE Incident Board */}
        <div className="col-8 panel">
          <div className="panel-header">
            <span className="panel-title"><Icon name="gpp_maybe" /> HSE Incident Board</span>
            <span style={{background:'rgba(255,180,171,0.15)',color:'var(--error)',padding:'2px 8px',borderRadius:4,fontFamily:'JetBrains Mono',fontSize:10,fontWeight:700}}>
              LIVE FEED
            </span>
          </div>
          {incidents.length === 0 ? (
            <div className="empty-state">
              <Icon name="check_circle" style={{fontSize:40,color:'var(--tertiary)',display:'block',marginBottom:8}} />
              No incidents reported.<br/>All operations running safely.
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>TIME</th><th>TYPE</th><th>SEVERITY</th>
                    <th>LOCATION</th><th>REPORTER</th><th>DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc,i)=>(
                    <tr key={i}>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:11}}>{fmt(inc.reportedAt||inc.ts)}</td>
                      <td>
                        <span style={{display:'flex',alignItems:'center',gap:6}}>
                          <Icon name={INC_ICONS[inc.type]||'warning'} style={{fontSize:14,color:SEV_COLOR[inc.severity]}} />
                          <span style={{fontSize:12}}>{inc.type?.replace('_',' ')}</span>
                        </span>
                      </td>
                      <td><span style={{fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,color:SEV_COLOR[inc.severity]}}>{inc.severity}</span></td>
                      <td style={{fontSize:11,color:'var(--on-surface-var)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inc.location}</td>
                      <td style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--secondary)'}}>{inc.reportedBy}</td>
                      <td style={{fontSize:11,color:'var(--on-surface-var)'}}>
                        {inc.barrelsSpilled != null && `${inc.barrelsSpilled} bbl`}
                        {inc.injuredCount   != null && ` ${inc.injuredCount} inj.`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Compliance panel */}
        <div className="col-4 panel" style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="panel-header">
            <span className="panel-title panel-title-tertiary"><Icon name="verified_user" /> COMPLIANCE: INCIDENT_VIEW</span>
          </div>

          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              {label:'LTI RATE',  val:lti,      color:'var(--on-surface)'},
              {label:'OSHA INDEX',val:'A+',      color:'var(--tertiary)'},
              {label:'OPEN HAZARDS', val:String(counts.CRITICAL+counts.HIGH), color:counts.CRITICAL+counts.HIGH>0?'var(--error)':'var(--tertiary)'},
              {label:'DAYS SAFE', val:String(daysSafe), color:'var(--tertiary)'},
            ].map((k,i)=>(
              <div key={i} style={{padding:'10px 12px',background:'var(--surface-container)',borderRadius:'var(--radius-lg)',border:'1px solid rgba(81,69,50,0.15)'}}>
                <div className="label-caps" style={{fontSize:9,color:'var(--on-surface-var)',marginBottom:4}}>{k.label}</div>
                <div style={{fontFamily:'JetBrains Mono',fontSize:22,fontWeight:700,color:k.color}}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Compliance items */}
          {[
            {icon:'assignment_turned_in', title:'Annual Integrity Review', desc:'Compliance audit for Northern Corridor scheduled for 08/20. All telemetry logs validated.', tags:['EPA-900','INTERNAL'], col:'var(--tertiary)'},
            {icon:'warning', title:'Personnel Proximity Alert', desc:'Unauthorized device detected within restricted zone of Node Gamma. Security notified.', status:'PENDING REVIEW', col:'var(--error)'},
          ].map((item,i)=>(
            <div key={i} style={{padding:'12px',background:'var(--surface-container)',border:'1px solid rgba(81,69,50,0.15)',borderRadius:'var(--radius-lg)'}}>
              <div style={{display:'flex',gap:10,marginBottom:8}}>
                <Icon name={item.icon} style={{fontSize:20,color:item.col,flexShrink:0}} />
                <div>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{item.title}</div>
                  <div style={{fontSize:12,color:'var(--on-surface-var)',lineHeight:1.4}}>{item.desc}</div>
                </div>
              </div>
              {item.tags && (
                <div style={{display:'flex',gap:6}}>
                  {item.tags.map(t=>(
                    <span key={t} className="label-caps" style={{background:'var(--surface-highest)',color:'var(--on-surface-var)',padding:'2px 8px',borderRadius:20,fontSize:9}}>{t}</span>
                  ))}
                </div>
              )}
              {item.status && (
                <div className="label-caps" style={{fontSize:9,color:'var(--error)',marginTop:6}}>{item.status}</div>
              )}
            </div>
          ))}

          <div style={{borderTop:'1px solid rgba(81,69,50,0.15)',paddingTop:12}}>
            <div className="info-grid" style={{gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {icon:'description', title:'NUPRC Reporting',     desc:'Auto-generates regulatory reports for spills ≥1 barrel within 2h'},
                {icon:'eco',         title:'Emissions Tracking',   desc:'CO₂/NOₓ sensors publish to safety.emissions-reading.bulk every minute'},
                {icon:'lock',        title:'OPA Policy Gate',      desc:'Blocks unmasked PII and GPS coordinates from entering the event catalog'},
                {icon:'bar_chart',   title:'SLO Dashboard',        desc:'TRIR and LTIF stream live into Grafana for executive reporting'},
              ].map((c,i)=>(
                <div key={i} style={{padding:'10px',background:'var(--surface-container)',border:'1px solid rgba(81,69,50,0.12)',borderRadius:'var(--radius-lg)'}}>
                  <Icon name={c.icon} style={{fontSize:18,color:'var(--secondary)',display:'block',marginBottom:6}} />
                  <div style={{fontSize:11,fontWeight:600,marginBottom:4}}>{c.title}</div>
                  <div style={{fontSize:10,color:'var(--on-surface-var)',lineHeight:1.4}}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER PORTAL
// ─────────────────────────────────────────────────────────────────────────────
function CustomerPortal({ orders, onOrderPlaced }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ customerName:'', customerId:'', product:'DIESEL', quantityLtrs:'', deliveryAddress:'', priority:'STANDARD' })
  const [submitting, setSubmitting] = useState(false)
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState(null)

  useEffect(()=>{
    fetch(`${API}/api/products`).then(r=>r.json()).then(setProducts).catch(()=>{})
  },[])

  const handleSubmit = async(e)=>{
    e.preventDefault(); setSubmitting(true); setError(null); setResult(null)
    try {
      const body = { ...form, quantityLtrs:parseFloat(form.quantityLtrs),
        customerId: form.customerId || `CUST-${form.customerName.replace(/\s+/g,'-').toUpperCase().slice(0,8)}` }
      const res = await fetch(`${API}/api/orders`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({ ...data, customerName:form.customerName, product:form.product })
      onOrderPlaced({ ...body, ...data })
      setForm(f=>({...f, quantityLtrs:'', deliveryAddress:''}))
    } catch(err){ setError(err.message) }
    finally { setSubmitting(false) }
  }

  const avail = (products.length > 0 ? products.filter(p=>p.available) : [
    {id:'DIESEL',  name:'Automotive Gas Oil (Diesel)', pricePerUnit:0.92, unit:'L'},
    {id:'PETROL',  name:'Premium Motor Spirit (PMS)',  pricePerUnit:0.78, unit:'L'},
    {id:'LPG',     name:'Liquefied Petroleum Gas',    pricePerUnit:0.65, unit:'kg'},
    {id:'KEROSENE',name:'Dual Purpose Kerosene (DPK)',pricePerUnit:0.58, unit:'L'},
  ])

  return (
    <div className="page-content" style={{display:'flex',flexDirection:'column',gap:'var(--gutter)'}}>
      <div className="grid-12">
        {/* Order form */}
        <div className="col-6 panel">
          <div className="panel-header">
            <span className="panel-title"><Icon name="shopping_cart" /> Place a Product Order</span>
          </div>
          <form className="order-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="field-label">Your Name</label>
              <input className="form-input" required value={form.customerName} onChange={e=>setForm(f=>({...f,customerName:e.target.value}))} placeholder="e.g. Emeka Okafor" />
            </div>
            <div className="form-field">
              <label className="field-label">Company ID (optional)</label>
              <input className="form-input" value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))} placeholder="Auto-generated if blank" />
            </div>
            <div className="form-field">
              <label className="field-label">Product</label>
              <select className="form-select" value={form.product} onChange={e=>setForm(f=>({...f,product:e.target.value}))}>
                {avail.map(p=>(
                  <option key={p.id} value={p.id}>{p.name} — ${p.pricePerUnit}/{p.unit}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="field-label">Quantity ({avail.find(p=>p.id===form.product)?.unit||'units'})</label>
              <input className="form-input" required type="number" min="1" value={form.quantityLtrs} onChange={e=>setForm(f=>({...f,quantityLtrs:e.target.value}))} placeholder="e.g. 5000" />
            </div>
            <div className="form-field">
              <label className="field-label">Delivery Address</label>
              <input className="form-input" required value={form.deliveryAddress} onChange={e=>setForm(f=>({...f,deliveryAddress:e.target.value}))} placeholder="e.g. 14 Broad St, Lagos" />
            </div>
            <div className="form-field">
              <label className="field-label">Priority</label>
              <div className="priority-row">
                {[
                  {key:'STANDARD',  cls:'active-std', label:'🕐 STANDARD (48h)'},
                  {key:'EXPRESS',   cls:'active-exp', label:'⚡ EXPRESS (24h)'},
                  {key:'EMERGENCY', cls:'active-emg', label:'🚨 EMERGENCY (6h)'},
                ].map(p=>(
                  <button key={p.key} type="button"
                    className={`pri-btn ${form.priority===p.key?p.cls:''}`}
                    onClick={()=>setForm(f=>({...f,priority:p.key}))}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="error-banner">{error}</div>}
            <button className="submit-btn" type="submit" disabled={submitting}>
              {submitting ? 'PLACING ORDER...' : '🛢️ PLACE ORDER'}
            </button>
          </form>
        </div>

        {/* Right column */}
        <div className="col-6" style={{display:'flex',flexDirection:'column',gap:'var(--gutter)'}}>
          {result && (
            <div className="success-panel">
              <span className="success-icon">✅</span>
              <div className="success-title">Order Confirmed!</div>
              {[
                ['Order ID',     result.orderId,                              'var(--primary)'],
                ['Product',      result.product,                              null],
                ['Total Value',  `$${fmtNum(result.totalUsd||0,2)}`,         null],
                ['Est. Delivery',`${result.estimatedDeliveryHours}h`,        null],
              ].map(([l,v,c],i)=>(
                <div key={i} className="order-detail-row">
                  <span className="od-label">{l}</span>
                  <span className="od-val" style={c?{color:c}:{}}>{v}</span>
                </div>
              ))}
              <p className="order-note">Your order has entered the Kyle Corp pipeline. Logistics will dispatch from the nearest depot and you'll receive updates via the event stream.</p>
            </div>
          )}

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title"><Icon name="inventory_2" /> Your Recent Orders</span>
            </div>
            {orders.length === 0 ? (
              <div className="empty-state">No orders placed yet in this session.</div>
            ) : (
              <div className="order-list">
                {[...orders].reverse().map(o=>(
                  <div key={o.orderId} className="order-item">
                    <div className="oi-top">
                      <span className="oi-id">{o.orderId}</span>
                      <span className={`status-pill ${
                        o.status==='DELIVERED'?'sp-delivered':
                        o.status==='DISPATCHED'?'sp-dispatched':'sp-processing'
                      }`}>{o.status||'PROCESSING'}</span>
                    </div>
                    <div className="oi-meta">
                      <span>{o.productName||o.product}</span>
                      <span>{fmtNum(o.quantityLtrs)} units</span>
                      <span className="oi-time">{relTime(o.placedAt||Date.now())}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Process flow */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title"><Icon name="account_tree" /> What Happens After You Order</span>
        </div>
        <div className="flow-steps">
          {[
            {icon:'📋', label:'Order Placed',        desc:'Your order enters the customer.order-placed.critical event stream'},
            {icon:'🏭', label:'Refinery Allocates',  desc:'Refinery checks inventory & schedules a processing run'},
            {icon:'🚛', label:'Logistics Dispatches', desc:'Nearest depot assigns vehicle & dispatches shipment'},
            {icon:'📡', label:'Pipeline Monitors',   desc:'Sensors track product movement in real-time'},
            {icon:'✅', label:'Delivery Confirmed',  desc:'Proof of delivery recorded on the event stream'},
            {icon:'💰', label:'Finance Invoices',    desc:'Automated invoice raised and sent to your account'},
          ].map((s,i)=>(
            <div key={i} className="flow-step">
              <span className="step-icon">{s.icon}</span>
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
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,    setActiveTab]    = useState('operations')
  const [liveStatus,   setLiveStatus]   = useState('connecting')

  const [myOrders,     setMyOrders]     = useState([])
  const [eventFeed,    setEventFeed]    = useState([])
  const [domainStats,  setDomainStats]  = useState({})
  const [prices,       setPrices]       = useState({})
  const [deals,        setDeals]        = useState([])
  const [leakAlerts,   setLeakAlerts]   = useState([])
  const [pipelineData, setPipelineData] = useState([])
  const [incidents,    setIncidents]    = useState([])

  // Load analytics from ClickHouse on mount
  useEffect(()=>{
    fetch(`${API}/api/analytics/deals`).then(r=>r.json()).then(setDeals).catch(()=>{})
    fetch(`${API}/api/analytics/pipeline`).then(r=>r.json()).then(setPipelineData).catch(()=>{})
    fetch(`${API}/api/analytics/incidents`).then(r=>r.json()).then(setIncidents).catch(()=>{})
  },[])

  // SSE connection
  useEffect(()=>{
    let es
    function connect() {
      es = new EventSource(`${API}/api/events/stream`)
      es.onopen = ()=>setLiveStatus('live')
      es.onerror = ()=>{ setLiveStatus('reconnecting'); setTimeout(connect,5000) }
      es.addEventListener('connected', ()=>setLiveStatus('live'))

      es.addEventListener('domain_event', (e)=>{
        const data = JSON.parse(e.data)
        const meta = DOMAIN_META[data.topic] || {domain:'Unknown'}
        const ev   = {topic:data.topic, payload:data.payload, ts:new Date(data.ts).toISOString()}

        setEventFeed(f=>[ev,...f].slice(0,50))
        setDomainStats(s=>({
          ...s,
          [meta.domain]: { count:((s[meta.domain]?.count)||0)+1, lastEvent:ev.ts, lastTopic:data.topic }
        }))

        if (data.topic==='trading.price-tick.bulk' && data.payload?.product)
          setPrices(ps=>({...ps,[data.payload.product]:data.payload}))
        if (data.topic==='trading.deal-executed.critical')
          setDeals(d=>[{...data.payload, ts:ev.ts},...d].slice(0,25))
        if (data.topic==='pipeline.leak-alert.critical')
          setLeakAlerts(a=>[{...data.payload, ts:ev.ts},...a].slice(0,20))
        if (data.topic==='pipeline.flow-updated.standard' && data.payload?.pipelineId)
          setPipelineData(pd=>{
            const next=pd.filter(r=>r.pipelineId!==data.payload.pipelineId)
            return [{...data.payload,recordedAt:ev.ts},...next].slice(0,20)
          })
        if (data.topic==='safety.incident-reported.critical')
          setIncidents(inc=>[{...data.payload,ts:ev.ts},...inc].slice(0,15))
      })

      es.addEventListener('order_placed', (e)=>{
        const data = JSON.parse(e.data)
        setEventFeed(f=>[{topic:'customer.order-placed.critical',payload:data,ts:new Date().toISOString()},...f].slice(0,50))
      })
    }
    connect()
    return ()=>es?.close()
  },[])

  const navItems = [
    { id:'operations', icon:'hub',                    label:'COMMAND CENTER' },
    { id:'refinery',   icon:'factory',                label:'REFINERY' },
    { id:'pipeline',   icon:'settings_input_component',label:'PIPELINE' },
    { id:'trading',    icon:'show_chart',             label:'TRADING' },
    { id:'logistics',  icon:'local_shipping',         label:'LOGISTICS' },
    { id:'safety',     icon:'security',               label:'SAFETY' },
    { id:'customer',   icon:'shopping_cart',          label:'CUSTOMER PORTAL' },
  ]

  // Logistics tab: reuse PipelineView shipment table section
  // For now logistics goes to PipelineView which includes the shipment table
  const logisticsAlias = activeTab === 'logistics' ? 'pipeline' : activeTab

  return (
    <div className="app">
      {/* ── Top Nav ───────────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand-name">Kyle Corp Crude Oil &amp; Energy Services</span>
          <div className="brand-divider" />
          <div className="brand-live">
            <span className={`led ${liveStatus==='live'?'led-green':liveStatus==='reconnecting'?'led-gold':'led-dim'} animate-pulse`} />
            LIVE SYSTEM MONITOR
          </div>
        </div>

        <div className="topbar-right">
          <div className="topbar-search">
            <Icon name="search" style={{color:'var(--primary)',fontSize:18}} />
            <input placeholder="Search events..." />
          </div>
          <button className="topbar-icon-btn"><Icon name="hub" /></button>
          <button className="topbar-icon-btn"><Icon name="analytics" /></button>
          <button className="topbar-icon-btn">
            <Icon name="notifications" />
            {(leakAlerts.length > 0 || incidents.filter(i=>i.severity==='CRITICAL').length > 0) && (
              <span className="notif-dot" />
            )}
          </button>
          <div className="avatar-placeholder"><Icon name="person" style={{fontSize:18}} /></div>
        </div>
      </header>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Icon name="terminal" style={{color:'var(--primary)',fontSize:20}} />
            <span className="sidebar-title-text">Command Center</span>
          </div>
          <div className="sidebar-sub">
            <span className="led led-green" style={{width:6,height:6,marginRight:4}} />
            Kafka Backbone Active
          </div>
        </div>

        <div className="sidebar-nav">
          {navItems.map(n=>(
            <div key={n.id} className={`nav-item ${activeTab===n.id||logisticsAlias===n.id&&activeTab==='logistics'?'active':''}`}
              onClick={()=>setActiveTab(n.id)}>
              <Icon name={n.icon} style={{fontSize:20}} />
              {n.label}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="emergency-btn">
            <Icon name="report" style={{fontSize:16}} />
            EMERGENCY SHUTDOWN
          </button>
          <div className="sidebar-util">
            <button className="util-link">
              <Icon name="settings" style={{fontSize:18}} />
              <span style={{fontFamily:'JetBrains Mono',fontSize:10,letterSpacing:'0.06em'}}>Settings</span>
            </button>
            <button className="util-link">
              <Icon name="help" style={{fontSize:18}} />
              <span style={{fontFamily:'JetBrains Mono',fontSize:10,letterSpacing:'0.06em'}}>Support</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="main-canvas">
        {activeTab==='operations' && <OperationsCenter eventFeed={eventFeed} domainStats={domainStats} liveStatus={liveStatus} />}
        {activeTab==='refinery'   && <RefineryView eventFeed={eventFeed} />}
        {(activeTab==='pipeline'||activeTab==='logistics') && <PipelineView leakAlerts={leakAlerts} pipelineData={pipelineData} eventFeed={eventFeed} />}
        {activeTab==='trading'    && <TradingView prices={prices} deals={deals} />}
        {activeTab==='safety'     && <SafetyView incidents={incidents} />}
        {activeTab==='customer'   && <CustomerPortal orders={myOrders} onOrderPlaced={o=>setMyOrders(p=>[...p,o])} />}
      </main>

      {/* ── Footer status bar ─────────────────────────────────────────────── */}
      <footer className="footer-bar">
        <div className="footer-cluster">
          <span>SYSTEM NODE: KYLE-TX-77</span>
          <span style={{margin:'0 8px',color:'var(--outline)'}}>·</span>
          <span>GEO-COORD: 29.7604° N, 95.3698° W</span>
        </div>
        <div className="footer-cluster">
          <span className="led led-green" style={{width:6,height:6}} />
          SYNCED TO CLICKHOUSE CLUSTER
          <span style={{margin:'0 8px',color:'var(--outline)'}}>·</span>
          Last Updated: {fmt(Date.now())}
        </div>
        <div className="footer-cluster" style={{gap:12}}>
          <a href="http://localhost:8080" target="_blank" style={{color:'var(--secondary)'}}>Redpanda Console</a>
          <a href="http://localhost:3001" target="_blank" style={{color:'var(--secondary)'}}>Grafana</a>
          <a href="http://localhost:8181" target="_blank" style={{color:'var(--secondary)'}}>OPA</a>
        </div>
      </footer>
    </div>
  )
}
