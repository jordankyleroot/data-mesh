import { useState, useEffect, useRef } from 'react'

function Icon({ name, className = '', size = '', style }) {
  return <span className={`icon ${size ? `icon-${size}` : ''} ${className}`} aria-hidden="true" style={style}>{name}</span>
}

/* ══ IMAGES ══ */
const IMG = {
  loginBg:     'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
  hero:        'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1920&q=80',
  about:       'https://images.unsplash.com/photo-1543694809-4db1e5e42b47?auto=format&fit=crop&w=900&q=80',
  projectOil:  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=900&q=80',
  projectRef:  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=80',
  projectShip: 'https://images.unsplash.com/photo-1577993285648-bdaecf09e4f5?auto=format&fit=crop&w=900&q=80',
  projectTech: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80',
}

/* ══ OIL PRODUCTS ══ */
const PRODUCTS = [
  { id:'brent',  name:'Brent Crude Oil',          type:'crude',
    origin:'North Sea · FOB Sullom Voe',   price:'$89.40',  unit:'/bbl', avail:'ok',
    icon:'oil_barrel',
    grad:'linear-gradient(145deg,#2a1000 0%,#4a2000 45%,#1a0a00 100%)',
    accent:'#f59e0b',
    specs:[['API Gravity','38.3°'],['Sulphur','0.37% sweet'],['Min. Order','250k bbl'],['Delivery','Spot / 30d']] },
  { id:'bonny',  name:'Bonny Light Crude',         type:'crude',
    origin:'Nigeria · FOB Forcados',       price:'$91.20',  unit:'/bbl', avail:'ok',
    icon:'local_shipping',
    grad:'linear-gradient(145deg,#001433 0%,#002050 45%,#000d22 100%)',
    accent:'#3b82f6',
    specs:[['API Gravity','35.4°'],['Sulphur','0.14% sweet'],['Min. Order','500k bbl'],['Delivery','Term contract']] },
  { id:'ulsd',   name:'Ultra-Low Sulphur Diesel',  type:'refined',
    origin:'Rotterdam · EN 590',           price:'$124.80', unit:'/bbl', avail:'ok',
    icon:'local_gas_station',
    grad:'linear-gradient(145deg,#0a1422 0%,#152540 45%,#060c18 100%)',
    accent:'#64748b',
    specs:[['Sulphur','< 10 ppm'],['Cetane No.','≥ 51'],['Min. Order','20,000 MT'],['Delivery','CIF / FOB']] },
  { id:'jet-a1', name:'Jet A-1 Aviation Fuel',     type:'refined',
    origin:'Meridian Refinery · DEF STAN', price:'$131.50', unit:'/bbl', avail:'ok',
    icon:'flight',
    grad:'linear-gradient(145deg,#001a3d 0%,#002a5c 45%,#000f22 100%)',
    accent:'#60a5fa',
    specs:[['Flash Point','≥ 38 °C'],['Freeze Point','≤ −47 °C'],['Min. Order','5,000 MT'],['Delivery','Ex-Tank / CIF']] },
  { id:'naphtha',name:'Heavy Naphtha',             type:'specialty',
    origin:'CDU Complex · ASTM D86',       price:'$78.60',  unit:'/bbl', avail:'limited',
    icon:'science',
    grad:'linear-gradient(145deg,#0a1a0a 0%,#152815 45%,#061006 100%)',
    accent:'#22c55e',
    specs:[['IBP / FBP','80–200 °C'],['Aromatics','28–35%'],['Min. Order','8,000 MT'],['Delivery','FOB']] },
  { id:'lpg',    name:'LPG — Propane / Butane',    type:'specialty',
    origin:'Gas Recovery Unit · ISO 9162', price:'$67.20',  unit:'/bbl', avail:'ok',
    icon:'local_fire_department',
    grad:'linear-gradient(145deg,#1a1000 0%,#2a1800 45%,#0d0800 100%)',
    accent:'#f97316',
    specs:[['HD-5 Propane','≥ 90%'],['Butane Mix','On request'],['Min. Order','2,000 MT'],['Delivery','CIF / Truck']] },
]

/* ══ PARALLAX BG IMAGES (using known-working IMG constants) ══ */
const PX_IMGS = {
  hero:     'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1920&q=80',
  services: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1920&q=80',
  about:    'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1920&q=80',
  how:      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
  cta:      'https://images.unsplash.com/photo-1577993285648-bdaecf09e4f5?auto=format&fit=crop&w=1920&q=80',
}

/* ══ MOCK DATA ══ */
const MOCK_USER = {
  name: 'J. Martinez', email: 'j.martinez@meridianref.com',
  company: 'Meridian Refinery — CDU Complex', accountId: 'REF-00847',
  role: 'Control Room Operator', tier: 'Enterprise',
}

const INIT_ALARMS = [
  { id: 'ALM-0041', tag: 'CDU-P101', desc: 'Pump discharge pressure below minimum threshold', priority: 'critical', unit: 'Crude Distillation', ts: '09:14:22', acked: false },
  { id: 'ALM-0039', tag: 'HX-210',   desc: 'Heat exchanger efficiency drop — fouling suspected', priority: 'high',   unit: 'CDU Preheat Train', ts: '08:55:10', acked: false },
  { id: 'ALM-0037', tag: 'FCV-305',  desc: 'Flow control valve actuator response lag >400ms', priority: 'medium', unit: 'Vacuum Distillation', ts: '08:33:01', acked: true },
  { id: 'ALM-0031', tag: 'COMP-1A',  desc: 'Wet gas compressor vibration exceeds 2.5 mm/s', priority: 'high',   unit: 'Gas Recovery',       ts: '07:12:45', acked: false },
  { id: 'ALM-0028', tag: 'TIC-104',  desc: 'Crude preheat temperature setpoint deviation', priority: 'low',    unit: 'Crude Distillation', ts: '06:50:12', acked: true },
]

const MOCK_EQUIPMENT = [
  { id: 'CDU-P101', name: 'Crude Charge Pump',       unit: 'CDU',  health: 42, status: 'critical', reading: '180 psi',  trend: 'down'   },
  { id: 'CDU-F101', name: 'Crude Furnace',            unit: 'CDU',  health: 78, status: 'ok',       reading: '682°C',    trend: 'stable' },
  { id: 'VDU-C201', name: 'Vacuum Column',            unit: 'VDU',  health: 91, status: 'ok',       reading: '2.4 mmHg', trend: 'stable' },
  { id: 'HX-210',   name: 'Feed/Effluent Exchanger',  unit: 'CDU',  health: 58, status: 'warning',  reading: '71% eff.', trend: 'down'   },
  { id: 'COMP-1A',  name: 'Wet Gas Compressor',       unit: 'GRU',  health: 65, status: 'warning',  reading: '2.8 mm/s', trend: 'up'     },
  { id: 'CDU-T101', name: 'Atmospheric Column',       unit: 'CDU',  health: 87, status: 'ok',       reading: '1.02 atm', trend: 'stable' },
]

const INIT_WORK_ORDERS = [
  { id: 'WO-20841', equipment: 'CDU-P101', type: 'corrective', desc: 'Replace mechanical seal — product leak', priority: 'critical', status: 'open',        created: '2026-05-20', eta: '2026-05-21' },
  { id: 'WO-20839', equipment: 'HX-210',   type: 'predictive', desc: 'Chemical clean heat exchanger bundle',   priority: 'high',     status: 'in-progress', created: '2026-05-19', eta: '2026-05-22' },
  { id: 'WO-20821', equipment: 'COMP-1A',  type: 'preventive', desc: 'Balance check — vibration monitoring',   priority: 'medium',   status: 'planned',     created: '2026-05-18', eta: '2026-05-25' },
  { id: 'WO-20810', equipment: 'VDU-C201', type: 'preventive', desc: 'Internal inspection per PM schedule',    priority: 'low',      status: 'planned',     created: '2026-05-16', eta: '2026-05-30' },
]

const INIT_INVENTORY = [
  { sku: 'MECH-SEAL-P1', name: 'Mech Seal — CDU-P101 Type', category: 'Spare Part', stock: 0,      unit: 'units', reorder: 2,      status: 'critical' },
  { sku: 'CHEM-HCl-55',  name: 'Hydrochloric Acid 35%',     category: 'Chemical',   stock: 12,     unit: 'drums', reorder: 15,     status: 'low'      },
  { sku: 'LUBE-VG46',    name: 'Turbine Oil VG46',           category: 'Lubricant',  stock: 4,      unit: 'drums', reorder: 8,      status: 'low'      },
  { sku: 'FEED-CRUDE-BR',name: 'Brent Crude Feedstock',      category: 'Feedstock',  stock: 820000, unit: 'bbl',   reorder: 500000, status: 'ok'       },
  { sku: 'CHEM-NaOH',    name: 'Caustic Soda 50%',           category: 'Chemical',   stock: 28,     unit: 'drums', reorder: 20,     status: 'ok'       },
  { sku: 'FILT-CF-200',  name: 'Coalescer Filter Elements',  category: 'Spare Part', stock: 6,      unit: 'units', reorder: 4,      status: 'ok'       },
]

const INIT_INCIDENTS = [
  { id: 'INC-0198', type: 'Equipment Failure', unit: 'CDU',     desc: 'P101 seal failure — minor product release to bund', severity: 'high',   status: 'open',   reported: '2026-05-20 09:00', reporter: 'J. Martinez', actions: 3 },
  { id: 'INC-0195', type: 'Process Deviation', unit: 'VDU',     desc: 'Vacuum column pressure deviation corrected by op.', severity: 'medium', status: 'closed', reported: '2026-05-18 14:22', reporter: 'K. Osei',     actions: 5 },
  { id: 'INC-0189', type: 'Near Miss',         unit: 'GRU',     desc: 'Compressor reached pre-trip vibration during shift', severity: 'medium', status: 'closed', reported: '2026-05-15 06:14', reporter: 'T. Singh',    actions: 4 },
  { id: 'INC-0181', type: 'Environmental',     unit: 'Cooling', desc: 'Cooling tower blowdown exceeded permit limit',       severity: 'low',    status: 'closed', reported: '2026-05-10 11:40', reporter: 'A. Reyes',    actions: 2 },
]

const MOCK_PROD_DATA = [52,58,61,57,63,64,60,62,65,66,64,67,68,65,70,69,72,68,74,71,73,70,68,72]

const MOCK_EXEC_KPI = {
  uptime:     { val: '94.7%',   label: 'Plant Uptime',             delta: '+0.8%',     dir: 'up'   },
  throughput: { val: '182,400', label: 'bbl/day Throughput',       delta: '+3.1%',     dir: 'up'   },
  yield:      { val: '87.3%',   label: 'Distillate Yield',         delta: '-0.4%',     dir: 'down' },
  mttr:       { val: '4.2 h',   label: 'MTTR',                     delta: '-12%',      dir: 'up'   },
  openAlarms: { val: '3',       label: 'Active Critical Alarms',   delta: '+1',        dir: 'down' },
  openWO:     { val: '12',      label: 'Open Work Orders',         delta: '+2',        dir: 'down' },
  emissions:  { val: '98.1%',   label: 'Emissions Compliance',     delta: 'on target', dir: 'up'   },
  prevented:  { val: '2',       label: 'Prevented Incidents (7d)', delta: 'vs 0 avg',  dir: 'up'   },
}

