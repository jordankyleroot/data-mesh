'use strict';
const express = require('express');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@clickhouse/client');
const { Kafka } = require('kafkajs');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ── ClickHouse ────────────────────────────────────────────────────────────────
const ch = createClient({
  host:     `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:${process.env.CLICKHOUSE_PORT || 8123}`,
  database: process.env.CLICKHOUSE_DATABASE || 'datamesh',
  username: 'default',
  password: '',
});

async function chQuery(sql) {
  try {
    const rs = await ch.query({ query: sql, format: 'JSONEachRow' });
    return await rs.json();
  } catch (e) {
    console.warn('ClickHouse query warning:', e.message);
    return [];
  }
}

// ── SSE broadcast ─────────────────────────────────────────────────────────────
const sseClients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch (_) { sseClients.delete(res); }
  }
}

app.get('/api/events/stream', (req, res) => {
  res.set({
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  sseClients.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

  const hb = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(hb); }
  }, 15000);

  req.on('close', () => { clearInterval(hb); sseClients.delete(res); });
});

// ── In-memory order store ─────────────────────────────────────────────────────
const orders = new Map();

const ETA = { STANDARD: 48, EXPRESS: 24, EMERGENCY: 6 };

// ── Products ──────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id:'DIESEL',          name:'Diesel',               unit:'litres',  minOrder:1000,  pricePerUnit:1.15,  available:true  },
  { id:'PETROL',          name:'Petrol (PMS)',          unit:'litres',  minOrder:1000,  pricePerUnit:0.98,  available:true  },
  { id:'LPG',             name:'LPG (Cooking Gas)',     unit:'kg',      minOrder:50,    pricePerUnit:0.82,  available:true  },
  { id:'KEROSENE',        name:'Kerosene (DPK)',        unit:'litres',  minOrder:500,   pricePerUnit:0.94,  available:true  },
  { id:'CRUDE_FEEDSTOCK', name:'Crude Oil Feedstock',  unit:'barrels', minOrder:5000,  pricePerUnit:85.00, available:false },
];

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status:'ok', service:'kyle-corp-api', ts: new Date() }));

app.get('/api/products', (_req, res) => res.json(PRODUCTS));

app.post('/api/orders', (req, res) => {
  const { customerId, customerName, product, quantityLtrs, deliveryAddress, priority } = req.body;
  if (!customerId || !customerName || !product || !quantityLtrs || !deliveryAddress) {
    return res.status(400).json({ error: 'Missing required fields: customerId, customerName, product, quantityLtrs, deliveryAddress' });
  }
  const prod = PRODUCTS.find(p => p.id === product);
  if (!prod) return res.status(400).json({ error: `Unknown product: ${product}` });
  if (!prod.available) return res.status(400).json({ error: `${prod.name} is not available for order` });

  const orderId  = `KC-${uuidv4().slice(0,8).toUpperCase()}`;
  const pri      = priority || 'STANDARD';
  const totalUsd = quantityLtrs * prod.pricePerUnit;
  const order    = {
    orderId, customerId, customerName, product, productName: prod.name,
    quantityLtrs, deliveryAddress, priority: pri, totalUsd,
    estimatedDeliveryHours: ETA[pri] || 48,
    status: 'PROCESSING', placedAt: new Date().toISOString(),
  };
  orders.set(orderId, order);

  broadcast('order_placed', { orderId, product: prod.name, quantityLtrs, customerName, status:'PROCESSING' });

  res.status(201).json({ orderId, status:'PROCESSING', estimatedDeliveryHours: order.estimatedDeliveryHours, totalUsd });
});

app.get('/api/orders/:orderId', (req, res) => {
  const o = orders.get(req.params.orderId);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  res.json(o);
});

app.get('/api/orders/customer/:customerId', (req, res) => {
  const result = [];
  for (const o of orders.values()) {
    if (o.customerId === req.params.customerId) result.push(o);
  }
  res.json(result);
});

// ── Analytics ─────────────────────────────────────────────────────────────────
app.get('/api/analytics/throughput', async (_req, res) => {
  const rows = await chQuery(
    `SELECT refineryId,
            round(sum(inputBarrels),0)  AS totalBarrels,
            round(sum(dieselYield),0)   AS diesel,
            round(sum(petrolYield),0)   AS petrol,
            round(sum(lpgYield),0)      AS lpg,
            round(sum(keroseneYield),0) AS kerosene
     FROM kc_crude_throughput
     GROUP BY refineryId`
  );
  res.json(rows);
});

app.get('/api/analytics/pipeline', async (_req, res) => {
  const rows = await chQuery(
    `SELECT pipelineId, segmentId,
            round(flowRateBph,1) AS flowRateBph,
            round(pressurePsi,1) AS pressurePsi,
            status,
            recordedAt
     FROM kc_pipeline_status
     ORDER BY recordedAt DESC
     LIMIT 20`
  );
  res.json(rows);
});

app.get('/api/analytics/deals', async (_req, res) => {
  const rows = await chQuery(
    `SELECT dealId, traderId, product, side,
            round(quantity,0)  AS quantity,
            round(priceUsd,2)  AS priceUsd,
            counterparty, executedAt
     FROM kc_deals
     ORDER BY executedAt DESC
     LIMIT 20`
  );
  res.json(rows);
});

app.get('/api/analytics/incidents', async (_req, res) => {
  const rows = await chQuery(
    `SELECT incidentId, type, severity, location, description,
            barrelsSpilled, injuredCount, reportedAt
     FROM kc_incidents
     ORDER BY reportedAt DESC
     LIMIT 10`
  );
  res.json(rows);
});

app.get('/api/analytics/deliveries', async (_req, res) => {
  const rows = await chQuery(
    `SELECT deliveryId, orderId, customerId, product,
            round(quantityLtrs,0) AS quantityLtrs, deliveredAt
     FROM kc_deliveries
     ORDER BY deliveredAt DESC
     LIMIT 20`
  );
  res.json(rows);
});

app.get('/api/analytics/revenue', async (_req, res) => {
  const rows = await chQuery(
    `SELECT product,
            round(sum(totalUsd),2) AS revenue,
            count() AS invoiceCount
     FROM kc_invoices
     GROUP BY product
     ORDER BY revenue DESC`
  );
  res.json(rows);
});

// ── Kafka consumer → SSE broadcast ───────────────────────────────────────────
async function startKafkaConsumer() {
  const kafka = new Kafka({
    clientId: 'kyle-corp-api',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: { retries: 10, initialRetryTime: 3000 },
  });
  const consumer = kafka.consumer({ groupId: 'kyle-corp-api-sse' });

  try {
    await consumer.connect();
    const topics = [
      'crude.barrel-received.critical',
      'crude.batch-processed.critical',
      'pipeline.flow-updated.standard',
      'pipeline.leak-alert.critical',
      'trading.deal-executed.critical',
      'trading.price-tick.bulk',
      'logistics.shipment-dispatched.standard',
      'logistics.delivery-confirmed.critical',
      'safety.incident-reported.critical',
      'finance.invoice-raised.standard',
      'customer.order-placed.critical',
    ];
    for (const t of topics) {
      try { await consumer.subscribe({ topic: t, fromBeginning: false }); }
      catch (e) { console.warn(`Could not subscribe to ${t}:`, e.message); }
    }

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          // Avro messages have a 5-byte magic header — strip it before JSON parse
          let raw = message.value;
          if (raw && raw[0] === 0) raw = raw.slice(5);
          const payload = JSON.parse(raw.toString());
          broadcast('domain_event', { topic, payload, ts: Date.now() });
        } catch (_) {
          // binary Avro: just broadcast topic name + timestamp
          broadcast('domain_event', { topic, payload: {}, ts: Date.now() });
        }
      },
    });
    console.log('Kafka SSE consumer ready');
  } catch (e) {
    console.warn('Kafka consumer startup failed (will retry):', e.message);
    setTimeout(startKafkaConsumer, 10000);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Kyle Corp API listening on port ${PORT}`);
  startKafkaConsumer();
});