const MOCK_AUDIT_LOG = [
  { id: 'EVT-9041', ts: '2026-05-20 09:14:22', actor: 'SYSTEM',     action: 'Alarm raised: CDU-P101 low pressure',            level: 'critical' },
  { id: 'EVT-9039', ts: '2026-05-20 09:01:05', actor: 'j.martinez', action: 'Acknowledged alarm ALM-0037',                    level: 'info'     },
  { id: 'EVT-9035', ts: '2026-05-20 08:55:10', actor: 'SYSTEM',     action: 'Anomaly detected: HX-210 efficiency drop',       level: 'high'     },
  { id: 'EVT-9031', ts: '2026-05-20 08:33:01', actor: 'SYSTEM',     action: 'Work order WO-20839 status → in-progress',       level: 'info'     },
  { id: 'EVT-9028', ts: '2026-05-20 07:12:45', actor: 'SYSTEM',     action: 'Alarm raised: COMP-1A vibration high',           level: 'high'     },
  { id: 'EVT-9021', ts: '2026-05-20 06:50:12', actor: 'k.osei',     action: 'Incident INC-0195 closed — root cause documented', level: 'info'   },
]

/* ══ HELPERS ══ */
const fmtNum = n => new Intl.NumberFormat('en-US').format(n)

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = filename; a.click()
}
function downloadJSON(filename, data) {
  const a = document.createElement('a'); a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2)); a.download = filename; a.click()
}

function PriBadge({ priority }) {
  const map = { critical: 'badge-red', high: 'badge-amber', medium: 'badge-blue', low: 'badge-gray' }
  return <span className={`badge ${map[priority] || 'badge-gray'}`}>{priority}</span>
}
function StatusBadge({ status }) {
  const map    = { open:'badge-amber','in-progress':'badge-blue',planned:'badge-gray',closed:'badge-green',delivered:'badge-green','in-transit':'badge-blue',processing:'badge-amber',cancelled:'badge-red',resolved:'badge-green' }
  const labels = { open:'Open','in-progress':'In Progress',planned:'Planned',closed:'Closed',delivered:'Delivered','in-transit':'In Transit',processing:'Processing',cancelled:'Cancelled',resolved:'Resolved' }
  return <span className={`badge ${map[status]||'badge-gray'}`}>{labels[status]||status}</span>
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  const icons = { success: 'check_circle', error: 'error', info: 'info' }
  return <div className={`toast toast-${type}`}><Icon name={icons[type]||'info'} size="sm" className="icon-fill" /> {msg}</div>
}

/* ══ PARALLAX ENGINE ══ */
function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const h = () => setY(window.scrollY)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return y
}

function useSectionParallax(factor = 0.3) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.innerWidth < 768) return
    const bg = el.querySelector('.px-bg')
    if (!bg) return
    const h = () => {
      const rect = el.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const pct = (window.innerHeight / 2 - rect.top - rect.height / 2) / window.innerHeight
      bg.style.transform = `translateY(${pct * factor * 300}px)`
    }
    window.addEventListener('scroll', h, { passive: true })
    h()
    return () => window.removeEventListener('scroll', h)
  }, [factor])
  return ref
}

function ParallaxSection({ children, img, overlay, style, className='', id, minHeight }) {
  const ref = useSectionParallax(0.35)
  return (
    <section ref={ref} id={id} className={`px-section ${className}`} style={{ minHeight, ...style }}>
      <div className="px-bg" style={{ backgroundImage:`url(${img})` }} />
      <div className="px-overlay" style={{ background: overlay || 'rgba(11,17,23,0.75)' }} />
      <div className="px-content">{children}</div>
    </section>
  )
}

function useMouseTilt(intensity = 10) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    let raf
    const move = e => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = ((e.clientX - r.left) / r.width  - 0.5) * intensity
        const y = ((e.clientY - r.top)  / r.height - 0.5) * intensity
        el.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${-y}deg) scale(1.025)`
        el.style.transition = 'transform .05s linear'
      })
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      el.style.transition = 'transform .45s var(--ease-spring)'
      el.style.transform = ''
    }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave) }
  }, [intensity])
  return ref
}

function ScrollProgressBar() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const h = () => {
      const d = document.documentElement
      setPct((d.scrollTop / (d.scrollHeight - d.clientHeight)) * 100)
    }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return <div className="scroll-progress-bar" style={{ width:`${pct}%` }} />
}

/* ══ SCROLL REVEAL HOOK ══ */
function useReveal(threshold = 0.12) {
  const ref  = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, vis]
}

/* ══ STATUS BAR ══ */
function StatusBar() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  const ts = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  return (
    <div className="dash-statusbar">
      <div className="statusbar-left">
        <span className="statusbar-item statusbar-green">
          <span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',display:'inline-block',marginRight:4,boxShadow:'0 0 4px var(--green)'}} />
          SYSTEM ONLINE: HUB-A7
        </span>
        <span className="statusbar-item"><Icon name="sensors" size="sm" /> MESH NODES: 1,402 ACTIVE</span>
        <span className="statusbar-item"><Icon name="sync" size="sm" /> LATENCY: 14MS</span>
      </div>
      <span className="statusbar-time">T: {ts}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MODALS
   ══════════════════════════════════════════════════════════════ */

function ModalOverlay({ children, onClose }) {
  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}

/* ── Emergency Modal ── */
function EmergencyModal({ onClose }) {
  const [dispatched, setDispatched] = useState(false)
  const contacts = [
    { role: 'Operations Lead',        name: 'T. Williams', phone: '+1 (713) 555-0142' },
    { role: 'Safety Officer',         name: 'A. Reyes',    phone: '+1 (713) 555-0198' },
    { role: 'Maintenance Supervisor', name: 'K. Osei',     phone: '+1 (713) 555-0211' },
    { role: '24/7 Plant Emergency',   name: 'Emergency Line', phone: '+1 (800) 555-0911' },
  ]
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="modal-title" style={{display:'flex',alignItems:'center',gap:6}}>
              <Icon name="emergency" size="sm" style={{color:'var(--red)'}} /> Emergency Contacts
            </div>
            <div className="modal-sub">Dispatch response team or contact on-call personnel directly</div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          {contacts.map(c => (
            <div key={c.role} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{c.role}</div>
                <div style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--text-muted)',marginTop:2}}>{c.name}</div>
              </div>
              <a href={`tel:${c.phone.replace(/[^+\d]/g,'')}`} style={{fontFamily:'JetBrains Mono',fontSize:12,color:'var(--gold)',fontWeight:600}}>{c.phone}</a>
            </div>
          ))}
          {dispatched && (
            <div style={{marginTop:14,padding:'10px 12px',background:'var(--green-dim)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'var(--radius-sm)',fontFamily:'JetBrains Mono',fontSize:10,color:'var(--green)',display:'flex',alignItems:'center',gap:6}}>
              <Icon name="check_circle" size="sm" className="icon-fill" /> Emergency team dispatch initiated. All on-call personnel notified.
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          {!dispatched
            ? <button className="btn btn-danger" onClick={() => setDispatched(true)}><Icon name="emergency" size="sm" /> Dispatch Emergency Team</button>
            : <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
          }
        </div>
      </div>
    </ModalOverlay>
  )
}

/* ── Alarm Detail Modal ── */
const ALARM_RUNBOOKS = {
  critical: [
    'Notify shift supervisor immediately and log event in DCS alarm journal.',
    'Isolate affected equipment per emergency isolation procedure EIP-CDU-001.',
    'Dispatch maintenance technician to site — required ETA < 30 minutes.',
    'Monitor adjacent equipment (CDU-F101, HX-210) for cascade effects.',
    'Document all corrective actions in work order WO-20841.',
    'Notify plant manager if condition persists beyond 15 minutes.',
  ],
  high: [
    'Acknowledge alarm and record timestamp in shift log.',
    'Assess process impact and initiate enhanced monitoring protocol.',
    'Create corrective work order if equipment intervention is required.',
    'Escalate to lead engineer if the condition persists beyond 30 minutes.',
  ],
  medium: [
    'Acknowledge and monitor — trend against baseline over the next 2 shifts.',
    'Review recent maintenance history for related findings.',
    'Schedule inspection at the next available maintenance window.',
  ],
  low: [
    'Acknowledge alarm and note in shift handover report.',
    'Monitor for recurrence over the next 7 days.',
  ],
}
function AlarmDetailModal({ alarm, onClose, onAck }) {
  const steps = ALARM_RUNBOOKS[alarm.priority] || ALARM_RUNBOOKS.low
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="modal-title">{alarm.id} — {alarm.tag}</div>
            <div className="modal-sub">{alarm.unit} · {alarm.ts}</div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <div style={{background:'var(--surface-hi)',borderRadius:'var(--radius-sm)',padding:'10px 12px',marginBottom:16}}>
            <div style={{fontFamily:'JetBrains Mono',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:4}}>Description</div>
            <div style={{fontSize:12,color:'var(--text)',lineHeight:1.5}}>{alarm.desc}</div>
          </div>
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            <PriBadge priority={alarm.priority} />
            <StatusBadge status={alarm.acked ? 'closed' : 'open'} />
            {alarm.acked && <span style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--green)',display:'flex',alignItems:'center',gap:4}}><Icon name="check_circle" size="sm" className="icon-fill" style={{color:'var(--green)'}} /> ACKNOWLEDGED</span>}
          </div>
          <div style={{fontFamily:'JetBrains Mono',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text-muted)',marginBottom:10}}>Response Runbook</div>
          <ol className="runbook-steps">
            {steps.map((s, i) => (
              <li key={i} className="runbook-step">
                <span className="runbook-step-num">{String(i+1).padStart(2,'0')}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          {!alarm.acked && (
            <button className="btn btn-primary btn-sm" onClick={() => { onAck(alarm.id); onClose() }}>
              <Icon name="check" size="sm" /> Acknowledge Alarm
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}

/* ── New Work Order Modal ── */
function NewWorkOrderModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ equipment:'', type:'preventive', desc:'', priority:'medium', eta:'' })
  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const valid = form.equipment && form.desc.trim().length > 3
  const handleSubmit = () => {
    if (!valid) return
    const wo = {
      id: `WO-${Math.floor(20900 + Math.random()*99)}`,
      equipment: form.equipment, type: form.type, desc: form.desc,
      priority: form.priority, status: 'open',
      created: new Date().toISOString().slice(0,10),
      eta: form.eta || new Date(Date.now() + 7*86400000).toISOString().slice(0,10),
    }
    onAdd(wo); onClose()
  }
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal">
        <div className="modal-head">
          <div><div className="modal-title">New Work Order</div><div className="modal-sub">Create a corrective, preventive or predictive work order</div></div>
          <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <div className="form-row" style={{marginBottom:14}}>
            <div className="form-group">
              <label className="form-label">Equipment Tag</label>
              <select className="field" value={form.equipment} onChange={e => set('equipment', e.target.value)}>
                <option value="">Select equipment…</option>
                {MOCK_EQUIPMENT.map(eq => <option key={eq.id} value={eq.id}>{eq.id} — {eq.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="field" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="corrective">Corrective</option>
                <option value="preventive">Preventive</option>
                <option value="predictive">Predictive</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{marginBottom:14}}>
            <label className="form-label">Description</label>
            <textarea className="field" rows={3} value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="Describe the work required…" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="field" value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Required By</label>
              <input className="field" type="date" value={form.eta} onChange={e => set('eta', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!valid}>
            <Icon name="add" size="sm" /> Create Work Order
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

/* ── Work Order Detail Modal ── */
const WO_TRANSITIONS = { open:'in-progress', 'in-progress':'closed', planned:'in-progress' }
const WO_BTN_LABELS  = { open:'Start Work', 'in-progress':'Mark Complete', planned:'Assign & Start' }
function WorkOrderDetailModal({ wo, onClose, onUpdate }) {
  const next = WO_TRANSITIONS[wo.status]
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal">
        <div className="modal-head">
          <div><div className="modal-title">{wo.id}</div><div className="modal-sub">{wo.equipment} · {wo.type}</div></div>
          <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <div className="order-detail-grid" style={{marginBottom:16}}>
            <div className="detail-item"><div className="detail-label">Status</div><div style={{marginTop:4}}><StatusBadge status={wo.status} /></div></div>
            <div className="detail-item"><div className="detail-label">Priority</div><div style={{marginTop:4}}><PriBadge priority={wo.priority} /></div></div>
            <div className="detail-item"><div className="detail-label">Created</div><div className="detail-val td-mono">{wo.created}</div></div>
            <div className="detail-item"><div className="detail-label">ETA</div><div className="detail-val td-mono">{wo.eta}</div></div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Description</div>
            <div style={{fontSize:12,color:'var(--text)',lineHeight:1.55,marginTop:6}}>{wo.desc}</div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          {next && (
            <button className="btn btn-primary btn-sm" onClick={() => { onUpdate(wo.id, next); onClose() }}>
              <Icon name="arrow_forward" size="sm" /> {WO_BTN_LABELS[wo.status]}
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}

/* ── Purchase Order Modal ── */
const PO_SUPPLIERS = ['SKF Direct','INEOS Chem.','Shell Lubricants','NNPC Trading','ExxonMobil Chem.','Honeywell PMC']
function PurchaseOrderModal({ item, onClose, onConfirm }) {
  const [qty, setQty]           = useState(item ? item.reorder * 2 : 1)
  const [supplier, setSupplier] = useState('')
  const [reqBy, setReqBy]       = useState('')
  const valid = supplier && reqBy && qty > 0
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal modal-sm">
        <div className="modal-head">
          <div><div className="modal-title">Create Purchase Order</div><div className="modal-sub">{item?.name}</div></div>
          <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <div className="form-group" style={{marginBottom:14}}>
            <label className="form-label">SKU / Material</label>
            <input className="field" readOnly value={item?.sku || ''} />
          </div>
          <div className="form-row" style={{marginBottom:14}}>
            <div className="form-group">
              <label className="form-label">Quantity ({item?.unit})</label>
              <input className="field" type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Required By</label>
              <input className="field" type="date" value={reqBy} onChange={e => setReqBy(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Preferred Supplier</label>
            <select className="field" value={supplier} onChange={e => setSupplier(e.target.value)}>
              <option value="">Select supplier…</option>
              {PO_SUPPLIERS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => { onConfirm(item, qty, supplier); onClose() }} disabled={!valid}>
            <Icon name="send" size="sm" /> Submit PO
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

/* ── Incident Detail Modal ── */
function IncidentDetailModal({ inc, onClose, onCloseIncident }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal">
        <div className="modal-head">
          <div><div className="modal-title">{inc.id} — {inc.type}</div><div className="modal-sub">{inc.unit} · Reported {inc.reported}</div></div>
          <button className="modal-close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body">
          <div className="order-detail-grid" style={{marginBottom:16}}>
            <div className="detail-item"><div className="detail-label">Severity</div><div style={{marginTop:4}}><PriBadge priority={inc.severity} /></div></div>
            <div className="detail-item"><div className="detail-label">Status</div><div style={{marginTop:4}}><StatusBadge status={inc.status} /></div></div>
            <div className="detail-item"><div className="detail-label">Reporter</div><div className="detail-val td-mono">{inc.reporter}</div></div>
            <div className="detail-item"><div className="detail-label">Actions Taken</div><div className="detail-val td-mono">{inc.actions} recorded</div></div>
          </div>
          <div className="detail-item" style={{marginBottom:14}}>
            <div className="detail-label">Description</div>
            <div style={{fontSize:12,color:'var(--text)',lineHeight:1.55,marginTop:6}}>{inc.desc}</div>
          </div>
          {inc.status === 'open' && (
            <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'var(--radius-sm)',padding:'8px 12px',fontSize:11,color:'var(--red)'}}>
              <Icon name="warning" size="sm" style={{marginRight:6}} /> This incident is still open. Ensure all corrective actions are documented before closing.
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          {inc.status === 'open' && (
            <button className="btn btn-primary btn-sm" onClick={() => { onCloseIncident(inc.id); onClose() }}>
              <Icon name="check_circle" size="sm" /> Close Incident
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}

/* ── Notification Dropdown ── */
function NotificationDropdown({ alarms, incidents, onClose, onNav }) {
  const unacked = alarms.filter(a => !a.acked)
  const openInc = incidents.filter(i => i.status === 'open')
  const total = unacked.length + openInc.length
  return (
    <div className="notif-dropdown">
      <div className="notif-hd">
        <span className="card-title">Notifications {total > 0 && <span style={{background:'var(--red)',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:9,display:'inline-grid',placeItems:'center',fontFamily:'JetBrains Mono',marginLeft:4}}>{total}</span>}</span>
        <button className="modal-close" onClick={onClose}><Icon name="close" size="sm" /></button>
      </div>
      {unacked.map(a => (
        <div key={a.id} className="notif-item" onClick={() => { onNav('operations'); onClose() }}>
          <Icon name="notifications_active" size="sm" style={{color: a.priority==='critical'?'var(--red)':'var(--amber)',marginTop:2,flexShrink:0}} />
          <div className="notif-item-body">
            <div className="notif-item-text">{a.id}: {a.desc}</div>
            <div className="notif-item-time">{a.tag} · {a.priority.toUpperCase()} · {a.ts}</div>
          </div>
        </div>
      ))}
      {openInc.map(i => (
        <div key={i.id} className="notif-item" onClick={() => { onNav('compliance'); onClose() }}>
          <Icon name="crisis_alert" size="sm" style={{color:'var(--amber)',marginTop:2,flexShrink:0}} />
          <div className="notif-item-body">
            <div className="notif-item-text">{i.id}: {i.desc}</div>
            <div className="notif-item-time">{i.unit} · {i.severity} severity · OPEN</div>
          </div>
        </div>
      ))}
      {total === 0 && (
        <div style={{padding:'24px 14px',textAlign:'center',fontFamily:'JetBrains Mono',fontSize:10,color:'var(--text-muted)'}}>
          <Icon name="check_circle" size="sm" className="icon-fill" style={{color:'var(--green)',display:'block',margin:'0 auto 6px',fontSize:22}} />
          No active notifications
        </div>
      )}
      <div className="notif-ft">
        <button className="btn btn-ghost btn-sm" onClick={() => { onNav('operations'); onClose() }}>View all alarms</button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PRODUCT CARD — tilt + gradient bg
   ══════════════════════════════════════════════════════════════ */
function ProductCard({ p, onQuote, revealed, delay }) {
  const tiltRef = useMouseTilt(8)
  const availLabel = { ok:'Available', limited:'Limited Stock', sold:'Sold Out' }
  const availColor = { ok:'var(--green)', limited:'var(--amber)', sold:'var(--text-muted)' }
  return (
    <div ref={tiltRef} className={`prod-card-v3 tilt-card reveal d${delay} ${revealed?'visible':''}`}>
      <div className="prod-card-thumb">
        <div className="prod-card-thumb-gradient" style={{ background: p.grad }} />
        <span className="icon prod-card-thumb-icon" style={{ color: p.accent }}>{p.icon}</span>
        <div className="prod-card-thumb-overlay">
          <div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:22, fontWeight:700, color:p.accent, lineHeight:1 }}>{p.price}</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:9, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{p.unit} · indicative</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'JetBrains Mono', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:availColor[p.avail] }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:availColor[p.avail], display:'block', boxShadow:p.avail==='ok'?`0 0 6px ${p.accent}`:'none' }} />
            {availLabel[p.avail]}
          </div>
        </div>
      </div>
      <div className="prod-card-body">
        <div className="prod-name">{p.name}</div>
        <div className="prod-origin"><Icon name="location_on" size="sm" />{p.origin}</div>
        <div className="prod-specs">
          {p.specs.map(([k,v]) => (
            <div key={k} className="prod-spec"><span className="prod-spec-k">{k}</span><span className="prod-spec-v">{v}</span></div>
          ))}
        </div>
        <div className="prod-actions">
          <button className="btn btn-primary btn-sm" style={{ flex:1, borderRadius:8 }} onClick={() => onQuote(p)} disabled={p.avail==='sold'}>
            <Icon name="request_quote" size="sm" /> Request Quote
          </button>
          <button className="btn-outline-gold" style={{ borderRadius:8 }} onClick={() => onQuote(p)}>
            <Icon name="description" size="sm" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══ HERO PARALLAX ══ */
function HeroParallax({ img, children }) {
  const scrollY = useScrollY()
  return (
    <section className="hero" style={{ position:'relative', overflow:'hidden' }}>
      <div
        className="hero-overlay"
        style={{
          position:'absolute', inset:0, zIndex:1,
          background:'linear-gradient(160deg,rgba(0,0,0,0.72) 0%,rgba(10,17,25,0.85) 100%)',
        }}
      />
      <div
        style={{
          position:'absolute', inset:'-35% 0', zIndex:0,
          backgroundImage:`url(${img})`,
          backgroundSize:'cover', backgroundPosition:'center',
          willChange:'transform',
          transform:`translateY(${scrollY * 0.25}px)`,
        }}
      />
      <div className="hero-grid" style={{position:'absolute',inset:0,zIndex:1,opacity:0.25}} />
      <div style={{position:'relative',zIndex:2,width:'100%',height:'100%'}}>
        {children}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE — Parallax v3
   ══════════════════════════════════════════════════════════════ */
function LandingPage({ onLogin, onRegister }) {
  const [scrolled, setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mktTab, setMktTab]       = useState('all')
  const [quoteItem, setQuoteItem] = useState(null)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h)
  }, [])

  const [statsRef, statsVis] = useReveal()
  const [svcRef,   svcVis]   = useReveal()
  const [mktRef,   mktVis]   = useReveal()
  const [aboutRef, aboutVis] = useReveal(0.1)
  const [projRef,  projVis]  = useReveal()
  const [howRef,   howVis]   = useReveal()
  const [ctaRef,   ctaVis]   = useReveal()

  const services = [
    { icon:'sensors',           title:'Real-Time Telemetry',      desc:'Sub-second event streaming from 1,400+ plant sensors into a unified data mesh — accessible by authorised roles across operations, maintenance and analytics.' },
    { icon:'build',             title:'Predictive Maintenance',    desc:'ML-driven equipment health scores, anomaly detection, and auto-created work orders before failures occur — reducing unplanned downtime by 30–60%.' },
    { icon:'factory',           title:'Production Analytics',      desc:'Aggregated materialised views per unit and shift, enabling near-real-time throughput, yield, and bottleneck analysis without burdening control systems.' },
    { icon:'inventory',         title:'Supply Chain Intelligence', desc:'Feedstock inventory events, reorder triggers, and supplier ETA integration — preventing production stoppages caused by material shortages.' },
    { icon:'gavel',             title:'Compliance & Audit',        desc:'Tamper-evident immutable event logs, automated emissions reports, and one-click regulatory audit bundles with PII masking and retention policy enforcement.' },
    { icon:'candlestick_chart', title:'Executive Intelligence',    desc:'Rolled-up cost, uptime, and SLA dashboards for plant managers, with incident impact analysis and ROI tracking against mesh adoption KPIs.' },
  ]
  const projects = [
    { title:'CDU Real-Time Pilot',       subtitle:'Crude Distillation · 10 Sensors', value:'3 prevented failures', status:'Active',    img:IMG.projectOil  },
    { title:'Predictive Seal Programme', subtitle:'Reliability Engineering',          value:'−62% MTTR',            status:'Active',    img:IMG.projectRef  },
    { title:'Compliance Automation',     subtitle:'Regulatory & Safety',              value:'Zero audit findings',  status:'Completed', img:IMG.projectShip },
    { title:'Unified Data Marketplace',  subtitle:'Platform · API-First',             value:'18 data products',     status:'Active',    img:IMG.projectTech },
  ]
  const stats   = [
    { val:'1,400+', unit:'sensors', label:'Live data endpoints'      },
    { val:'14ms',   unit:'latency', label:'P95 event delivery'        },
    { val:'99.4%',  unit:'uptime',  label:'Platform availability'     },
    { val:'−38%',   unit:'MTTR',    label:'Improvement vs. baseline'  },
  ]
  const partners = ['Shell','BP','TotalEnergies','ExxonMobil','Honeywell','Emerson','ABB','Yokogawa']

  const mktFiltered = mktTab === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.type === mktTab)

  return (
    <div className="pub-page">
      <ScrollProgressBar />

      {/* ── Navbar ── */}
      <nav className={`pub-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="pub-nav-brand">
          <div className="brand-emblem" style={{borderRadius:10}}><Icon name="bolt" className="icon-fill" /></div>
          <span className="brand-name">Kyle Corp</span>
        </div>
        <div className={`pub-nav-links ${mobileOpen ? 'open' : ''}`}>
          <a href="#services" onClick={() => setMobileOpen(false)}>Platform</a>
          <a href="#products" onClick={() => setMobileOpen(false)}>Products</a>
          <a href="#projects" onClick={() => setMobileOpen(false)}>Case Studies</a>
          <a href="#about"    onClick={() => setMobileOpen(false)}>About</a>
        </div>
        <div className="pub-nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={onLogin}><Icon name="login" size="sm" /> Sign In</button>
          <button className="btn btn-primary btn-sm btn-pill" onClick={onRegister}><Icon name="person_add" size="sm" /> Get Access</button>
          <button className="nav-hamburger" onClick={() => setMobileOpen(o => !o)}><Icon name={mobileOpen ? 'close' : 'menu'} /></button>
        </div>
      </nav>

      {/* ── Hero (parallax bg layer) ── */}
      <HeroParallax img={PX_IMGS.hero}>
        <div className="hero-orb hero-orb-1" /><div className="hero-orb hero-orb-2" /><div className="hero-orb hero-orb-3" />
        <div className="hero-content">
          <div className="hero-eyebrow hero-anim-1"><Icon name="hub" size="sm" /> Refinery Data Mesh · Oil Trading Platform</div>
          <h1 className="hero-title hero-anim-2">The Right Data,<br /><span className="gold">For Every Role.</span></h1>
          <p className="hero-sub hero-anim-3">Kyle Corp connects your refinery's sensor telemetry, maintenance events, and supply chain data into a single governed marketplace — while giving customers direct access to trade crude grades and refined products.</p>
          <div className="hero-actions hero-anim-4">
            <button className="btn btn-primary btn-lg btn-pill" onClick={onRegister}><Icon name="rocket_launch" size="sm" /> Request Access</button>
            <button className="btn btn-outline-white btn-lg btn-pill" onClick={() => document.getElementById('products')?.scrollIntoView({behavior:'smooth'})}><Icon name="local_gas_station" size="sm" /> View Products</button>
          </div>
          <div className="hero-trust hero-anim-4" style={{marginTop:8}}>
            <Icon name="verified" className="icon-fill" style={{color:'#3b82f6'}} />
            <span>IEC 62443 Compliant · ISO 27001 Certified · Zero write-access to control systems</span>
          </div>
        </div>
        <div className="hero-scroll-hint"><Icon name="keyboard_arrow_down" size="lg" /></div>
      </HeroParallax>

      {/* ── Stats ── */}
      <div className="stats-bar-v2" ref={statsRef}>
        {stats.map((s, i) => (
          <div key={s.label} className={`stat-item-v2 reveal d${i+1} ${statsVis?'visible':''}`}>
            <span className="stat-val">{s.val}</span><span className="stat-unit">{s.unit}</span><span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Partners ── */}
      <div className="partners-bar-v2">
        <span className="partners-label" style={{whiteSpace:'nowrap',marginRight:8}}>Trusted by</span>
        {partners.map((p, i) => (
          <span key={p} className={`partner-chip reveal d${(i%6)+1} ${statsVis?'visible':''}`}>{p}</span>
        ))}
      </div>

      {/* ── Platform Services — parallax ── */}
      <ParallaxSection id="services" img={PX_IMGS.services} overlay="rgba(6,10,15,0.88)" minHeight="auto">
        <div className="lp-inner" style={{padding:'80px 24px'}}>
          <div className="lp-header">
            <div className="lp-eyebrow" style={{color:'var(--gold)'}}><Icon name="category" size="sm" /> Platform Capabilities</div>
            <h2 className="lp-title" style={{color:'#fff'}}>Built for Every Refinery Role</h2>
            <p className="lp-desc">From the control room to the boardroom, each team gets data products tailored to their workflow — through a single platform with role-based security.</p>
          </div>
          <div className="services-grid-v2" ref={svcRef}>
            {services.map((s, i) => (
              <div key={s.title} className={`service-card-v2 reveal d${i+1} ${svcVis?'visible':''}`}>
                <div className="service-icon-wrap"><Icon name={s.icon} className="icon-lg icon-fill" /></div>
                <h3 className="service-title">{s.title}</h3>
                <p className="service-desc">{s.desc}</p>
                <a href="#contact" className="service-link">Learn more <Icon name="arrow_forward" size="sm" /></a>
              </div>
            ))}
          </div>
        </div>
      </ParallaxSection>

      {/* wave */}
      <div className="wave-divider" style={{background:'rgba(6,10,15,0.88)'}}>
        <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{height:48}}><path d="M0,24 C480,60 960,-12 1440,24 L1440,0 L0,0 Z" fill="var(--bg)" /></svg>
      </div>

      {/* ══ OIL PRODUCTS MARKETPLACE ══ */}
      <section className="mkt-section" id="products" style={{background:'var(--bg)'}}>
        <div className="lp-inner">
          <div className="lp-header" ref={mktRef}>
            <div className={`lp-eyebrow reveal ${mktVis?'visible':''}`} style={{color:'var(--gold)'}}><Icon name="local_gas_station" size="sm" /> Products Marketplace</div>
            <h2 className={`lp-title reveal d1 ${mktVis?'visible':''}`}>Trade Refined Products &amp; Feedstocks</h2>
            <p className={`lp-desc reveal d2 ${mktVis?'visible':''}`}>Spot and term contracts · FOB or CIF delivery · Competitive pricing updated daily · Minimum order quantities apply.</p>
          </div>

          <div className={`mkt-tabs reveal d3 ${mktVis?'visible':''}`}>
            {[['all','All Products'],['crude','Crude Grades'],['refined','Refined Products'],['specialty','Specialty']].map(([k,l]) => (
              <button key={k} className={`mkt-tab ${mktTab===k?'active':''}`} onClick={() => setMktTab(k)}>{l}</button>
            ))}
          </div>

          <div className="mkt-grid">
            {mktFiltered.map((p, i) => (
              <ProductCard key={p.id} p={p} onQuote={setQuoteItem} revealed={mktVis} delay={(i%3)+1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── About — parallax split ── */}
      <ParallaxSection id="about" img={PX_IMGS.about} overlay="rgba(6,10,15,0.80)" minHeight="auto">
        <div className="lp-inner" style={{padding:'80px 24px'}}>
          <div className="about-grid" ref={aboutRef}>
            <div className={`about-text reveal-left ${aboutVis?'visible':''}`}>
              <div className="lp-eyebrow" style={{color:'var(--gold)'}}><Icon name="info" size="sm" /> About the Platform</div>
              <h2 className="lp-title lp-title-left" style={{color:'#fff'}}>Connecting People to Data Across the Entire Refinery Value Chain</h2>
              <p className="about-body">The Kyle Corp Data Mesh treats every data stream — sensor telemetry, maintenance events, inventory changes, compliance logs — as a governed, discoverable product accessible by authorised consumers.</p>
              <p className="about-body">Unlike traditional data lakes or historian databases, the mesh enforces strict RBAC, PII masking, and immutable audit trails while delivering sub-second latency to operational users and materialised views to analytic consumers.</p>
              <div className="about-metrics">
                {[['&lt;1s','Alarm-to-operator latency'],['RBAC','Role-based access on all products'],['100%','Immutable audit coverage'],['Zero','Write-access to control systems']].map(([v,l]) => (
                  <div key={l} className="about-metric" style={{borderRadius:10,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)'}}>
                    <span className="about-metric-val" dangerouslySetInnerHTML={{__html:v}} />
                    <span className="about-metric-label">{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`about-right-panel reveal-right ${aboutVis?'visible':''}`}>
              <div className="about-feature-list">
                {[
                  { icon:'sensors',       label:'1,400+ live sensor feeds',       sub:'Real-time DCS event streaming' },
                  { icon:'security',      label:'Zero write-access to OT systems', sub:'Read-only data extraction layer' },
                  { icon:'verified_user', label:'IEC 62443 & ISO 27001 certified', sub:'OT/IT convergence security' },
                  { icon:'speed',         label:'14ms P95 event delivery',         sub:'Sub-second alarm propagation' },
                  { icon:'gavel',         label:'Immutable audit log',             sub:'100% event coverage, tamper-proof' },
                  { icon:'hub',           label:'API-first data mesh',             sub:'Governed products, RBAC-enforced' },
                ].map(f => (
                  <div key={f.label} className="about-feature-row">
                    <div className="about-feature-icon"><Icon name={f.icon} className="icon-fill" /></div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{f.label}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:1}}>{f.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="about-img-badge" style={{borderRadius:12,marginTop:20,background:'rgba(245,197,24,0.12)',border:'1px solid rgba(245,197,24,0.25)'}}>
                <Icon name="verified_user" className="icon-fill" style={{color:'var(--gold)'}} />
                <div style={{color:'#e2e8f0'}}><strong>IEC 62443 Compliant</strong><br /><span style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>OT/IT Security Certified</span></div>
              </div>
            </div>
          </div>
        </div>
      </ParallaxSection>

      {/* ── Case Studies ── */}
      <section className="lp-section" id="projects" style={{background:'var(--bg)'}}>
        <div className="lp-inner">
          <div className="lp-header" ref={projRef}>
            <div className={`lp-eyebrow reveal ${projVis?'visible':''}`}><Icon name="domain" size="sm" /> Case Studies</div>
            <h2 className={`lp-title reveal d1 ${projVis?'visible':''}`}>Measurable Results from Live Deployments</h2>
          </div>
          <div className="projects-grid">
            {projects.map((p, i) => (
              <div key={p.title} className={`project-card reveal-scale d${i+1} ${projVis?'visible':''}`} style={{borderRadius:14}}>
                <img
                  src={p.img} alt={p.title} className="project-img"
                  onError={e => { e.target.src = PX_IMGS.hero }}
                />
                <div className="project-overlay">
                  <div className="project-info">
                    <span className={`badge ${p.status==='Active'?'badge-blue':'badge-green'} project-badge`}>{p.status}</span>
                    <div className="project-title">{p.title}</div>
                    <div className="project-sub">{p.subtitle}</div>
                  </div>
                  <div className="project-value">{p.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works — parallax ── */}
      <ParallaxSection id="contact" img={PX_IMGS.how} overlay="rgba(0,14,38,0.88)" minHeight="auto">
        <div className="lp-inner" style={{padding:'80px 24px'}}>
          <div className="lp-header" ref={howRef}>
            <div className={`lp-eyebrow reveal ${howVis?'visible':''}`} style={{color:'#60a5fa'}}><Icon name="auto_awesome" size="sm" /> Pilot Programme</div>
            <h2 className={`lp-title reveal d1 ${howVis?'visible':''}`} style={{color:'#fff'}}>Live in 6 Weeks — Starting with Your CDU</h2>
          </div>
          <div className="how-grid">
            {[
              { n:'01', icon:'sensors',    title:'Instrument 10 Sensors',  desc:'Start with your crude distillation unit — 10 critical sensors + orders and inventory flows wired into the mesh in week 1.' },
              { n:'02', icon:'hub',        title:'Activate Data Products',  desc:'Pre-built dashboards per role are live within days. Operators, maintenance, and executives each get their tailored view.' },
              { n:'03', icon:'trending_up',title:'Measure Before/After',    desc:'Track MTTR, unplanned downtime, and prevented incidents over 6–8 weeks to establish clear ROI for full plant rollout.' },
            ].map((step, i) => (
              <div key={step.n} className={`how-card reveal d${i+1} ${howVis?'visible':''}`} style={{borderRadius:14,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',backdropFilter:'blur(10px)'}}>
                <div className="how-num" style={{color:'#60a5fa'}}>{step.n}</div>
                <div className="how-icon-wrap" style={{borderRadius:12}}><Icon name={step.icon} className="icon-lg icon-fill" /></div>
                <h3 className="how-title" style={{color:'#e2e8f0'}}>{step.title}</h3>
                <p className="how-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </ParallaxSection>

      {/* ── CTA Banner — parallax ── */}
      <ParallaxSection img={PX_IMGS.cta} overlay="rgba(10,5,0,0.82)" minHeight="420px">
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:420,padding:'60px 24px'}} ref={ctaRef}>
          <div className={`reveal ${ctaVis?'visible':''}`} style={{textAlign:'center',maxWidth:680}}>
            <div className="cta-banner-title" style={{color:'#fff'}}>Ready to unlock your<br /><span className="gold">refinery's full potential?</span></div>
            <p className="cta-banner-sub">Join the operators, engineers, and traders already using Kyle Corp Data Mesh to prevent failures, cut costs, and close deals faster.</p>
            <div className="cta-banner-actions">
              <button className="btn btn-primary btn-lg btn-pill" onClick={onRegister}><Icon name="rocket_launch" size="sm" /> Start Your Pilot</button>
              <button className="btn btn-outline-white btn-lg btn-pill" onClick={onLogin}><Icon name="login" size="sm" /> Sign In to Portal</button>
            </div>
          </div>
        </div>
      </ParallaxSection>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <div className="brand-emblem brand-emblem-sm" style={{borderRadius:6}}><Icon name="bolt" className="icon-fill" /></div>
              <span className="footer-brand-name">Kyle Corp</span>
            </div>
            <p className="footer-tagline">Refinery Data Mesh &amp; Oil Trading Platform — connecting the right data to the right people across the entire value chain.</p>
            <div className="footer-social">
              <a href="#" className="social-btn" style={{borderRadius:8}}><Icon name="language" size="sm" /></a>
              <a href="#" className="social-btn" style={{borderRadius:8}}><Icon name="mail" size="sm" /></a>
            </div>
          </div>
          <div className="footer-cols">
            {[
              { title:'Platform',  links:['Operations Portal','Maintenance Hub','Compliance Suite','API Documentation'] },
              { title:'Products',  links:['Brent Crude','ULSD','Jet A-1','Naphtha','LPG','Request Custom'] },
              { title:'Company',   links:['About Us','Careers','Press','Partners'] },
              { title:'Legal',     links:['Privacy Policy','Terms of Service','Security','Cookie Policy'] },
            ].map(col => (
              <div key={col.title} className="footer-col">
                <div className="footer-col-title">{col.title}</div>
                {col.links.map(l => <a key={l} href="#" className="footer-col-link">{l}</a>)}
              </div>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Kyle Corp Energy Services Ltd. All rights reserved.</span>
          <span>IEC 62443 · ISO 27001 · ISO 9001 Certified</span>
        </div>
      </footer>

      {/* ── Quote Request Modal ── */}
      {quoteItem && (
        <ModalOverlay onClose={() => setQuoteItem(null)}>
          <div className="modal" style={{borderRadius:14}}>
            <div className="modal-head">
              <div>
                <div className="modal-title">{quoteItem.name}</div>
                <div className="modal-sub">{quoteItem.origin}</div>
              </div>
              <button className="modal-close" onClick={() => setQuoteItem(null)}><Icon name="close" /></button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
                <div style={{background:'var(--gold-dim)',border:'1px solid var(--gold-border)',borderRadius:10,padding:'12px 20px',flex:1,textAlign:'center'}}>
                  <div style={{fontFamily:'JetBrains Mono',fontSize:24,fontWeight:700,color:'var(--gold)'}}>{quoteItem.price}</div>
                  <div style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.1em'}}>Indicative price {quoteItem.unit}</div>
                </div>
                <div style={{background:'var(--surface-hi)',borderRadius:10,padding:'12px 20px',flex:1}}>
                  {quoteItem.specs.map(([k,v]) => (
                    <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'3px 0',borderBottom:'1px solid var(--border)'}}>
                      <span style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--text-muted)',textTransform:'uppercase'}}>{k}</span>
                      <span style={{fontFamily:'JetBrains Mono',fontSize:10,color:'var(--text)',fontWeight:600}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label">Company Name</label>
                <input className="field" placeholder="Your refinery or trading company…" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input className="field" type="email" placeholder="trader@company.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Desired Volume</label>
                  <input className="field" placeholder={`Min. ${quoteItem.specs[2][1]}`} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Preference</label>
                <select className="field">
                  <option>FOB — Free on Board</option><option>CIF — Cost, Insurance &amp; Freight</option><option>Ex-Tank</option><option>DDP — Delivered Duty Paid</option>
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost btn-sm" onClick={() => setQuoteItem(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm btn-pill" onClick={() => { setQuoteItem(null) }}>
                <Icon name="send" size="sm" /> Submit Quote Request
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin, onBack, onRegister }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = e => {
    e.preventDefault()
    if (!username || !password) { setError('Please enter your username and password.'); return }
    setLoading(true); setError('')
    setTimeout(() => { setLoading(false); onLogin() }, 950)
  }

  return (
    <div className="auth-split">
      <div className="auth-split-bg" style={{ backgroundImage: `url(${IMG.loginBg})` }} />
      <div className="auth-split-mask" />
      <div className="auth-split-brand">
        <div className="brand-emblem brand-emblem-sm"><Icon name="bolt" className="icon-fill" /></div>
        Kyle Corp
      </div>
      <button className="auth-split-menu" onClick={onBack} title="Back to site"><span /><span /><span /></button>
      <div className="auth-split-greeting">
        <div className="auth-split-greeting-text">Operational.</div>
        <div className="auth-split-greeting-sub">Refinery Data Mesh Platform</div>
      </div>
      <div className="auth-split-card">
        <div className="auth-split-card-title">Sign in</div>
        {error && <div className="auth-card-error"><Icon name="error" size="sm" /> {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="auth-ul-group">
            <label className="auth-ul-label">Username</label>
            <input className="auth-ul-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="operator@meridianref.com" autoFocus />
          </div>
          <div className="auth-ul-group">
            <label className="auth-ul-label">Password</label>
            <input className="auth-ul-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" />
          </div>
          <button className="btn-teal-pill" type="submit" disabled={loading}>{loading ? 'Authenticating…' : 'Sign In'}</button>
        </form>
        <div className="auth-split-links">
          <button onClick={onRegister}>Create new account</button>
          <a href="#">Forgot password?</a>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   REGISTER PAGE
   ══════════════════════════════════════════════════════════════ */
function RegisterPage({ onRegister, onBack, onLogin }) {
  const [step, setStep]   = useState(1)
  const [form, setForm]   = useState({ name:'', email:'', password:'', confirm:'', company:'', role:'', country:'', agree: false })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const validateStep1 = () => {
    const e = {}
    if (!form.name.trim())              e.name     = 'Full name is required.'
    if (!form.email.includes('@'))      e.email    = 'Enter a valid email address.'
    if (form.password.length < 8)       e.password = 'Password must be at least 8 characters.'
    if (form.password !== form.confirm) e.confirm  = 'Passwords do not match.'
    setErrors(e); return Object.keys(e).length === 0
  }
  const validateStep2 = () => {
    const e = {}
    if (!form.company.trim()) e.company = 'Company name is required.'
    if (!form.country)        e.country = 'Please select a country.'
    if (!form.agree)          e.agree   = 'You must accept the terms to continue.'
    setErrors(e); return Object.keys(e).length === 0
  }

  if (step === 3) return (
    <div className="auth-split">
      <div className="auth-split-bg" style={{ backgroundImage: `url(${IMG.loginBg})` }} />
      <div className="auth-split-mask" />
      <div className="auth-split-brand"><div className="brand-emblem brand-emblem-sm"><Icon name="bolt" className="icon-fill" /></div>Kyle Corp</div>
      <div className="auth-split-greeting">
        <div className="auth-split-greeting-text">Welcome.</div>
        <div className="auth-split-greeting-sub">Access granted — pending review</div>
      </div>
      <div className="auth-split-card" style={{textAlign:'center'}}>
        <div style={{marginBottom:20}}><Icon name="check_circle" className="icon-fill" style={{color:'#00c2a0',fontSize:56}} /></div>
        <div className="auth-split-card-title" style={{fontSize:24,marginBottom:8}}>Account Requested</div>
        <p style={{fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.65,marginBottom:32}}>
          Your access request has been submitted, <strong style={{color:'rgba(255,255,255,0.7)'}}>{form.name.split(' ')[0]}</strong>. Our team will verify your site credentials and send role-based access to <strong style={{color:'rgba(255,255,255,0.7)'}}>{form.email}</strong> within one business day.
        </p>
        <button className="btn-teal-pill" style={{margin:'0 0 16px'}} onClick={onRegister}>Continue to Portal</button>
        <div className="auth-split-links" style={{justifyContent:'center'}}><a href="mailto:onboarding@kylecorp.com">onboarding@kylecorp.com</a></div>
      </div>
    </div>
  )

  return (
    <div className="auth-split">
      <div className="auth-split-bg" style={{ backgroundImage: `url(${IMG.loginBg})` }} />
      <div className="auth-split-mask" />
      <div className="auth-split-brand"><div className="brand-emblem brand-emblem-sm"><Icon name="bolt" className="icon-fill" /></div>Kyle Corp</div>
      <button className="auth-split-menu" onClick={step === 1 ? onBack : () => setStep(1)} title="Back"><span /><span /><span /></button>
      <div className="auth-split-greeting">
        <div className="auth-split-greeting-text">Join Us.</div>
        <div className="auth-split-greeting-sub">Refinery Data Mesh Platform</div>
      </div>
      <div className="auth-split-card">
        <div className="auth-split-steps" style={{marginBottom:28}}>
          {['Account','Site Info'].map((s, i) => (
            <div key={s} className={`auth-split-step ${step > i+1 ? 'done' : step === i+1 ? 'active' : ''}`}>
              <div className="auth-split-step-num">{step > i+1 ? <Icon name="check" size="sm" /> : i+1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>
        {step === 1 && (
          <>
            <div className="auth-split-card-title-sm">Create your account</div>
            <div className="auth-split-card-sub">Operator, engineer or analyst — we'll configure your role.</div>
            <div className="auth-ul-group">
              <label className="auth-ul-label">Full Name</label>
              <input className={`auth-ul-input ${errors.name ? 'field-error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" autoFocus />
              {errors.name && <span className="field-err-msg">{errors.name}</span>}
            </div>
            <div className="auth-ul-group">
              <label className="auth-ul-label">Work Email</label>
              <input className={`auth-ul-input ${errors.email ? 'field-error' : ''}`} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@refinery.com" />
              {errors.email && <span className="field-err-msg">{errors.email}</span>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="auth-ul-group">
                <label className="auth-ul-label">Password</label>
                <input className={`auth-ul-input ${errors.password ? 'field-error' : ''}`} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 chars" />
                {errors.password && <span className="field-err-msg">{errors.password}</span>}
              </div>
              <div className="auth-ul-group">
                <label className="auth-ul-label">Confirm</label>
                <input className={`auth-ul-input ${errors.confirm ? 'field-error' : ''}`} type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Repeat" />
                {errors.confirm && <span className="field-err-msg">{errors.confirm}</span>}
              </div>
            </div>
            <button className="btn-teal-pill" style={{marginTop:20}} type="button" onClick={() => { if (validateStep1()) setStep(2) }}>Continue</button>
            <div className="auth-split-links"><button onClick={onLogin}>Already have an account? Sign in</button></div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="auth-split-card-title-sm">Site information</div>
            <div className="auth-split-card-sub">Helps us verify your site and configure role permissions.</div>
            <div className="auth-ul-group">
              <label className="auth-ul-label">Company / Operator</label>
              <input className={`auth-ul-input ${errors.company ? 'field-error' : ''}`} value={form.company} onChange={e => set('company', e.target.value)} placeholder="Meridian Refinery Ltd." autoFocus />
              {errors.company && <span className="field-err-msg">{errors.company}</span>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="auth-ul-group">
                <label className="auth-ul-label">Your Role</label>
                <select className="auth-ul-input" style={{color:form.role?'#fff':'rgba(255,255,255,0.4)'}} value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="">Select…</option>
                  {['Control Room Operator','Shift Engineer','Maintenance Planner','Reliability Engineer','Process Engineer','Supply Chain Manager','Compliance Officer','Plant Manager','Executive / Analyst'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="auth-ul-group">
                <label className="auth-ul-label">Country</label>
                <select className={`auth-ul-input ${errors.country ? 'field-error' : ''}`} style={{color:form.country?'#fff':'rgba(255,255,255,0.4)'}} value={form.country} onChange={e => set('country', e.target.value)}>
                  <option value="">Select…</option>
                  {['United States','United Kingdom','Germany','Netherlands','Singapore','UAE','Norway','Canada','Australia','Nigeria','Saudi Arabia'].map(c => <option key={c}>{c}</option>)}
                </select>
                {errors.country && <span className="field-err-msg">{errors.country}</span>}
              </div>
            </div>
            <label style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12,color:'rgba(255,255,255,0.4)',cursor:'pointer',lineHeight:1.55,marginBottom:4}}>
              <input type="checkbox" checked={form.agree} onChange={e => set('agree', e.target.checked)} style={{marginTop:3,accentColor:'#00c2a0',flexShrink:0}} />
              I agree to Kyle Corp's <a href="#" style={{color:'#00c2a0',marginLeft:4}}>Terms of Service</a> and <a href="#" style={{color:'#00c2a0',marginLeft:4}}>Privacy Policy</a>
            </label>
            {errors.agree && <span className="field-err-msg">{errors.agree}</span>}
            <button className={`btn-teal-pill ${loading?'btn-loading':''}`} style={{marginTop:16}} onClick={() => { if (validateStep2()) { setLoading(true); setTimeout(() => { setLoading(false); setStep(3) }, 1200) } }} disabled={loading}>
              {loading ? 'Submitting…' : 'Request Access'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PERSONA SELECTOR
   ══════════════════════════════════════════════════════════════ */
function PersonaSelector({ onSelect }) {
  const personas = [
    { key:'operations',  icon:'sensors',    name:'Control Room / Operations', desc:'Real-time alarms, equipment status, live telemetry, shift handover.' },
    { key:'maintenance', icon:'build',      name:'Maintenance & Reliability', desc:'Work orders, equipment health scores, predictive maintenance alerts.' },
    { key:'production',  icon:'factory',    name:'Process / Production',      desc:'Throughput KPIs, yield analytics, bottleneck detection, BI exports.' },
    { key:'supply',      icon:'inventory',  name:'Supply Chain & Inventory',  desc:'Feedstock levels, reorder triggers, supplier ETA, ERP integration.' },
    { key:'compliance',  icon:'gavel',      name:'Compliance & Safety',       desc:'Immutable audit logs, emissions reports, incident management.' },
    { key:'executive',   icon:'dashboard',  name:'Executive / Plant Manager', desc:'High-level KPIs, uptime, cost of delay, SLA compliance, incident summaries.' },
  ]
  return (
    <div className="persona-screen">
      <div className="brand-emblem" style={{marginBottom:24,width:40,height:40}}><Icon name="bolt" className="icon-fill icon-lg" /></div>
      <div className="persona-title">Welcome to Kyle Corp Data Mesh</div>
      <div className="persona-sub">Select your role to load your tailored view</div>
      <div className="persona-grid">
        {personas.map(p => (
          <button key={p.key} className="persona-card" onClick={() => onSelect(p.key)}>
            <div className="persona-icon-wrap"><Icon name={p.icon} className="icon-lg icon-fill" /></div>
            <div className="persona-name">{p.name}</div>
            <div className="persona-desc">{p.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD VIEWS
   ══════════════════════════════════════════════════════════════ */

/* ── Operations ── */
function OperationsView({ alarms, setAlarms, search }) {
  const [selectedAlarm, setSelectedAlarm] = useState(null)
  const q = search.toLowerCase()
  const filtered = alarms.filter(a => !q || [a.id, a.tag, a.desc, a.unit, a.priority].some(v => v.toLowerCase().includes(q)))
  const handleAck = id => setAlarms(p => p.map(x => x.id === id ? {...x, acked: true} : x))
  const handleAckAll = () => setAlarms(p => p.map(x => ({...x, acked: true})))
  const unacked = alarms.filter(a => !a.acked).length

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Operations</h1>
          <p className="view-subtitle">Control Room · Live Alarm Console · Crude Distillation Unit</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div className="live-indicator" style={{color:'var(--green)'}}><span className="live-dot" />Live: Synchronized</div>
          {unacked > 0 && <button className="btn btn-outline btn-sm" onClick={handleAckAll}><Icon name="done_all" size="sm" /> Ack All ({unacked})</button>}
        </div>
      </div>

      {alarms.some(a => a.priority === 'critical' && !a.acked) && (
        <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'var(--radius)',padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10,fontSize:12}}>
          <Icon name="emergency" style={{color:'var(--red)',fontSize:18}} />
          <span style={{color:'var(--red)',fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>
            {alarms.filter(a=>a.priority==='critical'&&!a.acked).length} CRITICAL ALARM{alarms.filter(a=>a.priority==='critical'&&!a.acked).length>1?'S':''} REQUIRE ATTENTION
          </span>
          <span style={{color:'var(--text-muted)',fontSize:11,flex:1}}>Acknowledge all critical alarms before end of shift.</span>
        </div>
      )}

      <div className="card" style={{padding:0,marginBottom:14}}>
        <div className="card-head">
          <span className="card-title"><Icon name="notifications_active" size="sm" /> Active Alarm Log</span>
          <span className="label-caps">{unacked} unacknowledged</span>
        </div>
        <table className="data-table">
          <thead><tr><th>Alarm ID</th><th>Tag</th><th>Description</th><th>Priority</th><th>Unit</th><th>Time</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="empty-row">No alarms match your search</td></tr>}
            {filtered.map(a => (
              <tr key={a.id} className={`alarm-${a.priority} clickable`} style={{opacity:a.acked?0.55:1}} onClick={() => setSelectedAlarm(a)}>
                <td className="td-gold">{a.id}</td>
                <td className="td-mono">{a.tag}</td>
                <td style={{maxWidth:240,fontSize:11}}>{a.desc}</td>
                <td><PriBadge priority={a.priority} /></td>
                <td className="td-mono" style={{fontSize:10}}>{a.unit}</td>
                <td className="td-mono">{a.ts}</td>
                <td onClick={e => e.stopPropagation()}>
                  <button className={`btn-ack ${a.acked ? 'acked' : ''}`} onClick={() => handleAck(a.id)}>
                    {a.acked ? '✓ Acked' : 'Ack'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-label" style={{marginBottom:10}}>Equipment Status — CDU Complex</div>
      <div className="equip-grid">
        {MOCK_EQUIPMENT.map(eq => (
          <div key={eq.id} className="equip-card">
            <div className="equip-tag">{eq.id}</div>
            <div className="equip-name">{eq.name}</div>
            <div className="equip-unit">{eq.unit}</div>
            <div className="equip-reading">{eq.reading}</div>
            <div className="equip-health-row">
              <span className={`equip-health-val ${eq.status}`}>{eq.health}%</span>
              <div className="health-bar-track"><div className={`health-bar-fill ${eq.status}`} style={{width:`${eq.health}%`}} /></div>
            </div>
          </div>
        ))}
      </div>

      {selectedAlarm && (
        <AlarmDetailModal alarm={selectedAlarm} onClose={() => setSelectedAlarm(null)} onAck={id => { handleAck(id); setSelectedAlarm(p => p ? {...p, acked: true} : null) }} />
      )}
    </div>
  )
}

/* ── Maintenance ── */
function MaintenanceView({ workOrders, setWorkOrders, search, showToast }) {
  const [selectedWO, setSelectedWO] = useState(null)
  const [newWOOpen, setNewWOOpen]   = useState(false)
  const woTypes = { corrective:'badge-red', predictive:'badge-blue', preventive:'badge-gray' }
  const q = search.toLowerCase()
  const filtered = workOrders.filter(w => !q || [w.id, w.equipment, w.desc, w.priority, w.status, w.type].some(v => v.toLowerCase().includes(q)))

  const handleAddWO = wo => { setWorkOrders(p => [wo, ...p]); showToast(`Work order ${wo.id} created`, 'success') }
  const handleUpdateWO = (id, status) => {
    setWorkOrders(p => p.map(w => w.id === id ? {...w, status} : w))
    showToast(`Work order ${id} → ${status}`, 'info')
  }

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Maintenance</h1>
          <p className="view-subtitle">Reliability Engineering · Work Orders · Equipment Health</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setNewWOOpen(true)}><Icon name="add" size="sm" /> New Work Order</button>
      </div>

      <div className="kpi-row" style={{marginBottom:16}}>
        <div className="kpi-card"><div className="kpi-label"><Icon name="pending_actions" size="sm" /> Open WOs</div><div className="kpi-val">{workOrders.filter(w=>w.status!=='closed').length}</div><div className="kpi-sub">2 overdue</div></div>
        <div className="kpi-card"><div className="kpi-label"><Icon name="warning" size="sm" /> Critical Health</div><div className="kpi-val">1</div><div className="kpi-sub text-red">CDU-P101 at 42%</div></div>
        <div className="kpi-card"><div className="kpi-label"><Icon name="schedule" size="sm" /> MTTR (7-day)</div><div className="kpi-val">4.2h</div><div className="kpi-sub kpi-trend-up"><Icon name="trending_down" size="sm" /> −12% vs. prior</div></div>
        <div className="kpi-card"><div className="kpi-label"><Icon name="auto_fix_high" size="sm" /> Predictive Alerts</div><div className="kpi-val">3</div><div className="kpi-sub">Active model outputs</div></div>
      </div>

      <div className="dash-two-col">
        <div className="card" style={{padding:0}}>
          <div className="card-head"><span className="card-title"><Icon name="list_alt" size="sm" /> Work Order Queue</span><span className="label-caps">{filtered.length} orders</span></div>
          <table className="data-table">
            <thead><tr><th>WO ID</th><th>Equipment</th><th>Type</th><th>Description</th><th>Priority</th><th>Status</th><th>ETA</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="empty-row">No work orders match your search</td></tr>}
              {filtered.map(w => (
                <tr key={w.id} className="clickable" onClick={() => setSelectedWO(w)}>
                  <td className="td-gold">{w.id}</td>
                  <td className="td-mono">{w.equipment}</td>
                  <td><span className={`badge ${woTypes[w.type]}`}>{w.type}</span></td>
                  <td style={{maxWidth:180,fontSize:11}}>{w.desc}</td>
                  <td><PriBadge priority={w.priority} /></td>
                  <td><StatusBadge status={w.status} /></td>
                  <td className="td-mono">{w.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{padding:0}}>
          <div className="card-head"><span className="card-title"><Icon name="health_and_safety" size="sm" /> Equipment Health Scores</span></div>
          <table className="data-table">
            <thead><tr><th>Tag</th><th>Name</th><th>Health</th><th>Reading</th></tr></thead>
            <tbody>
              {MOCK_EQUIPMENT.map(eq => (
                <tr key={eq.id}>
                  <td className="td-gold">{eq.id}</td>
                  <td style={{fontSize:11}}>{eq.name}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span className={`equip-health-val ${eq.status}`} style={{fontSize:13,minWidth:36}}>{eq.health}%</span>
                      <div className="health-bar-track" style={{flex:1}}><div className={`health-bar-fill ${eq.status}`} style={{width:`${eq.health}%`}} /></div>
                    </div>
                  </td>
                  <td className="td-mono" style={{fontSize:10}}>{eq.reading}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {newWOOpen && <NewWorkOrderModal onClose={() => setNewWOOpen(false)} onAdd={handleAddWO} />}
      {selectedWO && <WorkOrderDetailModal wo={selectedWO} onClose={() => setSelectedWO(null)} onUpdate={handleUpdateWO} />}
    </div>
  )
}

/* ── Production ── */
function ProductionView({ search, showToast }) {
  const barMax = Math.max(...MOCK_PROD_DATA)
  const handleExport = () => {
    const rows = [['Hour','Throughput (bbl/hr)'], ...MOCK_PROD_DATA.map((v, i) => [`${String(i).padStart(2,'0')}:00`, v * 100])]
    downloadCSV(`production-throughput-${new Date().toISOString().slice(0,10)}.csv`, rows)
    showToast('Production data exported as CSV', 'success')
  }
  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Production</h1>
          <p className="view-subtitle">Process Analytics · Throughput · Yield · Shift Metrics</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleExport}><Icon name="download" size="sm" /> Export CSV</button>
      </div>

      <div className="kpi-row" style={{marginBottom:16}}>
        <div className="kpi-card"><div className="kpi-label"><Icon name="oil_barrel" size="sm" /> Today Throughput</div><div className="kpi-val">182,400</div><div className="kpi-sub td-mono">bbl/day</div></div>
        <div className="kpi-card"><div className="kpi-label"><Icon name="percent" size="sm" /> Distillate Yield</div><div className="kpi-val">87.3%</div><div className="kpi-sub kpi-trend-down"><Icon name="trending_down" size="sm" /> −0.4% vs. target</div></div>
        <div className="kpi-card"><div className="kpi-label"><Icon name="thermostat" size="sm" /> Avg Furnace Temp</div><div className="kpi-val">682°C</div><div className="kpi-sub kpi-trend-up">On setpoint</div></div>
        <div className="kpi-card"><div className="kpi-label"><Icon name="speed" size="sm" /> Unit Uptime (7d)</div><div className="kpi-val">94.7%</div><div className="kpi-sub kpi-trend-up"><Icon name="trending_up" size="sm" /> +0.8%</div></div>
      </div>

      <div className="dash-two-col">
        <div className="card">
          <div className="card-head"><span className="card-title"><Icon name="bar_chart" size="sm" /> Throughput — Last 24 Hours (bbl/hr)</span></div>
          <div className="card-body">
            <div className="prod-bars">
              {MOCK_PROD_DATA.map((v, i) => (
                <div key={i} className={`prod-bar-item ${v===barMax?'peak':''}`} style={{height:`${(v/barMax)*100}%`}} title={`${String(i).padStart(2,'0')}:00 — ${v*100} bbl/hr`} />
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
              <span className="label-caps">00:00</span><span className="label-caps">12:00</span><span className="label-caps">23:00</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title"><Icon name="analytics" size="sm" /> Process KPIs</span></div>
          <div className="acct-summary">
            {[
              ['Crude Feed Rate','7,600 bbl/hr','td-mono'],
              ['LPG Yield','8.2%','td-mono text-amber'],
              ['Naphtha Cut','24.1%','td-mono'],
              ['Kerosene / Jet','18.7%','td-mono'],
              ['Gas Oil Yield','31.4%','td-mono'],
              ['Residue','17.6%','td-mono text-muted'],
              ['Energy Intensity','112 MJ/bbl','td-mono'],
              ['Emissions Intensity','14.2 kg CO₂/bbl','td-mono'],
            ].map(([k,v,cls]) => (
              <div key={k} className="acct-row"><span>{k}</span><span className={cls}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Supply Chain ── */
function SupplyChainView({ inventory, setInventory, search, showToast }) {
  const [poItem, setPoItem]       = useState(null)
  const [erpSyncing, setErpSyncing] = useState(false)
  const q = search.toLowerCase()
  const filtered = inventory.filter(i => !q || [i.sku, i.name, i.category, i.status].some(v => v.toLowerCase().includes(q)))

  const handleSyncERP = () => {
    setErpSyncing(true)
    setTimeout(() => { setErpSyncing(false); showToast('ERP sync complete — 6 inventory records updated', 'success') }, 2200)
  }
  const handleConfirmPO = (item, qty, supplier) => {
    showToast(`PO submitted: ${qty} × ${item.sku} from ${supplier}`, 'success')
  }

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Supply Chain</h1>
          <p className="view-subtitle">Inventory Monitoring · Feedstock · Reorder Alerts · ERP Sync</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleSyncERP} disabled={erpSyncing}>
          <Icon name="sync" size="sm" className={erpSyncing ? 'spin' : ''} /> {erpSyncing ? 'Syncing…' : 'Sync ERP'}
        </button>
      </div>

      {inventory.some(i => i.status === 'critical') && (
        <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'var(--radius)',padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10,fontSize:12}}>
          <Icon name="inventory_2" style={{color:'var(--red)'}} />
          <span style={{color:'var(--red)',fontFamily:'JetBrains Mono',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>
            Stock-out: MECH-SEAL-P1 — 0 units. WO-20841 is blocked.
          </span>
          <button className="btn btn-sm btn-danger" style={{marginLeft:'auto'}} onClick={() => setPoItem(inventory.find(i=>i.sku==='MECH-SEAL-P1'))}>
            <Icon name="add" size="sm" /> Create PO
          </button>
        </div>
      )}

      <div className="section-label" style={{marginBottom:10}}>Stock Levels</div>
      <div className="inv-grid">
        {filtered.map(item => {
          const pct = Math.min(100, (item.stock / (item.reorder * 2)) * 100)
          return (
            <div key={item.sku} className={`inv-card inv-${item.status}`}>
              <div className="inv-sku">{item.sku}</div>
              <div className="inv-name">{item.name}</div>
              <div className="inv-stock-unit">{item.category}</div>
              <div className={`inv-stock ${item.status}`}>{item.stock > 999 ? fmtNum(item.stock) : item.stock}</div>
              <div className="inv-stock-unit">{item.unit} on hand</div>
              <div className="inv-bar-wrap">
                <div className="inv-bar-label"><span>Stock level</span><span>Reorder: {item.reorder > 999 ? fmtNum(item.reorder) : item.reorder}</span></div>
                <div className="inv-bar"><div className={`inv-bar-fill ${item.status}`} style={{width:`${pct}%`}} /></div>
              </div>
              {(item.status === 'critical' || item.status === 'low') && (
                <button className="btn btn-sm btn-danger" style={{width:'100%',marginTop:10}} onClick={() => setPoItem(item)}>
                  <Icon name="add_shopping_cart" size="sm" /> Create PO
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="card" style={{padding:0}}>
        <div className="card-head"><span className="card-title"><Icon name="local_shipping" size="sm" /> Inbound Shipments</span></div>
        <table className="data-table">
          <thead><tr><th>Shipment ID</th><th>Material</th><th>Qty</th><th>Supplier</th><th>ETA</th><th>Status</th></tr></thead>
          <tbody>
            {[
              { id:'SHP-4481', mat:'Brent Crude Feedstock', qty:'200,000 bbl', sup:'NNPC',        eta:'2026-05-22', status:'in-transit'  },
              { id:'SHP-4479', mat:'Mech Seal CDU-P101',    qty:'4 units',     sup:'SKF Direct',  eta:'2026-05-21', status:'processing'  },
              { id:'SHP-4471', mat:'HCl 35% Drums',         qty:'24 drums',    sup:'INEOS Chem.', eta:'2026-05-24', status:'in-transit'  },
              { id:'SHP-4460', mat:'Turbine Oil VG46',      qty:'10 drums',    sup:'Shell Lubr.', eta:'2026-05-26', status:'processing'  },
            ].map(s => (
              <tr key={s.id}>
                <td className="td-gold">{s.id}</td><td>{s.mat}</td><td className="td-mono">{s.qty}</td>
                <td>{s.sup}</td><td className="td-mono">{s.eta}</td><td><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {poItem && <PurchaseOrderModal item={poItem} onClose={() => setPoItem(null)} onConfirm={handleConfirmPO} />}
    </div>
  )
}

/* ── Compliance ── */
function ComplianceView({ incidents, setIncidents, search, showToast }) {
  const [selectedInc, setSelectedInc] = useState(null)
  const q = search.toLowerCase()
  const filteredInc = incidents.filter(i => !q || [i.id, i.type, i.unit, i.desc, i.severity, i.status].some(v => v.toLowerCase().includes(q)))

  const handleExportBundle = () => {
    downloadJSON(`audit-bundle-${new Date().toISOString().slice(0,10)}.json`, { exported: new Date().toISOString(), audit_log: MOCK_AUDIT_LOG, incidents })
    showToast('Audit bundle exported as JSON', 'success')
  }
  const handleCloseIncident = id => {
    setIncidents(p => p.map(i => i.id === id ? {...i, status: 'closed'} : i))
    showToast(`Incident ${id} closed`, 'success')
  }

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Compliance</h1>
          <p className="view-subtitle">Safety · Audit Trails · Incident Management · Regulatory Reporting</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleExportBundle}><Icon name="file_download" size="sm" /> Export Audit Bundle</button>
      </div>

      <div className="kpi-row" style={{marginBottom:14}}>
        <div className="kpi-card"><div className="kpi-label"><Icon name="report_problem" size="sm" /> Open Incidents</div><div className="kpi-val text-red">{incidents.filter(i=>i.status==='open').length}</div><div className="kpi-sub">INC-0198 critical</div></div>
        <div className="kpi-card"><div className="kpi-label"><Icon name="eco" size="sm" /> Emissions Compliance</div><div className="kpi-val">98.1%</div><div className="kpi-sub kpi-trend-up">On target</div></div>
        <div className="kpi-card"><div className="kpi-label"><Icon name="event_note" size="sm" /> Audit Events (7d)</div><div className="kpi-val">2,841</div><div className="kpi-sub">Immutable · tamper-evident</div></div>
        <div className="kpi-card"><div className="kpi-label"><Icon name="lock" size="sm" /> PII Masking</div><div className="kpi-val text-green">Active</div><div className="kpi-sub">All analytic views</div></div>
      </div>

      <div className="support-layout">
        <div className="support-left">
          <div className="card" style={{padding:0}}>
            <div className="card-head"><span className="card-title"><Icon name="crisis_alert" size="sm" /> Incident Register</span><span className="label-caps">{filteredInc.length} records</span></div>
            <table className="data-table">
              <thead><tr><th>INC ID</th><th>Type</th><th>Unit</th><th>Description</th><th>Severity</th><th>Status</th><th>Reported</th></tr></thead>
              <tbody>
                {filteredInc.length === 0 && <tr><td colSpan={7} className="empty-row">No incidents match your search</td></tr>}
                {filteredInc.map(inc => (
                  <tr key={inc.id} className="clickable" onClick={() => setSelectedInc(inc)}>
                    <td className="td-gold">{inc.id}</td>
                    <td><span className="badge badge-gray">{inc.type}</span></td>
                    <td className="td-mono">{inc.unit}</td>
                    <td style={{maxWidth:200,fontSize:11}}>{inc.desc}</td>
                    <td><PriBadge priority={inc.severity} /></td>
                    <td><StatusBadge status={inc.status} /></td>
                    <td className="td-mono" style={{fontSize:9}}>{inc.reported}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{padding:0}}>
            <div className="card-head">
              <span className="card-title"><Icon name="history" size="sm" /> Immutable Audit Log</span>
              <span className="live-indicator" style={{color:'var(--green)'}}><span className="live-dot" />Live</span>
            </div>
            <div className="timeline">
              {MOCK_AUDIT_LOG.map(ev => (
                <div key={ev.id} className="timeline-row">
                  <span className="timeline-time">{ev.ts}</span>
                  <span className="timeline-dot" style={{background: ev.level==='critical'?'var(--red)':ev.level==='high'?'var(--amber)':ev.level==='info'?'var(--blue)':'var(--text-muted)'}} />
                  <div className="timeline-body">{ev.action}<div className="timeline-id">{ev.id} · {ev.actor}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="support-right">
          <div className="card card-gold-border">
            <div className="card-head"><span className="card-title"><Icon name="policy" size="sm" /> Retention Policies</span></div>
            {[['Alarm Events','7 years'],['Work Order Records','10 years'],['Incident Reports','25 years'],['Sensor Telemetry','5 years'],['Access Logs','7 years']].map(([k,v]) => (
              <div key={k} className="channel-section">
                <div className="channel-key">{k}</div>
                <div className="channel-val" style={{fontSize:13}}>{v}<Icon name="check_circle" size="sm" style={{color:'var(--green)'}} /></div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title"><Icon name="eco" size="sm" /> Emissions Dashboard</span></div>
            <div className="card-body">
              {[['CO₂ (MTD)','14.2 kg/bbl','ok'],['NOₓ','12 ppm','ok'],['SOₓ','9 ppm','warning'],['Particulate','18 mg/Nm³','ok']].map(([k,v,s]) => (
                <div key={k} className="acct-row"><span>{k}</span><span className={`td-mono ${s==='warning'?'text-amber':'text-green'}`}>{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedInc && <IncidentDetailModal inc={selectedInc} onClose={() => setSelectedInc(null)} onCloseIncident={handleCloseIncident} />}
    </div>
  )
}

/* ── Executive ── */
function ExecutiveView({ incidents, showToast }) {
  const [selectedInc, setSelectedInc] = useState(null)

  const handleWeeklyReport = () => {
    const rows = [['KPI','Value','Change','Direction'], ...Object.values(MOCK_EXEC_KPI).map(k => [k.label, k.val, k.delta, k.dir])]
    downloadCSV(`weekly-report-${new Date().toISOString().slice(0,10)}.csv`, rows)
    showToast('Weekly report exported as CSV', 'success')
  }

  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">Executive Overview</h1>
          <p className="view-subtitle">Plant Manager Dashboard · {new Date().toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleWeeklyReport}><Icon name="share" size="sm" /> Weekly Report</button>
      </div>

      <div className="exec-kpi-grid">
        {Object.values(MOCK_EXEC_KPI).map(kpi => (
          <div key={kpi.label} className="exec-kpi">
            <div className="exec-kpi-val">{kpi.val}</div>
            <div className="exec-kpi-label">{kpi.label}</div>
            <div className={`exec-kpi-delta ${kpi.dir}`}><Icon name={kpi.dir==='up'?'trending_up':'trending_down'} size="sm" />{kpi.delta}</div>
          </div>
        ))}
      </div>

      <div className="dash-two-col">
        <div className="card" style={{padding:0}}>
          <div className="card-head"><span className="card-title"><Icon name="crisis_alert" size="sm" /> Active Incidents</span></div>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Type</th><th>Unit</th><th>Severity</th><th>Status</th></tr></thead>
            <tbody>
              {incidents.filter(i=>i.status==='open').length === 0 && <tr><td colSpan={5} className="empty-row">No open incidents</td></tr>}
              {incidents.filter(i=>i.status==='open').map(inc => (
                <tr key={inc.id} className="clickable" onClick={() => setSelectedInc(inc)}>
                  <td className="td-gold">{inc.id}</td><td style={{fontSize:11}}>{inc.type}</td>
                  <td className="td-mono">{inc.unit}</td><td><PriBadge priority={inc.severity} /></td>
                  <td><StatusBadge status={inc.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{padding:0}}>
          <div className="card-head"><span className="card-title"><Icon name="insights" size="sm" /> ROI Metrics (7-day)</span></div>
          <div className="acct-summary">
            {[
              ['Prevented Failures','2','td-mono text-green'],
              ['Estimated Savings','$480,000','td-mono text-green'],
              ['Avoided Downtime','14.5 hrs','td-mono'],
              ['Stockout Prevention','1 event','td-mono'],
              ['Analyst Query Time','−68%','td-mono text-green'],
              ['New Data Products Live','3','td-mono'],
              ['Mesh Data Volume (7d)','42.1 GB','td-mono'],
              ['Avg Event Latency','14ms','td-mono text-green'],
            ].map(([k,v,cls]) => (
              <div key={k} className="acct-row"><span>{k}</span><span className={cls}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>

      {selectedInc && <IncidentDetailModal inc={selectedInc} onClose={() => setSelectedInc(null)} onCloseIncident={id => { showToast(`Incident ${id} closed`, 'success') }} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD SHELL
   ══════════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  { key:'executive',   label:'Executive',    icon:'dashboard',  breadcrumb:'Executive Overview'         },
  { key:'operations',  label:'Operations',   icon:'sensors',    breadcrumb:'Operations · Control Room'  },
  { key:'maintenance', label:'Maintenance',  icon:'build',      breadcrumb:'Maintenance · Reliability'  },
  { key:'production',  label:'Production',   icon:'factory',    breadcrumb:'Production · Analytics'     },
  { key:'supply',      label:'Supply Chain', icon:'inventory',  breadcrumb:'Supply Chain · Inventory'   },
  { key:'compliance',  label:'Compliance',   icon:'gavel',      breadcrumb:'Compliance · Safety'        },
]
const PERSONA_DEFAULT = { operations:'operations', maintenance:'maintenance', production:'production', supply:'supply', compliance:'compliance', executive:'executive' }

function Dashboard({ persona, onLogout }) {
  const [page, setPage]           = useState(PERSONA_DEFAULT[persona] || 'executive')
  const [alarms, setAlarms]       = useState(INIT_ALARMS)
  const [workOrders, setWorkOrders] = useState(INIT_WORK_ORDERS)
  const [inventory, setInventory] = useState(INIT_INVENTORY)
  const [incidents, setIncidents] = useState(INIT_INCIDENTS)
  const [search, setSearch]       = useState('')
  const [toast, setToast]         = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const notifRef = useRef(null)

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  /* click-outside for notification dropdown */
  useEffect(() => {
    if (!notifOpen) return
    const h = e => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [notifOpen])

  const activeNav = NAV_ITEMS.find(n => n.key === page)
  const initials  = MOCK_USER.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
  const unackedCritical = alarms.filter(a => a.priority === 'critical' && !a.acked).length
  const totalNotifs = alarms.filter(a => !a.acked).length + incidents.filter(i => i.status === 'open').length

  /* clear search on page change */
  useEffect(() => { setSearch('') }, [page])

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        <div className="dash-sidebar-brand">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div className="brand-emblem brand-emblem-sm"><Icon name="bolt" className="icon-fill" /></div>
            <div>
              <div className="dash-sidebar-brand-name">Command Center</div>
              <div className="dash-sidebar-subtitle">Kafka Backbone Active</div>
            </div>
          </div>
        </div>

        <nav className="dash-nav">
          {NAV_ITEMS.map(n => (
            <button key={n.key} className={`dash-nav-item ${page===n.key?'active':''}`} onClick={() => setPage(n.key)}>
              <Icon name={n.icon} className={`dash-nav-icon ${page===n.key?'icon-fill':''}`} />
              <span style={{flex:1}}>{n.label}</span>
              {n.key==='operations' && unackedCritical > 0 && (
                <span style={{background:'var(--red)',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:9,display:'grid',placeItems:'center',fontWeight:700,fontFamily:'JetBrains Mono'}}>{unackedCritical}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-foot">
          <div style={{padding:'6px 10px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid var(--border)',marginBottom:6}}>
            <div className="dash-avatar" style={{width:26,height:26,fontSize:10}}>{initials}</div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--text)'}}>{MOCK_USER.name}</div>
              <div style={{fontFamily:'JetBrains Mono',fontSize:9,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{MOCK_USER.role.split(' ')[0]}</div>
            </div>
          </div>
          <button className="dash-settings-btn"><Icon name="settings" size="sm" /><span>Settings</span></button>
          <button className="dash-settings-btn" onClick={onLogout}><Icon name="logout" size="sm" /><span>Sign Out</span></button>
          <button className="btn btn-emergency" onClick={() => setEmergencyOpen(true)}>
            <Icon name="emergency" size="sm" /> Emergency Contact
          </button>
        </div>
      </aside>

      <div className="dash-body">
        <header className="dash-header">
          <div className="dash-breadcrumb">
            <span className="dash-breadcrumb-brand">Kyle Corp</span>
            <span className="dash-breadcrumb-sep"><Icon name="chevron_right" size="sm" /></span>
            <span className="dash-breadcrumb-page">{activeNav?.breadcrumb}</span>
          </div>
          <div className="dash-search">
            <Icon name="search" size="sm" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alarms, work orders, events…" />
            {search && <button style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',padding:0,lineHeight:1,display:'flex'}} onClick={() => setSearch('')}><Icon name="close" size="sm" /></button>}
          </div>
          <div className="dash-header-icons">
            <div className="notif-anchor" ref={notifRef}>
              <button className="dash-icon-btn" title="Notifications" onClick={() => setNotifOpen(o => !o)} style={{position:'relative'}}>
                <Icon name="notifications" size="sm" />
                {totalNotifs > 0 && <span className="notif-badge" />}
              </button>
              {notifOpen && (
                <NotificationDropdown
                  alarms={alarms} incidents={incidents}
                  onClose={() => setNotifOpen(false)}
                  onNav={key => { setPage(key); setNotifOpen(false) }}
                />
              )}
            </div>
            <button className="dash-icon-btn" title="Help"><Icon name="help_outline" size="sm" /></button>
            <div className="dash-avatar" title={MOCK_USER.name}>{initials}</div>
          </div>
        </header>

        <main className="dash-main">
          {page==='executive'   && <ExecutiveView incidents={incidents} showToast={showToast} />}
          {page==='operations'  && <OperationsView alarms={alarms} setAlarms={setAlarms} search={search} />}
          {page==='maintenance' && <MaintenanceView workOrders={workOrders} setWorkOrders={setWorkOrders} search={search} showToast={showToast} />}
          {page==='production'  && <ProductionView search={search} showToast={showToast} />}
          {page==='supply'      && <SupplyChainView inventory={inventory} setInventory={setInventory} search={search} showToast={showToast} />}
          {page==='compliance'  && <ComplianceView incidents={incidents} setIncidents={setIncidents} search={search} showToast={showToast} />}
        </main>

        <StatusBar />
      </div>

      {emergencyOpen && <EmergencyModal onClose={() => setEmergencyOpen(false)} />}
      {toast && <Toast key={toast.msg} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   ROOT APP
   ══════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen]   = useState('landing')
  const [persona, setPersona] = useState(null)

  const handleLogin   = () => setScreen('persona')
  const handlePersona = p => { setPersona(p); setScreen('dashboard') }

  return (
    <>
      {screen==='landing'   && <LandingPage  onLogin={() => setScreen('login')} onRegister={() => setScreen('register')} />}
      {screen==='login'     && <LoginPage    onLogin={handleLogin} onBack={() => setScreen('landing')} onRegister={() => setScreen('register')} />}
      {screen==='register'  && <RegisterPage onRegister={handleLogin} onBack={() => setScreen('landing')} onLogin={() => setScreen('login')} />}
      {screen==='persona'   && <PersonaSelector onSelect={handlePersona} />}
      {screen==='dashboard' && <Dashboard persona={persona} onLogout={() => { setPersona(null); setScreen('landing') }} />}
    </>
  )
}
