'use strict';
/* =====================================================================
   CuentasPro — Gestión de ventas de cuentas y perfiles de streaming
   Funciona 100% en el navegador (localStorage). No necesita servidor.
   ===================================================================== */

const KEY = 'cuentaspro_v1';
const LOGO_BASE = 'marca.jpg'; // logo de Don Streaming incluido en la app
const $ = (s, el = document) => el.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = (arr, k) => arr.reduce((t, x) => t + (Number(x[k]) || 0), 0);

/* ---------- Fechas ---------- */
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1, 12); };
const hoy = () => toISO(new Date());
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + Number(n)); return toISO(d); };
const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fecha = s => { if (!s) return '—'; const d = parseISO(s); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
const fechaCorta = s => { if (!s) return '—'; const d = parseISO(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const mesDe = s => String(s || '').slice(0, 7);
const mesLabel = ym => { const [y, m] = ym.split('-').map(Number); return `${MESES_L[m - 1]} ${y}`; };
const addMonthYM = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
function venceTxt(iso) {
  const d = diffDays(iso, hoy());
  if (d < 0) return `Vencida hace ${-d} d`;
  if (d === 0) return 'Vence hoy';
  if (d === 1) return 'Vence mañana';
  return `Vence en ${d} d`;
}

/* ---------- Catálogos por defecto ---------- */
const DEF_SERVICIOS = [
  { nombre: 'Netflix', color: '#e50914', perfiles: 5, precio: 15000 },
  { nombre: 'Disney+', color: '#113ccf', perfiles: 7, precio: 10000 },
  { nombre: 'Max', color: '#7b2ff7', perfiles: 5, precio: 10000 },
  { nombre: 'Prime Video', color: '#00a8e1', perfiles: 6, precio: 9000 },
  { nombre: 'Spotify', color: '#1db954', perfiles: 6, precio: 9000 },
  { nombre: 'Crunchyroll', color: '#f47521', perfiles: 4, precio: 8000 },
  { nombre: 'YouTube Premium', color: '#ff0033', perfiles: 6, precio: 9000 },
  { nombre: 'Paramount+', color: '#0064ff', perfiles: 6, precio: 8000 },
];
const DEF_PLANTILLAS = {
  entrega: '¡Hola {cliente}! 👋 Gracias por tu compra en *{negocio}*.\n\nAquí están tus accesos:\n\n{detalle}\n\n💰 Total: {total}\n\n📲 Ábrelos en tu celular, PC o tablet:\n{enlace}\n\n⚠️ Importante: no cambies el correo ni la contraseña y usa solo tu perfil asignado. ¡Disfrútalo! 🍿',
  cobro: 'Hola {cliente} 👋 Te escribimos de *{negocio}*.\n\nTienes pendiente:\n\n{detalle}\n\n💰 Total: {total}\n\n¿Te ayudo a renovar para que no pierdas tu perfil? 🙌',
  porVencer: 'Hola {cliente} 👋 Tu servicio de *{negocio}* está por vencer:\n\n{detalle}\n\n¿Deseas renovarlo? Respóndeme y te lo dejo listo ✅',
  renovacion: '¡Listo {cliente}! ✅ Renovamos tu servicio en *{negocio}*:\n\n{detalle}\n\n📲 Tus accesos: {enlace}\n\nGracias por seguir con nosotros 🧡',
};
// Plantillas de la primera versión: si el usuario no las cambió, se actualizan solas
const PLANTILLAS_V1 = {
  entrega: '¡Hola {cliente}! 👋 Gracias por tu compra en *{negocio}*.\n\nAquí están tus accesos:\n\n{detalle}\n\n💰 Total: {total}\n\n⚠️ Importante: no cambies el correo ni la contraseña y usa solo tu perfil asignado. ¡Disfrútalo! 🍿',
  renovacion: '¡Listo {cliente}! ✅ Renovamos tu servicio en *{negocio}*:\n\n{detalle}\n\nGracias por seguir con nosotros 🧡',
};
const PLANTILLA_NOMBRES = { entrega: 'Entrega de accesos', cobro: 'Cobro / vencido', porVencer: 'Recordatorio por vencer', renovacion: 'Confirmación de renovación' };
const DURS = [7, 15, 30, 60, 90, 180, 365];
const durTxt = n => ({ 7: '7 días', 15: '15 días', 30: '30 días (1 mes)', 60: '60 días (2 meses)', 90: '90 días (3 meses)', 180: '180 días (6 meses)', 365: '365 días (1 año)' }[n] || `${n} días`);
const METODOS = ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Bancolombia', 'Yape', 'Plin', 'PayPal', 'Otro'];
const CAT_GASTO = ['Cuentas', 'Publicidad', 'Herramientas', 'Comisiones', 'Otros'];

/* ---------- Estado ---------- */
function defaultState() {
  const servicios = DEF_SERVICIOS.map(s => ({ id: uid(), catalogo: true, ...s }));
  const id = n => servicios.find(s => s.nombre === n).id;
  return {
    v: 1,
    settings: {
      negocio: 'Don Streaming', usuario: '', simbolo: '$', decimales: 0, pais: '57',
      diasAviso: 3, diasGracia: 3, duracion: 30, tema: 'dark', pinHash: '', ultimoRespaldo: '',
      catStock: true, logo: '', whatsapp: '3028152285', plantillas: { ...DEF_PLANTILLAS },
    },
    servicios,
    combos: [
      { id: uid(), nombre: 'Combo Familiar', servicioIds: [id('Netflix'), id('Disney+')], precio: 22000 },
      { id: uid(), nombre: 'Combo Cine Total', servicioIds: [id('Netflix'), id('Disney+'), id('Max'), id('Prime Video')], precio: 38000 },
      { id: uid(), nombre: 'Combo Música + Series', servicioIds: [id('Spotify'), id('Netflix')], precio: 21000 },
    ],
    cuentas: [], clientes: [], subs: [], pagos: [], gastos: [], borrados: {},
  };
}
const COLS = ['servicios', 'combos', 'cuentas', 'clientes', 'subs', 'pagos', 'gastos'];
function normalizar(d) {
  const def = defaultState();
  const st = { ...def, ...d };
  st.settings = { ...def.settings, ...(d.settings || {}) };
  st.settings.plantillas = { ...DEF_PLANTILLAS, ...((d.settings || {}).plantillas || {}) };
  for (const k of COLS) if (!Array.isArray(st[k])) st[k] = def[k];
  if (!st.borrados || typeof st.borrados !== 'object') st.borrados = {};
  // Datos de tu negocio por defecto (si aún no los cambiaste)
  if (!st.settings.negocio || st.settings.negocio === 'Mi Negocio') st.settings.negocio = 'Don Streaming';
  if (!st.settings.whatsapp) st.settings.whatsapp = '3028152285';
  for (const k of Object.keys(PLANTILLAS_V1)) if (st.settings.plantillas[k] === PLANTILLAS_V1[k]) st.settings.plantillas[k] = DEF_PLANTILLAS[k];
  delete st.app; delete st.exportado;
  return st;
}
function load() {
  try { const raw = localStorage.getItem(KEY); return raw ? normalizar(JSON.parse(raw)) : defaultState(); }
  catch (e) { console.error(e); return defaultState(); }
}
let S = load();
function guardarLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (e) { toast('No se pudo guardar: el almacenamiento está lleno. Exporta un respaldo.', 'bad'); return false; }
}
function save() { if (guardarLocal()) syncMarcar(); }
// Borra registros dejando constancia (para que no "revivan" al sincronizar con otro dispositivo)
function borrar(col, pred) {
  const t = Date.now();
  for (const x of S[col]) if (pred(x)) S.borrados[x.id] = t;
  S[col] = S[col].filter(x => !pred(x));
}

/* ---------- Búsquedas y utilidades ---------- */
const svc = id => S.servicios.find(x => x.id === id);
const cuenta = id => S.cuentas.find(x => x.id === id);
const cliente = id => S.clientes.find(x => x.id === id);
const subById = id => S.subs.find(x => x.id === id);
const primerNombre = n => String(n || '').trim().split(/\s+/)[0] || '';
const iniciales = n => String(n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
const sigla = n => { const w = String(n || '?').replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?')[0]).toUpperCase(); };
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const avatar = (n, cls = '') => `<span class="av ${cls}" style="background:hsl(${hue(n)} 55% 45%)">${esc(iniciales(n))}</span>`;
const badgeSvc = (sid, big) => { const s = svc(sid); return `<span class="sv${big ? ' lg' : ''}" style="--c:${esc(s?.color || '#666')}">${esc(sigla(s?.nombre))}</span>`; };
function money(n) {
  const st = S.settings; const v = Number(n) || 0; const dec = Number(st.decimales) || 0;
  const num = Math.abs(v).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return `${v < 0 ? '-' : ''}${st.simbolo}${st.simbolo.length > 1 ? ' ' : ''}${num}`;
}
const redondear = n => { const f = 10 ** (Number(S.settings.decimales) || 0); return Math.round(n * f) / f; };
function normTel(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 10) d = String(S.settings.pais || '').replace(/\D/g, '') + d.replace(/^0+/, '');
  return d;
}

/* ---------- Estados ---------- */
const EST = {
  vencida: { t: 'Vencida', c: 'bad' }, hoy: { t: 'Vence hoy', c: 'warn' }, porvencer: { t: 'Por vencer', c: 'warn' },
  aldia: { t: 'Al día', c: 'ok' }, cancelada: { t: 'Liberada', c: 'mut' }, inactiva: { t: 'Inactiva', c: 'mut' },
};
function estadoSub(s) {
  if (!s.activa) return 'cancelada';
  const d = diffDays(s.vence, hoy());
  if (d < 0) return 'vencida';
  if (d === 0) return 'hoy';
  if (d <= S.settings.diasAviso) return 'porvencer';
  return 'aldia';
}
function estadoCuenta(c) {
  if (c.activa === false) return 'inactiva';
  if (!c.vence) return 'aldia';
  const d = diffDays(c.vence, hoy());
  if (d < 0) return 'vencida';
  if (d <= S.settings.diasAviso) return 'porvencer';
  return 'aldia';
}
const venceLabel = s => s.activa ? venceTxt(s.vence) : 'Liberada';
const ORDEN_EST = ['vencida', 'hoy', 'porvencer', 'aldia', 'cancelada'];

/* ---------- Ocupación de cuentas madre ---------- */
const subsDeCuenta = cid => S.subs.filter(s => s.activa && s.cuentaId === cid);
function usados(cid, excl) {
  const c = cuenta(cid); if (!c) return 0;
  let n = 0;
  for (const s of S.subs) {
    if (!s.activa || s.cuentaId !== cid || (excl && excl.has(s.id))) continue;
    n += s.completa ? c.perfilesMax : 1;
  }
  return n;
}
const libres = (cid, excl) => { const c = cuenta(cid); return c ? Math.max(0, c.perfilesMax - usados(cid, excl)) : 0; };
function nextPerfil(cid, extra = []) {
  const c = cuenta(cid);
  const used = new Set(subsDeCuenta(cid).map(s => String(s.perfil || '').toLowerCase()).concat(extra.map(x => String(x).toLowerCase())));
  for (const d of (c && c.perfilesDef) || []) if (d.nombre && !used.has(d.nombre.toLowerCase())) return d.nombre;
  const max = c ? c.perfilesMax : 10;
  for (let i = 1; i <= max + 10; i++) if (!used.has('perfil ' + i)) return 'Perfil ' + i;
  return 'Perfil';
}
// PIN guardado para un perfil de la cuenta madre (si lo definiste al subirla)
function pinDef(cid, nombre) {
  const d = ((cuenta(cid) || {}).perfilesDef || []).find(x => x.nombre.toLowerCase() === String(nombre || '').toLowerCase());
  return d ? d.pin || '' : '';
}
function parsePerfiles(txt) {
  return String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(.+?)\s*[:|;,\t]\s*(\S*)$/);
    return m ? { nombre: m[1].trim(), pin: m[2].trim() } : { nombre: l, pin: '' };
  });
}
function autoCuenta(sid, uso = {}) {
  const cands = S.cuentas
    .filter(c => c.activa !== false && c.servicioId === sid)
    .map(c => ({ c, l: libres(c.id) - (uso[c.id] || 0), e: estadoCuenta(c) }))
    .filter(x => x.l > 0)
    .sort((a, b) => (a.e === 'vencida') - (b.e === 'vencida') || a.l - b.l); // llena primero las cuentas casi completas
  return cands[0] ? cands[0].c.id : '';
}

/* ---------- Mensajes de WhatsApp ---------- */
const fill = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
function lineaLarga(s) {
  const sv = svc(s.servicioId), c = cuenta(s.cuentaId);
  let t = `▪️ *${sv?.nombre || 'Servicio'}*`;
  if (s.completa) t += ' (cuenta completa)'; else if (s.perfil) t += ` — ${s.perfil}`;
  if (s.pin) t += ` · PIN ${s.pin}`;
  if (c) { t += `\n   📧 ${c.correo}`; if (c.clave) t += `\n   🔑 ${c.clave}`; }
  if (s.acceso) t += `\n   🔐 ${String(s.acceso).trim().replace(/\n+/g, '\n   ')}`;
  t += `\n   📅 Vence: ${fecha(s.vence)}`;
  return t;
}
function lineaCorta(s) {
  const sv = svc(s.servicioId);
  const per = s.perfil && !s.completa ? ` (${s.perfil})` : '';
  return `▪️ ${sv?.nombre || 'Servicio'}${per} — ${venceTxt(s.vence).toLowerCase()} (${fecha(s.vence)}) — ${money(s.precio)}`;
}
function mensaje(tipo, subs) {
  const cl = cliente(subs[0]?.clienteId);
  const largo = tipo === 'entrega' || tipo === 'renovacion';
  const vence = subs.map(s => s.vence).sort()[0];
  return fill(S.settings.plantillas[tipo], {
    cliente: primerNombre(cl?.nombre) || 'cliente',
    negocio: S.settings.negocio,
    detalle: subs.map(largo ? lineaLarga : lineaCorta).join(largo ? '\n\n' : '\n'),
    total: money(sum(subs, 'precio')),
    vence: fecha(vence),
    enlace: enlaceAcceso(subs),
  });
}
// Enlace que el cliente abre en cualquier celular, PC o tablet (los datos viajan dentro del enlace, no en un servidor)
function enlaceAcceso(subs) {
  const cl = cliente(subs[0]?.clienteId);
  const d = {
    n: S.settings.negocio, w: normTel(S.settings.whatsapp), c: primerNombre(cl?.nombre),
    i: subs.map(s => { const sv = svc(s.servicioId), cu = cuenta(s.cuentaId); return { s: sv?.nombre || '', co: sv?.color || '#ff6a2b', e: cu?.correo || '', k: cu?.clave || '', p: s.completa ? 'Cuenta completa' : s.perfil || '', pin: s.pin || '', v: s.vence, a: s.acceso || '' }; }),
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const base = /^https?:/.test(location.protocol) ? new URL('acceso.html', location.href).href.split('#')[0] : 'acceso.html';
  return base + '#' + b64;
}
function abrirWA(clienteId, texto) {
  const tel = normTel(cliente(clienteId)?.telefono);
  const url = `https://wa.me/${tel}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
  window.open(url, '_blank', 'noopener');
}
function tipoRecordatorio(subs) {
  return subs.some(s => !s.pagado || ['vencida', 'hoy'].includes(estadoSub(s))) ? 'cobro' : 'porVencer';
}

/* ---------- Íconos ---------- */
const IC = {
  panel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  ventas: '<path d="M6 6h15l-1.6 8.5a2 2 0 0 1-2 1.5H9.2a2 2 0 0 1-2-1.6z"/><path d="M6 6 5.2 3H2.5"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/>',
  clientes: '<circle cx="9" cy="8" r="3.6"/><path d="M2.5 20.5c.6-3.6 3.3-5.6 6.5-5.6s5.9 2 6.5 5.6"/><path d="M16 4.6a3.6 3.6 0 0 1 0 6.8M18.3 15.2c1.8.7 2.9 2.4 3.2 5.3"/>',
  cuentas: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  tienda: '<path d="M3.5 9 5.4 4h13.2l1.9 5"/><path d="M4.5 9v11h15V9"/><path d="M3.5 9h17a3 3 0 0 1-5.7 0 3 3 0 0 1-5.6 0 3 3 0 0 1-5.7 0"/><path d="M10 20v-5h4v5"/>',
  reportes: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  ajustes: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  wa: '<path d="M3.5 20.5 4.8 16A8.4 8.4 0 1 1 8 19.3z"/><path d="M9 8.6c.2 2.9 2.6 5.6 5.7 6l1.4-1.3-1.9-1.3-.9.7c-1-.4-2-1.4-2.4-2.4l.7-.9-1.3-1.9z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  renew: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  combo: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 13v8M13 17h8"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M4 20h16"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  unlink: '<path d="M9 15 15 9M10 6.5l1.5-1.5a4.5 4.5 0 0 1 6.4 6.4L16.5 13M13.5 17.5 12 19a4.5 4.5 0 0 1-6.4-6.4L7 11"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>',
  chevL: '<path d="m15 6-6 6 6 6"/>', chevR: '<path d="m9 6 6 6-6 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
  split: '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="12" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M7.5 12h9M7 11l9.6-5M7 13l9.6 5"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4.8 4.8 0 0 1-.5 9.5z"/>',
  cloudOff: '<path d="M7 18a4.5 4.5 0 0 1-.6-9M10 5.2A6 6 0 0 1 18 8.5a4.8 4.8 0 0 1 2.6 8.3M3 3l18 18"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ---------- Toasts, copiar, descargar ---------- */
function toast(msg, tipo = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + tipo; el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2600);
  setTimeout(() => el.remove(), 3000);
}
async function copiar(txt, msg = 'Copiado') {
  try { await navigator.clipboard.writeText(txt); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) { /* nada */ } ta.remove();
  }
  toast(msg + ' ✅');
}
function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const csv = rows => rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');

/* =====================================================================
   NAVEGACIÓN Y RENDER
   ===================================================================== */
const NAV = [['panel', 'Panel'], ['ventas', 'Ventas'], ['clientes', 'Clientes'], ['cuentas', 'Cuentas'], ['tienda', 'Tienda'], ['reportes', 'Reportes'], ['ajustes', 'Ajustes']];
let VIEW = 'panel';
const F = { vEst: 'activas', vQ: '', vSvc: '', cQ: '', cOrden: 'nombre', aSvc: '', aTab: 'todas', aQ: '', mes: mesDe(hoy()) };

function badges() {
  return {
    ventas: S.subs.filter(s => ['vencida', 'hoy'].includes(estadoSub(s))).length,
    cuentas: S.cuentas.filter(c => ['vencida', 'porvencer'].includes(estadoCuenta(c))).length,
  };
}
function renderChrome() {
  const b = badges();
  const html = NAV.map(([k, t]) => `<button class="nav-i${VIEW === k ? ' on' : ''}" data-a="go" data-id="${k}">${icon(k)}${b[k] ? `<i class="dot">${b[k] > 99 ? '99+' : b[k]}</i>` : ''}<span>${t}</span></button>`).join('');
  $('#side-nav').innerHTML = html;
  $('#bnav').innerHTML = html;
  $('#brand-name').textContent = S.settings.negocio;
  $('#top-name').textContent = S.settings.negocio;
  const logo = S.settings.logo || LOGO_BASE;
  document.querySelectorAll('.brand-logo').forEach(img => { if (img.getAttribute('src') !== logo) img.src = logo; });
  const fav = document.querySelector('link[rel=icon]'); if (fav && fav.getAttribute('href') !== logo) fav.href = logo;
  $('#avatarBtn').innerHTML = `<img src="${esc(logo)}" alt="">`;
  renderSyncIcon();
  const alertas = b.ventas + b.cuentas;
  $('#bellBtn').innerHTML = icon('bell') + (alertas ? `<i class="dot">${alertas > 99 ? '99+' : alertas}</i>` : '');
  const dark = S.settings.tema !== 'light';
  $('#temaIb').innerHTML = icon(dark ? 'sun' : 'moon');
  $('#temaBtn').innerHTML = icon(dark ? 'sun' : 'moon') + (dark ? 'Modo claro' : 'Modo oscuro');
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = dark ? '#090b16' : '#f3f4fa';
}
const VIEWS = { panel: vPanel, ventas: vVentas, clientes: vClientes, cuentas: vCuentas, tienda: vTienda, reportes: vReportes, ajustes: vAjustes };
function render() {
  const ae = document.activeElement;
  const aid = ae && ae.id && $('#view').contains(ae) ? ae.id : null;
  let pos = null; try { pos = aid ? ae.selectionStart : null; } catch (e) { pos = null; }
  $('#view').innerHTML = VIEWS[VIEW]();
  renderChrome();
  if (aid) { const n = document.getElementById(aid); if (n) { n.focus(); try { if (pos != null) n.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } }
}
function go(v) {
  if (!VIEWS[v]) v = 'panel';
  VIEW = v;
  if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  render(); window.scrollTo(0, 0);
}
const emptyMini = t => `<div class="empty-mini">${t}</div>`;
const emptyBig = (t, s) => `<div class="empty card"><b>${t}</b>${s}</div>`;

/* =====================================================================
   VISTA: PANEL
   ===================================================================== */
function saludo() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }
function stats() {
  const h = hoy(), ym = mesDe(h);
  const act = S.subs.filter(s => s.activa);
  const by = e => act.filter(s => estadoSub(s) === e);
  const pend = act.filter(s => !s.pagado);
  const pagHoy = S.pagos.filter(p => p.fecha === h), pagMes = S.pagos.filter(p => mesDe(p.fecha) === ym);
  const ctas = S.cuentas.filter(c => c.activa !== false);
  return {
    vencidas: by('vencida'), hoyS: by('hoy'), porv: by('porvencer'), pend,
    porCobrar: sum(pend, 'precio'), cobHoy: sum(pagHoy, 'monto'), nHoy: pagHoy.length,
    cobMes: sum(pagMes, 'monto'), gasMes: sum(S.gastos.filter(g => mesDe(g.fecha) === ym), 'monto'),
    cap: sum(ctas, 'perfilesMax'), lib: ctas.reduce((a, c) => a + libres(c.id), 0),
  };
}
function kpi(t, v, sub, cls, act, id) {
  return `<button class="kpi ${cls || ''}" data-a="${act}" data-id="${id || ''}"><span class="kt">${t}</span><b>${v}</b><small>${sub}</small></button>`;
}
function gruposCobro() {
  const m = new Map();
  for (const s of S.subs) {
    if (!s.activa) continue;
    const e = estadoSub(s);
    if (!(e === 'vencida' || e === 'hoy' || e === 'porvencer' || !s.pagado)) continue;
    if (!m.has(s.clienteId)) m.set(s.clienteId, []);
    m.get(s.clienteId).push(s);
  }
  return [...m.entries()]
    .map(([cid, subs]) => ({ cid, subs: subs.sort((a, b) => a.vence.localeCompare(b.vence)) }))
    .sort((a, b) => a.subs[0].vence.localeCompare(b.subs[0].vence));
}
const paraLiberar = () => S.subs.filter(s => s.activa && diffDays(hoy(), s.vence) > S.settings.diasGracia).sort((a, b) => a.vence.localeCompare(b.vence));
function necesitaRespaldo() {
  if (!S.subs.length && !S.cuentas.length) return false;
  return !S.settings.ultimoRespaldo || diffDays(hoy(), S.settings.ultimoRespaldo) >= 7;
}
function rowCobro(g) {
  const c = cliente(g.cid), s0 = g.subs[0], e = estadoSub(s0);
  const rec = g.subs.some(s => s.recordado === hoy());
  return `<div class="row">
    ${badgeSvc(s0.servicioId)}
    <div class="grow click" data-a="verCliente" data-id="${g.cid}">
      <b>${esc(c?.nombre || 'Cliente eliminado')}</b>
      <small>${g.subs.map(s => esc(svc(s.servicioId)?.nombre || '') + (s.perfil && !s.completa ? ' · ' + esc(s.perfil) : '')).join(', ')}</small>
      <div class="mini"><span class="chip ${EST[e].c}">● ${venceLabel(s0)}</span>${g.subs.some(s => !s.pagado) ? '<span class="chip warn">Sin pagar</span>' : ''}${rec ? '<span class="chip">✓ recordado hoy</span>' : ''}</div>
    </div>
    <div class="r"><b>${money(sum(g.subs, 'precio'))}</b><small>Vence ${fechaCorta(s0.vence)}</small></div>
    <div class="acts">
      <button class="ib wa" title="Enviar recordatorio por WhatsApp" data-a="waCobro" data-id="${g.cid}">${icon('wa')}</button>
      <button class="ib" title="Renovar / cobrar" data-a="renovarCli" data-id="${g.cid}">${icon('renew')}</button>
    </div>
  </div>`;
}
function rowCuentaMini(c) {
  const e = estadoCuenta(c);
  return `<div class="row tight">${badgeSvc(c.servicioId)}
    <div class="grow"><b>${esc(c.correo)}</b><small>${esc(c.proveedor || 'Sin proveedor')}${c.costo ? ' · ' + money(c.costo) : ''}</small></div>
    <span class="chip ${EST[e].c}">${venceTxt(c.vence)}</span>
    <button class="ib sm" title="Renovar con proveedor" data-a="renovarCuenta" data-id="${c.id}">${icon('renew')}</button></div>`;
}
function vPanel() {
  const s = stats(), st = S.settings, grupos = gruposCobro(), n = grupos.length;
  const vacio = !S.cuentas.length && !S.subs.length;
  const d = new Date();
  let h = `<div class="hero"><div><h1>${saludo()}${st.usuario ? ', ' + esc(st.usuario) : ''} 👋</h1>
    <p>${d.getDate()} de ${MESES_L[d.getMonth()]} · ${n ? `tienes <b>${n}</b> cobro${n > 1 ? 's' : ''} por gestionar` : 'todo al día ✨'}</p></div>
    <div class="hero-act"><button class="btn" data-a="combo">${icon('combo')}Combo</button><button class="btn pri" data-a="nueva">${icon('plus')}Nueva venta</button></div></div>`;

  if (vacio) {
    h += `<div class="card empty-start" style="margin-bottom:16px"><h3>¡Empecemos! 🚀</h3>
      <p>1) Agrega tus <b>cuentas madre</b> (correo, clave y cuántos perfiles tiene). 2) Registra <b>ventas</b> o <b>combos</b>: la app elige sola la cuenta con perfiles libres. 3) Cobra y entrega por <b>WhatsApp</b> con un toque.</p>
      <div class="row-btns"><button class="btn pri" data-a="nuevaCuenta">${icon('plus')}Agregar cuenta madre</button><button class="btn" data-a="importCuentas">${icon('upload')}Importar varias</button><button class="btn" data-a="importar">${icon('upload')}Traer datos de MrNetflix</button><button class="btn ghost" data-a="demo">Probar con datos de ejemplo</button></div></div>`;
  } else if (necesitaRespaldo()) {
    h += `<div class="banner">${icon('download')}<span>Tus datos viven en este navegador. Descarga un respaldo cada semana para no perder nada.</span><button class="btn sm" data-a="exportar">Respaldar</button></div>`;
  }

  h += `<div class="kpis">
    ${kpi('Vencidas', s.vencidas.length, 'sin renovar', 'bad', 'filtro', 'vencida')}
    ${kpi('Vencen hoy', s.hoyS.length, 'corte hoy', 'warn', 'filtro', 'hoy')}
    ${kpi('Por vencer', s.porv.length, `próximos ${st.diasAviso} días`, 'warn', 'filtro', 'porvencer')}
    ${kpi('Por cobrar', money(s.porCobrar), `${s.pend.length} pendiente${s.pend.length === 1 ? '' : 's'} de cobro`, 'acc', 'filtro', 'pendientes')}
    ${kpi('Cobrado hoy', money(s.cobHoy), `${s.nHoy} pago${s.nHoy === 1 ? '' : 's'}`, 'ok hl', 'go', 'reportes')}
    ${kpi('Cobrado', money(s.cobMes), `en ${MESES_L[d.getMonth()]}`, 'acc', 'go', 'reportes')}
    ${kpi('Ganancia del mes', money(s.cobMes - s.gasMes), `gastos ${money(s.gasMes)}`, s.cobMes - s.gasMes >= 0 ? 'ok' : 'bad', 'go', 'reportes')}
    ${kpi('Perfiles libres', `${s.lib}<small> / ${s.cap}</small>`, 'listos para vender', '', 'go', 'cuentas')}
  </div>`;

  const ctaAt = S.cuentas.filter(c => ['vencida', 'porvencer'].includes(estadoCuenta(c))).sort((a, b) => a.vence.localeCompare(b.vence));
  const lib = paraLiberar();
  h += `<div class="grid2">
    <section class="card">
      <div class="card-h"><div><h3>Cobranzas pendientes</h3><small>vencidas primero · un toque y sale el mensaje</small></div>
        ${n ? `<button class="btn sm" data-a="masivo">${icon('wa')}Enviar a todos</button>` : ''}</div>
      ${n ? grupos.slice(0, 8).map(rowCobro).join('') + (n > 8 ? `<button class="btn ghost full" style="margin-top:10px" data-a="filtro" data-id="atencion">Ver todas (${n})</button>` : '') : emptyMini('Sin cobros pendientes 🎉')}
    </section>
    <div class="stack">
      <section class="card">
        <div class="card-h"><div><h3>Cuentas madre</h3><small>renuévalas con tu proveedor para evitar cortes</small></div><button class="btn sm" data-a="go" data-id="cuentas">Ver todas</button></div>
        ${ctaAt.length ? ctaAt.slice(0, 6).map(rowCuentaMini).join('') : emptyMini('Ninguna cuenta por vencer ✅')}
      </section>
      ${lib.length ? `<section class="card">
        <div class="card-h"><div><h3>Listos para liberar</h3><small>vencidos hace más de ${st.diasGracia} días sin renovar</small></div><button class="btn sm" data-a="liberarTodos">${icon('unlink')}Liberar ${lib.length}</button></div>
        ${lib.slice(0, 5).map(x => `<div class="row tight">${badgeSvc(x.servicioId)}<div class="grow click" data-a="verCliente" data-id="${x.clienteId}"><b>${esc(cliente(x.clienteId)?.nombre || '—')}</b><small>${esc(x.perfil || '')} · ${esc(cuenta(x.cuentaId)?.correo || 'sin cuenta')}</small></div><span class="chip bad">${venceLabel(x)}</span></div>`).join('')}
      </section>` : ''}
      ${S.cuentas.length ? `<section class="card"><div class="card-h"><div><h3>Inventario por servicio</h3><small>perfiles libres / capacidad</small></div></div>${ocupacionPorServicio()}</section>` : ''}
    </div>
  </div>`;
  return h;
}
function ocupacionPorServicio() {
  const rows = S.servicios.map(sv => {
    const cs = S.cuentas.filter(c => c.activa !== false && c.servicioId === sv.id);
    return { sv, cap: sum(cs, 'perfilesMax'), lib: cs.reduce((a, c) => a + libres(c.id), 0) };
  }).filter(r => r.cap);
  return rows.map(r => `<div class="occ-row">${badgeSvc(r.sv.id)}<div><b>${esc(r.sv.nombre)}</b><div class="bar"><i style="width:${(r.cap - r.lib) / r.cap * 100}%"></i></div></div><small><b style="color:var(--ok)">${r.lib}</b> / ${r.cap}</small></div>`).join('');
}

/* =====================================================================
   VISTA: VENTAS
   ===================================================================== */
const V_TABS = [['activas', 'Activas'], ['atencion', 'Atención'], ['vencida', 'Vencidas'], ['hoy', 'Hoy'], ['porvencer', 'Por vencer'], ['pendientes', 'Sin pagar'], ['liberadas', 'Liberadas']];
function filtraSubs(tab) {
  return S.subs.filter(s => {
    const e = estadoSub(s);
    switch (tab) {
      case 'activas': return s.activa;
      case 'atencion': return s.activa && (e === 'vencida' || e === 'hoy' || e === 'porvencer' || !s.pagado);
      case 'pendientes': return s.activa && !s.pagado;
      case 'liberadas': return !s.activa;
      default: return s.activa && e === tab;
    }
  });
}
function rowSub(s) {
  const c = cliente(s.clienteId), sv = svc(s.servicioId), cu = cuenta(s.cuentaId), e = estadoSub(s);
  return `<div class="row sub ${e}">
    ${badgeSvc(s.servicioId, true)}
    <div class="grow click" data-a="verCliente" data-id="${s.clienteId}">
      <b>${esc(c?.nombre || 'Cliente eliminado')}</b>
      <small>${[esc(sv?.nombre || '—'), s.completa ? 'Cuenta completa' : esc(s.perfil || ''), s.pin ? 'PIN ' + esc(s.pin) : ''].filter(Boolean).join(' · ')}</small>
      <small class="mut">${cu ? esc(cu.correo) : s.acceso ? '🔐 Datos de acceso propios' : 'Sin cuenta madre'}</small>
    </div>
    <div class="r"><span class="chip ${EST[e].c}">${venceLabel(s)}</span><small>${fecha(s.vence)}</small></div>
    <div class="r"><b>${money(s.precio)}</b>${s.activa ? `<span class="chip ${s.pagado ? 'ok' : 'warn'}">${s.pagado ? 'Pagado' : 'Sin pagar'}</span>` : ''}</div>
    <div class="acts">
      ${s.activa ? `<button class="ib wa" title="WhatsApp" data-a="waSub" data-id="${s.id}">${icon('wa')}</button>
        <button class="ib" title="Renovar" data-a="renovar" data-id="${s.id}">${icon('renew')}</button>
        ${!s.pagado ? `<button class="ib ok" title="Marcar como pagado" data-a="pagar" data-id="${s.id}">${icon('check')}</button>` : ''}`
      : `<button class="ib" title="Reactivar" data-a="reactivar" data-id="${s.id}">${icon('renew')}</button>`}
      <button class="ib" title="Más opciones" data-a="menuSub" data-id="${s.id}">${icon('more')}</button>
    </div>
  </div>`;
}
function vVentas() {
  const q = F.vQ.trim().toLowerCase();
  let list = filtraSubs(F.vEst);
  if (F.vSvc) list = list.filter(s => s.servicioId === F.vSvc);
  if (q) list = list.filter(s => [cliente(s.clienteId)?.nombre, cliente(s.clienteId)?.telefono, svc(s.servicioId)?.nombre, s.perfil, cuenta(s.cuentaId)?.correo].join(' ').toLowerCase().includes(q));
  list.sort((a, b) => F.vEst === 'liberadas' ? b.vence.localeCompare(a.vence) : a.vence.localeCompare(b.vence));
  const counts = Object.fromEntries(V_TABS.map(([k]) => [k, filtraSubs(k).length]));
  return `<div class="vh"><div><h2>Ventas</h2><p>${list.length} resultado${list.length === 1 ? '' : 's'} · ${money(sum(list, 'precio'))}</p></div>
    <div class="hero-act"><button class="btn" data-a="exportCSV" data-id="ventas">${icon('download')}CSV</button><button class="btn" data-a="combo">${icon('combo')}Combo</button><button class="btn pri" data-a="nueva">${icon('plus')}Nueva venta</button></div></div>
    <div class="toolbar">
      <label class="search">${icon('search')}<input id="qV" type="search" placeholder="Buscar cliente, teléfono, correo o perfil…" value="${esc(F.vQ)}" data-f="vQ"></label>
      <select data-fc="vSvc" aria-label="Servicio"><option value="">Todos los servicios</option>${S.servicios.map(s => `<option value="${s.id}" ${F.vSvc === s.id ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select>
    </div>
    <div class="tabs">${V_TABS.map(([k, t]) => `<button class="tab${F.vEst === k ? ' on' : ''}" data-a="vTab" data-id="${k}">${t}<i>${counts[k]}</i></button>`).join('')}</div>
    <div class="list">${list.length ? list.map(rowSub).join('') : emptyBig('No hay ventas aquí', 'Registra una venta o cambia el filtro.')}</div>`;
}

/* =====================================================================
   VISTA: CLIENTES
   ===================================================================== */
function infoCliente(c) {
  const subs = S.subs.filter(s => s.clienteId === c.id && s.activa);
  let worst = null;
  for (const s of subs) { const e = estadoSub(s); if (worst === null || ORDEN_EST.indexOf(e) < ORDEN_EST.indexOf(worst)) worst = e; }
  return { subs, worst, pagado: sum(S.pagos.filter(p => p.clienteId === c.id), 'monto'), debe: sum(subs.filter(s => !s.pagado), 'precio') };
}
function vClientes() {
  const q = F.cQ.trim().toLowerCase();
  let list = S.clientes.filter(c => !q || [c.nombre, c.telefono, c.notas].join(' ').toLowerCase().includes(q)).map(c => ({ c, ...infoCliente(c) }));
  if (F.cOrden === 'nombre') list.sort((a, b) => a.c.nombre.localeCompare(b.c.nombre, 'es'));
  if (F.cOrden === 'valor') list.sort((a, b) => b.pagado - a.pagado);
  if (F.cOrden === 'estado') list.sort((a, b) => (a.worst ? ORDEN_EST.indexOf(a.worst) : 9) - (b.worst ? ORDEN_EST.indexOf(b.worst) : 9));
  const activos = S.clientes.filter(c => S.subs.some(s => s.activa && s.clienteId === c.id)).length;
  return `<div class="vh"><div><h2>Clientes</h2><p>${S.clientes.length} en total · ${activos} con servicios activos</p></div>
    <div class="hero-act"><button class="btn" data-a="exportCSV" data-id="clientes">${icon('download')}CSV</button><button class="btn pri" data-a="nuevoCliente">${icon('plus')}Nuevo cliente</button></div></div>
    <div class="toolbar">
      <label class="search">${icon('search')}<input id="qC" type="search" placeholder="Buscar por nombre, teléfono o nota…" value="${esc(F.cQ)}" data-f="cQ"></label>
      <select data-fc="cOrden" aria-label="Ordenar"><option value="nombre" ${F.cOrden === 'nombre' ? 'selected' : ''}>Orden: A-Z</option><option value="estado" ${F.cOrden === 'estado' ? 'selected' : ''}>Orden: urgentes primero</option><option value="valor" ${F.cOrden === 'valor' ? 'selected' : ''}>Orden: mejores clientes</option></select>
    </div>
    <div class="list">${list.length ? list.map(({ c, subs, worst, pagado, debe }) => `<div class="row">
      ${avatar(c.nombre)}
      <div class="grow click" data-a="verCliente" data-id="${c.id}"><b>${esc(c.nombre)}</b><small>${esc(c.telefono || 'Sin teléfono')}${c.notas ? ' · ' + esc(c.notas) : ''}</small>
        <div class="mini">${c.estrellas ? `<span class="chip acc">${'★'.repeat(Math.min(5, c.estrellas))}</span>` : ''}<span class="chip">${subs.length} servicio${subs.length === 1 ? '' : 's'}</span>${worst ? `<span class="chip ${EST[worst].c}">${EST[worst].t}</span>` : ''}${debe ? `<span class="chip warn">Debe ${money(debe)}</span>` : ''}</div></div>
      <div class="r"><b>${money(pagado)}</b><small>pagado en total</small></div>
      <div class="acts"><button class="ib wa" title="Abrir chat" data-a="waChat" data-id="${c.id}">${icon('wa')}</button><button class="ib" title="Nueva venta" data-a="nuevaVentaCli" data-id="${c.id}">${icon('plus')}</button></div>
    </div>`).join('') : emptyBig(q ? 'Sin resultados' : 'Aún no tienes clientes', q ? 'Prueba con otra búsqueda.' : 'Se crean solos al registrar una venta, o agrégalos aquí.')}</div>`;
}

/* =====================================================================
   VISTA: CUENTAS MADRE
   ===================================================================== */
const A_TABS = [['todas', 'Todas'], ['atencion', 'Atención'], ['libres', 'Con libres'], ['llenas', 'Llenas'], ['inactivas', 'Inactivas']];
function filtraCuentas(tab, svcId) {
  let list = S.cuentas.filter(c => tab === 'inactivas' ? c.activa === false : c.activa !== false);
  if (svcId) list = list.filter(c => c.servicioId === svcId);
  if (tab === 'atencion') list = list.filter(c => ['vencida', 'porvencer'].includes(estadoCuenta(c)));
  if (tab === 'libres') list = list.filter(c => libres(c.id) > 0);
  if (tab === 'llenas') list = list.filter(c => libres(c.id) === 0);
  return list;
}
function cardCuenta(c) {
  const sv = svc(c.servicioId), subs = subsDeCuenta(c.id), l = libres(c.id), e = estadoCuenta(c), u = c.perfilesMax - l;
  return `<div class="ccard ${e}">
    <div class="cc-h">${badgeSvc(c.servicioId, true)}<div class="grow"><b>${esc(sv?.nombre || '—')}</b><small>${esc(c.proveedor || 'Sin proveedor')}${c.costo ? ' · costo ' + money(c.costo) : ''}</small></div>
      <span class="chip ${EST[e].c}">${c.activa === false ? 'Inactiva' : c.vence ? venceTxt(c.vence) : 'Sin fecha'}</span></div>
    <div class="cred">
      <div><span>Correo</span><code>${esc(c.correo)}</code><button class="ib sm" title="Copiar correo" data-a="copiar" data-v="${esc(c.correo)}">${icon('copy')}</button></div>
      <div><span>Clave</span><code class="secret" data-secret="${esc(c.clave || '')}">${c.clave ? '••••••••' : 'sin guardar'}</code>${c.clave ? `<button class="ib sm" title="Ver clave" data-a="verClave">${icon('eye')}</button><button class="ib sm" title="Copiar clave" data-a="copiar" data-v="${esc(c.clave)}">${icon('copy')}</button>` : `<button class="ib sm" title="Agregar clave" data-a="editCuenta" data-id="${c.id}">${icon('plus')}</button>`}</div>
    </div>
    <div class="occ"><div class="bar"><i style="width:${c.perfilesMax ? u / c.perfilesMax * 100 : 0}%"></i></div><small><b>${l}</b> libre${l === 1 ? '' : 's'} de ${c.perfilesMax}</small></div>
    <div class="perfiles">${subs.map(s => `<span class="pchip ${estadoSub(s)}" data-a="verCliente" data-id="${s.clienteId}" title="${esc(venceLabel(s))}">${esc(s.completa ? 'Completa' : s.perfil || 'Perfil')} · ${esc(primerNombre(cliente(s.clienteId)?.nombre) || '—')}</span>`).join('')}${Array.from({ length: l }, () => '<span class="pchip free">Libre</span>').join('')}</div>
    <div class="cc-f">
      <button class="btn sm pri" data-a="repartir" data-id="${c.id}" ${l && c.activa !== false ? '' : 'disabled'}>${icon('split')}Repartir</button>
      <button class="btn sm" data-a="venderEn" data-id="${c.id}" ${l && c.activa !== false ? '' : 'disabled'}>${icon('plus')}Vender</button>
      <button class="btn sm" data-a="renovarCuenta" data-id="${c.id}" title="Renovar con proveedor">${icon('renew')}</button>
      <button class="ib" title="Editar" data-a="editCuenta" data-id="${c.id}">${icon('edit')}</button>
    </div>
  </div>`;
}
function vCuentas() {
  const act = S.cuentas.filter(c => c.activa !== false);
  const cap = sum(act, 'perfilesMax'), lib = act.reduce((a, c) => a + libres(c.id), 0);
  const porV = act.filter(c => estadoCuenta(c) === 'porvencer').length, venc = act.filter(c => estadoCuenta(c) === 'vencida').length;
  const llenas = act.filter(c => libres(c.id) === 0).length;
  const occ = cap ? Math.round((cap - lib) / cap * 100) : 0;
  const q = F.aQ.trim().toLowerCase();
  let list = filtraCuentas(F.aTab, F.aSvc);
  if (q) list = list.filter(c => [c.correo, c.proveedor, c.notas, svc(c.servicioId)?.nombre].join(' ').toLowerCase().includes(q));
  list.sort((a, b) => ORDEN_EST.indexOf(estadoCuenta(a)) - ORDEN_EST.indexOf(estadoCuenta(b)) || (a.vence || '9').localeCompare(b.vence || '9'));
  const porSvc = S.servicios.map(s => ({ s, n: act.filter(c => c.servicioId === s.id).length })).filter(x => x.n);
  const counts = Object.fromEntries(A_TABS.map(([k]) => [k, filtraCuentas(k, F.aSvc).length]));
  const inversion = sum(act, 'costo');
  return `<div class="vh"><div><h2>Cuentas madre</h2><p>${act.length} activas · inversión ${money(inversion)}</p></div>
    <div class="hero-act"><button class="btn" data-a="importCuentas">${icon('upload')}Importar varias</button><button class="btn pri" data-a="nuevaCuenta">${icon('plus')}Cuenta madre</button></div></div>
    <div class="kpis">
      ${kpi('Perfiles libres', `${lib}<small> / ${cap}</small>`, `ocupación ${occ}%`, 'ok', 'aTab', 'libres')}
      ${kpi('Por vencer', porV, `próximos ${S.settings.diasAviso} días`, 'warn', 'aTab', 'atencion')}
      ${kpi('Vencidas', venc, venc ? 'renuévalas ya' : 'todo al día', 'bad', 'aTab', 'atencion')}
      ${kpi('Llenas', llenas, 'sin perfiles libres', '', 'aTab', 'llenas')}
    </div>
    ${porSvc.length ? `<div class="chips"><button class="schip${!F.aSvc ? ' on' : ''}" data-a="aSvc" data-id="">Todos <i>${act.length}</i></button>${porSvc.map(({ s, n }) => `<button class="schip${F.aSvc === s.id ? ' on' : ''}" data-a="aSvc" data-id="${s.id}">${badgeSvc(s.id)}${esc(s.nombre)} <i>${n}</i></button>`).join('')}</div>` : ''}
    <div class="toolbar"><label class="search">${icon('search')}<input id="qA" type="search" placeholder="Buscar correo o proveedor…" value="${esc(F.aQ)}" data-f="aQ"></label></div>
    <div class="tabs">${A_TABS.map(([k, t]) => `<button class="tab${F.aTab === k ? ' on' : ''}" data-a="aTab" data-id="${k}">${t}<i>${counts[k]}</i></button>`).join('')}</div>
    ${venc + porV && F.aTab !== 'atencion' ? `<div class="banner bad">${icon('bell')}<span><b>Requieren atención (${venc + porV}).</b> Vencidas o por vencer con tu proveedor: renuévalas para evitar cortes.</span><button class="btn sm" data-a="aTab" data-id="atencion">Ver</button></div>` : ''}
    ${list.length ? `<div class="cgrid">${list.map(cardCuenta).join('')}</div>` : emptyBig(S.cuentas.length ? 'Nada por aquí' : 'Agrega tu primera cuenta madre', S.cuentas.length ? 'Cambia el filtro o la búsqueda.' : 'Guarda correo, clave, proveedor, costo y fecha de corte. Puedes importar muchas de una vez.')}`;
}

/* =====================================================================
   VISTA: TIENDA (catálogo para compartir)
   ===================================================================== */
const stockServicio = sid => S.cuentas.filter(c => c.activa !== false && c.servicioId === sid).reduce((a, c) => a + libres(c.id), 0);
function textoCatalogo() {
  const st = S.settings;
  let t = `🛍️ *${st.negocio}* — Lista de precios\n\n`;
  const vis = S.servicios.filter(s => s.catalogo);
  for (const s of vis) {
    const stock = stockServicio(s.id);
    t += `▪️ ${s.nombre}: *${money(s.precio)}*${st.catStock && S.cuentas.length ? (stock > 0 ? ` (${stock} disponible${stock === 1 ? '' : 's'})` : ' (agotado)') : ''}\n`;
  }
  if (S.combos.length) {
    t += `\n🔥 *Combos*\n`;
    for (const c of S.combos) {
      const nombres = c.servicioIds.map(id => svc(id)?.nombre).filter(Boolean);
      const normal = c.servicioIds.reduce((a, id) => a + (svc(id)?.precio || 0), 0);
      t += `▪️ ${c.nombre} (${nombres.join(' + ')}): *${money(c.precio)}*${normal > c.precio ? ` — ahorras ${money(normal - c.precio)}` : ''}\n`;
    }
  }
  t += `\n✅ Entrega inmediata · Soporte por WhatsApp\n📅 Precios por ${st.duracion} días`;
  return t;
}
function vTienda() {
  return `<div class="vh"><div><h2>Tienda</h2><p>Tu catálogo de precios listo para enviar o publicar en estados</p></div></div>
  <div class="shop">
    <section class="card">
      <div class="card-h"><div><h3>Servicios</h3><small>marca qué mostrar y ajusta el precio</small></div><button class="btn sm" data-a="nuevoServicio">${icon('plus')}Servicio</button></div>
      ${S.servicios.map(s => { const st = stockServicio(s.id); return `<div class="shop-row">
        <input type="checkbox" data-cat="${s.id}" ${s.catalogo ? 'checked' : ''} aria-label="Mostrar en catálogo" style="width:18px;height:18px;accent-color:var(--acc)">
        ${badgeSvc(s.id)}
        <div style="min-width:0"><b>${esc(s.nombre)}</b><br><small style="color:${st ? 'var(--ok)' : 'var(--mut2)'}">${S.cuentas.some(c => c.servicioId === s.id) ? (st ? st + ' libres' : 'Agotado') : 'Sin cuentas'}</small></div>
        <input type="number" min="0" step="any" value="${s.precio}" data-price="${s.id}" aria-label="Precio de ${esc(s.nombre)}">
        <button class="ib sm" title="Editar" data-a="editServicio" data-id="${s.id}">${icon('edit')}</button></div>`; }).join('')}
      <div class="sep"></div>
      <div class="card-h"><div><h3>Combos</h3><small>paquetes con precio especial</small></div><button class="btn sm" data-a="nuevoCombo">${icon('plus')}Combo</button></div>
      ${S.combos.length ? S.combos.map(listaCombo).join('') : emptyMini('Sin combos todavía')}
    </section>
    <section class="card">
      <div class="card-h"><div><h3>Vista previa</h3><small>así se verá en WhatsApp</small></div>
        <label class="chk" style="margin:0;font-size:13px"><input type="checkbox" data-set="catStock" ${S.settings.catStock ? 'checked' : ''}> Mostrar stock</label></div>
      <div class="preview wa-bubble">${esc(textoCatalogo()).replace(/\*([^*\n]+)\*/g, '<b>$1</b>')}</div>
      <div class="row-btns" style="margin-top:12px">
        <button class="btn pri" data-a="waCatalogo">${icon('wa')}Enviar por WhatsApp</button>
        <button class="btn" data-a="copiarCatalogo">${icon('copy')}Copiar</button>
        <button class="btn" data-a="shareCatalogo">${icon('share')}Compartir</button>
        <button class="btn" data-a="imgCatalogo">${icon('image')}Imagen para estados</button>
      </div>
    </section>
  </div>`;
}
function listaCombo(c) {
  const normal = c.servicioIds.reduce((a, id) => a + (svc(id)?.precio || 0), 0);
  return `<div class="row tight"><div style="display:flex;gap:3px">${c.servicioIds.map(id => badgeSvc(id)).join('')}</div>
    <div class="grow"><b>${esc(c.nombre)}</b><small>${c.servicioIds.map(id => esc(svc(id)?.nombre || '?')).join(' + ')}${normal > c.precio ? ` · ahorro ${money(normal - c.precio)}` : ''}</small></div>
    <b>${money(c.precio)}</b><button class="ib sm" title="Editar combo" data-a="editCombo" data-id="${c.id}">${icon('edit')}</button></div>`;
}

/* =====================================================================
   VISTA: REPORTES
   ===================================================================== */
function barChart(data) {
  const W = 640, H = 230, PL = 8, PB = 26, PT = 12;
  const max = Math.max(1, ...data.flatMap(d => [d.a, d.b]));
  const bw = (W - PL * 2) / data.length;
  const y = v => PT + (H - PT - PB) * (1 - v / max);
  let g = '';
  for (let i = 1; i <= 3; i++) { const yy = PT + (H - PT - PB) * i / 4; g += `<line class="gl" x1="0" x2="${W}" y1="${yy}" y2="${yy}" stroke-dasharray="3 5"/>`; }
  data.forEach((d, i) => {
    const x = PL + i * bw + bw * .18, w = bw * .3;
    g += `<rect x="${x}" y="${y(d.a)}" width="${w}" height="${H - PB - y(d.a)}" rx="5" fill="var(--acc)"><title>Ingresos ${money(d.a)}</title></rect>`;
    g += `<rect x="${x + w + 4}" y="${y(d.b)}" width="${w}" height="${H - PB - y(d.b)}" rx="5" fill="var(--mut2)" opacity=".55"><title>Gastos ${money(d.b)}</title></rect>`;
    g += `<text x="${PL + i * bw + bw / 2}" y="${H - 7}" text-anchor="middle">${d.label}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos 6 meses">${g}</svg>`;
}
function vReportes() {
  const ym = F.mes;
  const pag = S.pagos.filter(p => mesDe(p.fecha) === ym).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const gas = S.gastos.filter(g => mesDe(g.fecha) === ym).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ing = sum(pag, 'monto'), gst = sum(gas, 'monto'), gan = ing - gst;
  const margen = ing ? Math.round(gan / ing * 100) : 0;
  const ventasN = pag.filter(p => p.concepto !== 'Renovación').length, renovN = pag.filter(p => p.concepto === 'Renovación').length;
  const act = S.subs.filter(s => s.activa);
  const cartera = sum(act, 'precio'), clientesAct = new Set(act.map(s => s.clienteId)).size;
  const ticket = pag.length ? ing / pag.length : 0;
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const m = addMonthYM(ym, -i);
    meses.push({ label: MESES[Number(m.slice(5)) - 1], a: sum(S.pagos.filter(p => mesDe(p.fecha) === m), 'monto'), b: sum(S.gastos.filter(g => mesDe(g.fecha) === m), 'monto') });
  }
  const porSvc = {};
  for (const p of pag) {
    const subs = (p.subIds || []).map(subById).filter(Boolean);
    const tot = sum(subs, 'precio');
    if (p.servicioId && svc(p.servicioId)) { porSvc[p.servicioId] = (porSvc[p.servicioId] || 0) + p.monto; continue; }
    if (!subs.length || !tot) { porSvc._otros = (porSvc._otros || 0) + p.monto; continue; }
    for (const s of subs) porSvc[s.servicioId] = (porSvc[s.servicioId] || 0) + p.monto * s.precio / tot;
  }
  const svcRows = Object.entries(porSvc).sort((a, b) => b[1] - a[1]);
  const maxSvc = Math.max(1, ...svcRows.map(r => r[1]));
  const topCli = {};
  const nomPago = {};
  for (const p of pag) { const k = p.clienteId || 'n:' + (p.clienteNombre || '—'); topCli[k] = (topCli[k] || 0) + p.monto; nomPago[k] = cliente(p.clienteId)?.nombre || p.clienteNombre || 'Cliente eliminado'; }
  const topRows = Object.entries(topCli).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return `<div class="vh"><div><h2>Reportes</h2><p>Ingresos, gastos y ganancia real de tu negocio</p></div>
    <div class="hero-act"><div class="month-nav"><button class="ib" data-a="mes" data-id="-1" title="Mes anterior">${icon('chevL')}</button><b>${mesLabel(ym)}</b><button class="ib" data-a="mes" data-id="1" title="Mes siguiente">${icon('chevR')}</button></div>
    <button class="btn pri" data-a="nuevoGasto">${icon('plus')}Gasto</button></div></div>
    <div class="kpis">
      ${kpi('Ingresos', money(ing), `${pag.length} pago${pag.length === 1 ? '' : 's'}`, 'ok', 'noop')}
      ${kpi('Gastos', money(gst), `${gas.length} registro${gas.length === 1 ? '' : 's'}`, 'bad', 'noop')}
      ${kpi('Ganancia', money(gan), `margen ${margen}%`, gan >= 0 ? 'ok hl' : 'bad hl', 'noop')}
      ${kpi('Ticket promedio', money(ticket), `${ventasN} ventas · ${renovN} renovaciones`, 'acc', 'noop')}
      ${kpi('Cartera activa', money(cartera), `${act.length} servicios activos`, '', 'noop')}
      ${kpi('Clientes activos', clientesAct, `de ${S.clientes.length} en total`, '', 'go', 'clientes')}
      ${kpi('Por cobrar', money(sum(act.filter(s => !s.pagado), 'precio')), 'pendiente hoy', 'warn', 'filtro', 'pendientes')}
      ${kpi('Perfiles libres', S.cuentas.filter(c => c.activa !== false).reduce((a, c) => a + libres(c.id), 0), 'para vender ya', '', 'go', 'cuentas')}
    </div>
    <div class="grid2">
      <section class="card"><div class="card-h"><div><h3>Últimos 6 meses</h3><small>ingresos vs. gastos</small></div></div>
        ${barChart(meses)}<div class="legend"><span><i style="background:var(--acc)"></i>Ingresos</span><span><i style="background:var(--mut2);opacity:.55"></i>Gastos</span></div></section>
      <div class="stack">
        <section class="card"><div class="card-h"><div><h3>Ingresos por servicio</h3><small>${mesLabel(ym)}</small></div></div>
          ${svcRows.length ? svcRows.map(([id, v]) => `<div class="hbar">${id === '_otros' ? '<span class="sv" style="--c:#777">··</span>' : badgeSvc(id)}<div><div class="t"><b>${id === '_otros' ? 'Otros' : esc(svc(id)?.nombre || '—')}</b><span>${money(v)} · ${ing ? Math.round(v / ing * 100) : 0}%</span></div><div class="bar"><i style="width:${v / maxSvc * 100}%"></i></div></div></div>`).join('') : emptyMini('Sin ingresos este mes')}</section>
        <section class="card"><div class="card-h"><div><h3>Mejores clientes</h3><small>${mesLabel(ym)}</small></div></div>
          ${topRows.length ? topRows.map(([cid, v]) => `<div class="row tight">${avatar(nomPago[cid] || '?')}<div class="grow${cliente(cid) ? ' click" data-a="verCliente" data-id="' + cid : ''}"><b>${esc(nomPago[cid])}</b></div><b>${money(v)}</b></div>`).join('') : emptyMini('Sin datos')}</section>
      </div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <section class="card"><div class="card-h"><div><h3>Pagos recibidos</h3><small>${pag.length} en ${mesLabel(ym)}</small></div><button class="btn sm" data-a="exportCSV" data-id="pagos">${icon('download')}CSV</button></div>
        ${pag.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Cliente</th><th>Concepto</th><th>Método</th><th class="num">Monto</th><th></th></tr></thead><tbody>${pag.map(p => `<tr><td>${fechaCorta(p.fecha)}</td><td>${esc(cliente(p.clienteId)?.nombre || p.clienteNombre || '—')}</td><td>${esc(p.concepto || '')}</td><td>${esc(p.metodo || '')}</td><td class="num">${money(p.monto)}</td><td><button class="ib sm" title="Eliminar pago" data-a="delPago" data-id="${p.id}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : emptyMini('Sin pagos este mes')}</section>
      <section class="card"><div class="card-h"><div><h3>Gastos</h3><small>cuentas, publicidad, herramientas…</small></div><button class="btn sm" data-a="exportCSV" data-id="gastos">${icon('download')}CSV</button></div>
        ${gas.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="num">Monto</th><th></th></tr></thead><tbody>${gas.map(g => `<tr><td>${fechaCorta(g.fecha)}</td><td>${esc(g.concepto)}</td><td>${esc(g.categoria || '')}</td><td class="num">${money(g.monto)}</td><td><button class="ib sm" title="Eliminar gasto" data-a="delGasto" data-id="${g.id}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : emptyMini('Sin gastos este mes')}</section>
    </div>`;
}

/* =====================================================================
   VISTA: AJUSTES
   ===================================================================== */
function vAjustes() {
  const st = S.settings;
  return `<div class="vh"><div><h2>Ajustes</h2><p>Personaliza tu negocio, mensajes, servicios y seguridad</p></div></div>
  <div class="set-grid">
    <div class="stack">
      <section class="card set-sec"><h3>Tu negocio</h3><p>Aparece en los mensajes y en el catálogo.</p>
        <div class="logo-row">
          <img class="logo-prev" src="${st.logo || LOGO_BASE}" alt="Logo">
          <div><b>Logo</b><p class="hint" style="margin:2px 0 8px">PNG o JPG, ideal cuadrado. Sale en la app, en la pantalla de PIN y en la imagen de precios.</p>
          <div class="row-btns"><button type="button" class="btn sm pri" data-a="subirLogo">${icon('upload')}${st.logo ? 'Cambiar logo' : 'Subir logo'}</button>${st.logo ? '<button type="button" class="btn sm ghost" data-a="quitarLogo">Quitar</button>' : ''}</div></div>
        </div>
        <form data-form="ajustes">
          <div class="g3"><label class="fld"><span>Nombre del negocio</span><input name="negocio" value="${esc(st.negocio)}" required></label>
          <label class="fld"><span>Tu nombre (saludo)</span><input name="usuario" value="${esc(st.usuario)}" placeholder="Opcional"></label>
          <label class="fld"><span>WhatsApp del negocio</span><input name="whatsapp" value="${esc(st.whatsapp)}" inputmode="tel" placeholder="Para soporte"></label></div>
          <div class="g3"><label class="fld"><span>Símbolo moneda</span><input name="simbolo" value="${esc(st.simbolo)}" maxlength="4"></label>
          <label class="fld"><span>Decimales</span><select name="decimales"><option value="0" ${+st.decimales === 0 ? 'selected' : ''}>0 (ej. 15.000)</option><option value="2" ${+st.decimales === 2 ? 'selected' : ''}>2 (ej. 15,00)</option></select></label>
          <label class="fld"><span>Indicativo país</span><input name="pais" value="${esc(st.pais)}" inputmode="numeric" placeholder="57"></label></div>
          <div class="g3"><label class="fld"><span>Avisar con (días)</span><input type="number" min="1" max="30" name="diasAviso" value="${st.diasAviso}"></label>
          <label class="fld"><span>Días de gracia</span><input type="number" min="0" max="60" name="diasGracia" value="${st.diasGracia}"></label>
          <label class="fld"><span>Duración por defecto</span><select name="duracion">${DURS.map(n => `<option value="${n}" ${+st.duracion === n ? 'selected' : ''}>${durTxt(n)}</option>`).join('')}</select></label></div>
          <p class="hint">Días de gracia: tiempo que esperas a un cliente vencido antes de sugerirte liberar su perfil.</p>
          <button class="btn pri" type="submit">Guardar cambios</button>
        </form></section>

      <section class="card set-sec"><div class="card-h"><div><h3>Servicios</h3><p style="color:var(--mut);font-size:13.5px">Plataformas que vendes, perfiles por cuenta y precio base.</p></div><button class="btn sm" data-a="nuevoServicio">${icon('plus')}Agregar</button></div>
        ${S.servicios.map(s => `<div class="row tight">${badgeSvc(s.id)}<div class="grow"><b>${esc(s.nombre)}</b><small>${s.perfiles} perfiles por cuenta · ${money(s.precio)}${s.costo ? ' · costo ' + money(s.costo) : ''}</small></div><button class="ib sm" data-a="editServicio" data-id="${s.id}" title="Editar">${icon('edit')}</button></div>`).join('')}</section>

      <section class="card set-sec"><div class="card-h"><div><h3>Combos</h3><p style="color:var(--mut);font-size:13.5px">Elige un combo al vender y se llenan solas las apps.</p></div><button class="btn sm" data-a="nuevoCombo">${icon('plus')}Agregar</button></div>
        ${S.combos.length ? S.combos.map(listaCombo).join('') : emptyMini('Sin combos')}</section>
    </div>

    <div class="stack">
      <section class="card set-sec"><h3>Mensajes de WhatsApp</h3><p>Usa estas variables y se reemplazan solas:</p>
        <div class="vars"><code>{cliente}</code><code>{negocio}</code><code>{detalle}</code><code>{total}</code><code>{vence}</code></div>
        <form data-form="plantillas">
          ${Object.keys(DEF_PLANTILLAS).map(k => `<label class="fld"><span>${PLANTILLA_NOMBRES[k]}</span><textarea name="${k}" rows="5">${esc(st.plantillas[k])}</textarea></label>`).join('')}
          <div class="row-btns"><button class="btn pri" type="submit">Guardar mensajes</button><button class="btn ghost" type="button" data-a="plantillasDef">Restaurar originales</button></div>
        </form></section>

      ${htmlSync()}

      <section class="card set-sec"><h3>Seguridad</h3><p>${st.pinHash ? 'Tu panel pide PIN al abrirse.' : 'Protege tu panel con un PIN (las claves de tus cuentas quedan a salvo si alguien toma tu celular).'}</p>
        <div class="row-btns"><button class="btn${st.pinHash ? '' : ' pri'}" data-a="pin">${icon('lock')}${st.pinHash ? 'Cambiar PIN' : 'Activar PIN'}</button>${st.pinHash ? `<button class="btn ghost" data-a="quitarPin">Quitar PIN</button><button class="btn ghost" data-a="bloquear">Bloquear ahora</button>` : ''}</div></section>

      <section class="card set-sec"><h3>Respaldo y datos</h3>
        <p>Todo se guarda en este navegador. Descarga un respaldo y súbelo en otro celular o computador para pasar tus datos.${st.ultimoRespaldo ? ` Último respaldo: <b>${fecha(st.ultimoRespaldo)}</b>.` : ' <b>Aún no has hecho ningún respaldo.</b>'}</p>
        <div class="row-btns">
          <button class="btn pri" data-a="exportar">${icon('download')}Descargar respaldo</button>
          <button class="btn" data-a="importar">${icon('upload')}Restaurar respaldo</button>
          <button class="btn" data-a="importar">${icon('upload')}Importar desde MrNetflix</button>
          <button class="btn ghost" data-a="exportCSV" data-id="ventas">Ventas CSV</button>
          <button class="btn ghost" data-a="exportCSV" data-id="clientes">Clientes CSV</button>
          <button class="btn ghost" data-a="exportCSV" data-id="cuentas">Cuentas CSV</button>
        </div>
        <div class="sep"></div>
        <div class="row-btns"><button class="btn ghost" data-a="demo">Cargar datos de ejemplo</button><button class="btn ghost" style="color:var(--bad)" data-a="borrarTodo">${icon('trash')}Borrar todo</button></div>
      </section>
      <p class="hint" style="text-align:center">CuentasPro · funciona sin conexión · ${S.cuentas.length} cuentas · ${S.subs.length} ventas · ${S.clientes.length} clientes</p>
    </div>
  </div>`;
}

/* =====================================================================
   MODALES
   ===================================================================== */
let MODAL = null; // { kind, reopen, parent }
let DRAFT = null;
function openModal(html, opt = {}) {
  let parent = null;
  if (MODAL && opt.kind !== 'cliente') parent = MODAL.kind === 'cliente' ? MODAL.reopen : MODAL.parent;
  MODAL = { kind: opt.kind || 'x', reopen: opt.reopen || null, parent };
  const m = $('#modal');
  m.innerHTML = `<div class="sheet ${opt.size || ''}" role="dialog" aria-modal="true">${html}</div>`;
  m.classList.add('open');
  document.body.classList.add('noscroll');
  const first = m.querySelector('[autofocus]'); if (first) setTimeout(() => first.focus(), 60);
}
function closeModal(force) {
  const p = MODAL?.parent;
  MODAL = null; DRAFT = null;
  if (p && !force) { p(); return; }
  const m = $('#modal'); m.classList.remove('open'); m.innerHTML = '';
  document.body.classList.remove('noscroll');
}
function refreshModal() { if (MODAL?.kind === 'cliente' && MODAL.reopen) MODAL.reopen(); }
const mHead = t => `<div class="m-h"><h3>${t}</h3><button type="button" class="ib" data-a="cerrar" aria-label="Cerrar">${icon('x')}</button></div>`;
let CONF = null;
function confirmar(msg, ok, { txt = 'Confirmar', danger = true } = {}) {
  CONF = ok;
  const c = $('#confirm');
  c.innerHTML = `<div class="sheet small" role="alertdialog"><div class="m-b" style="padding-top:20px"><p>${msg}</p></div><div class="m-f"><button class="btn" data-a="confNo">Cancelar</button><button class="btn ${danger ? 'danger' : 'pri'}" data-a="confSi">${txt}</button></div></div>`;
  c.classList.add('open');
}
function closeConfirm() { const c = $('#confirm'); c.classList.remove('open'); c.innerHTML = ''; CONF = null; }
const optServicios = sel => S.servicios.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('');
const optDur = sel => { const set = new Set([...DURS, +sel]); return [...set].sort((a, b) => a - b).map(n => `<option value="${n}" ${+sel === n ? 'selected' : ''}>${durTxt(n)}</option>`).join(''); };
const optMetodo = sel => METODOS.map(m => `<option ${m === sel ? 'selected' : ''}>${m}</option>`).join('');

/* ---------- Nueva venta / combo ---------- */
function usoDraft(excl = -1) {
  const u = {};
  DRAFT.items.forEach((it, j) => {
    if (j === excl || !it.cuentaId) return;
    const c = cuenta(it.cuentaId);
    u[it.cuentaId] = (u[it.cuentaId] || 0) + (it.completa ? (c?.perfilesMax || 1) : 1);
  });
  return u;
}
const perfilesDraft = (cid, excl = -1) => DRAFT.items.filter((it, j) => j !== excl && it.cuentaId === cid && it.perfil).map(it => it.perfil);
function nuevoItem(sid) {
  const sv = svc(sid);
  const cid = autoCuenta(sid, usoDraft());
  const perfil = cid ? nextPerfil(cid, perfilesDraft(cid)) : '';
  return { servicioId: sid, cuentaId: cid, perfil, pin: cid ? pinDef(cid, perfil) : '', precio: sv ? sv.precio : 0, completa: false, vence: '' };
}
function aplicarCombo(id) {
  const cb = S.combos.find(c => c.id === id);
  if (!cb) return;
  DRAFT.items = [];
  const n = cb.servicioIds.length;
  const por = redondear(Math.floor(cb.precio / n * 100) / 100);
  cb.servicioIds.forEach((sid, i) => {
    const it = nuevoItem(sid);
    it.precio = i === n - 1 ? redondear(cb.precio - por * (n - 1)) : por;
    DRAFT.items.push(it);
  });
}
const totalDraft = () => DRAFT.items.reduce((a, it) => a + (Number(it.precio) || 0), 0);
function modalVenta(opts = {}) {
  if (!S.servicios.length) { toast('Primero crea un servicio en Ajustes', 'bad'); return; }
  DRAFT = { modo: opts.modo || 'venta', clienteId: opts.clienteId || '__new', nuevoNombre: '', nuevoTel: '', comboId: '', difFechas: false,
    inicio: hoy(), dur: S.settings.duracion, pagado: true, metodo: METODOS[1], notas: '', items: [] };
  if (DRAFT.modo === 'combo' && S.combos.length) { DRAFT.comboId = S.combos[0].id; aplicarCombo(DRAFT.comboId); }
  else if (opts.cuentaId) {
    const c = cuenta(opts.cuentaId);
    const perfil = nextPerfil(c.id);
    DRAFT.items = [{ servicioId: c.servicioId, cuentaId: c.id, perfil, pin: pinDef(c.id, perfil), precio: svc(c.servicioId)?.precio || 0, completa: false, vence: '' }];
  } else DRAFT.items = [nuevoItem(opts.servicioId || S.servicios[0].id)];
  openModal(htmlVenta());
}
function htmlItems() {
  return DRAFT.items.map((it, i) => {
    const sv = svc(it.servicioId);
    const cs = S.cuentas.filter(c => c.activa !== false && c.servicioId === it.servicioId);
    const uso = usoDraft(i);
    return `<div class="item">
      <div class="item-h">${badgeSvc(it.servicioId)}<b>APP ${i + 1}</b>${DRAFT.items.length > 1 ? `<button type="button" class="link" data-a="delItem" data-id="${i}">Quitar</button>` : ''}</div>
      <div class="g2">
        <label class="fld"><span>Servicio</span><select data-i="${i}" data-k="servicioId">${optServicios(it.servicioId)}</select></label>
        <label class="fld"><span>Cuenta madre</span><select data-i="${i}" data-k="cuentaId">
          <option value="">${cs.length ? 'Sin asignar' : `— No tienes cuentas de ${esc(sv?.nombre || '')} —`}</option>
          ${cs.map(c => { const l = Math.max(0, libres(c.id) - (uso[c.id] || 0)); return `<option value="${c.id}" ${c.id === it.cuentaId ? 'selected' : ''} ${l <= 0 && c.id !== it.cuentaId ? 'disabled' : ''}>${esc(c.correo)} (${l} libre${l === 1 ? '' : 's'})</option>`; }).join('')}
        </select></label>
      </div>
      <div class="g3">
        <label class="fld"><span>Nombre del perfil</span><input data-i="${i}" data-k="perfil" value="${esc(it.completa ? '' : it.perfil)}" ${it.completa ? 'disabled placeholder="Cuenta completa"' : 'placeholder="Perfil 1"'}></label>
        <label class="fld"><span>PIN del perfil</span><input data-i="${i}" data-k="pin" value="${esc(it.pin)}" placeholder="Opcional" inputmode="numeric" maxlength="8"></label>
        <label class="fld"><span>Precio</span><input type="number" min="0" step="any" data-i="${i}" data-k="precio" value="${it.precio}"></label>
      </div>
      ${DRAFT.difFechas ? `<label class="fld"><span>Vence</span><input type="date" data-i="${i}" data-k="vence" value="${it.vence || addDays(DRAFT.inicio, DRAFT.dur)}"></label>` : ''}
      <label class="chk"><input type="checkbox" data-i="${i}" data-k="completa" ${it.completa ? 'checked' : ''}> Vendida como cuenta completa (ocupa todos los perfiles)</label>
    </div>`;
  }).join('');
}
function htmlVenta() {
  const d = DRAFT;
  const clientes = S.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return `<form id="fVenta" data-form="venta" autocomplete="off">
    ${mHead(d.modo === 'combo' ? 'Nuevo combo' : 'Nueva venta')}
    <div class="m-b">
      <label class="fld"><span>Cliente</span><select data-d="clienteId">
        <option value="__new" ${d.clienteId === '__new' ? 'selected' : ''}>＋ Nuevo cliente</option>
        ${clientes.map(c => `<option value="${c.id}" ${d.clienteId === c.id ? 'selected' : ''}>${esc(c.nombre)}${c.telefono ? ' · ' + esc(c.telefono) : ''}</option>`).join('')}
      </select></label>
      <div id="vNuevo" class="g2" ${d.clienteId === '__new' ? '' : 'hidden'}>
        <label class="fld"><span>Nombre</span><input data-d="nuevoNombre" value="${esc(d.nuevoNombre)}" placeholder="Ej. María Torres" autofocus></label>
        <label class="fld"><span>WhatsApp</span><input data-d="nuevoTel" value="${esc(d.nuevoTel)}" inputmode="tel" placeholder="300 123 4567"></label>
      </div>
      ${d.modo === 'combo' ? `<label class="fld"><span>Combo</span><select data-d="comboId"><option value="">Elige un combo…</option>${S.combos.map(c => `<option value="${c.id}" ${d.comboId === c.id ? 'selected' : ''}>${esc(c.nombre)} · ${c.servicioIds.length} apps · ${money(c.precio)}</option>`).join('')}</select></label>
        <p class="hint">Elige un combo y se llenan solas las apps con una cuenta madre que tenga perfiles libres. Tus combos se editan en Ajustes → Combos.</p>` : ''}
      <label class="chk"><input type="checkbox" data-d="difFechas" ${d.difFechas ? 'checked' : ''}> Fechas diferentes por app</label>
      <div id="vItems">${htmlItems()}</div>
      <button type="button" class="btn ghost full" style="margin-bottom:14px" data-a="addItem">${icon('plus')}Agregar otra app</button>
      <div class="g3">
        <label class="fld"><span>Fecha de inicio</span><input type="date" data-d="inicio" value="${d.inicio}"></label>
        <label class="fld"><span>Duración</span><select data-d="dur">${optDur(d.dur)}</select></label>
        <label class="fld"><span>Método de pago</span><select data-d="metodo">${optMetodo(d.metodo)}</select></label>
      </div>
      <label class="chk"><input type="checkbox" data-d="pagado" ${d.pagado ? 'checked' : ''}> Ya pagó (registrar el cobro)</label>
      <label class="fld"><span>Notas</span><input data-d="notas" value="${esc(d.notas)}" placeholder="Opcional"></label>
    </div>
    <div class="m-f">
      <div class="tot"><small>Total</small><b id="vTotal">${money(totalDraft())}</b><small id="vVence">${d.difFechas ? 'Fechas por app' : 'Vence ' + fecha(addDays(d.inicio, d.dur))}</small></div>
      <button type="button" class="btn" data-a="cerrar">Cancelar</button>
      <button type="submit" class="btn" value="guardar">Guardar</button>
      <button type="submit" class="btn pri" value="entregar">${icon('wa')}Guardar y entregar</button>
    </div>
  </form>`;
}
function rerenderItems() { const el = $('#vItems'); if (el) el.innerHTML = htmlItems(); }
function updateTotal() {
  const t = $('#vTotal'); if (t) t.textContent = money(totalDraft());
  const v = $('#vVence'); if (v) v.textContent = DRAFT.difFechas ? 'Fechas por app' : 'Vence ' + fecha(addDays(DRAFT.inicio || hoy(), DRAFT.dur));
}
function draftInput(t, isChange) {
  const d = DRAFT; if (!d) return;
  const val = t.type === 'checkbox' ? t.checked : t.value;
  if (t.dataset.i != null) {
    const i = Number(t.dataset.i), k = t.dataset.k, it = d.items[i];
    if (!it || !k) return;
    it[k] = val;
    if (isChange && k === 'servicioId') {
      it.cuentaId = autoCuenta(val, usoDraft(i));
      it.perfil = it.cuentaId ? nextPerfil(it.cuentaId, perfilesDraft(it.cuentaId, i)) : '';
      it.pin = it.cuentaId ? pinDef(it.cuentaId, it.perfil) : '';
      it.completa = false;
      if (!d.comboId) it.precio = svc(val)?.precio || 0;
      rerenderItems();
    } else if (isChange && k === 'cuentaId') {
      it.perfil = val ? nextPerfil(val, perfilesDraft(val, i)) : '';
      it.pin = val ? pinDef(val, it.perfil) : '';
      rerenderItems();
    } else if (isChange && k === 'completa') {
      it.perfil = it.completa ? '' : (it.cuentaId ? nextPerfil(it.cuentaId, perfilesDraft(it.cuentaId, i)) : '');
      rerenderItems();
    }
  } else {
    const k = t.dataset.d; if (!k) return;
    d[k] = val;
    if (k === 'clienteId') { const n = $('#vNuevo'); if (n) n.hidden = val !== '__new'; }
    if (isChange && k === 'comboId') { aplicarCombo(val); rerenderItems(); }
    if (isChange && k === 'difFechas') rerenderItems();
  }
  updateTotal();
}
function guardarVenta(entregar) {
  const d = DRAFT; if (!d) return;
  if (d.clienteId === '__new' && !d.nuevoNombre.trim()) { toast('Escribe el nombre del cliente', 'bad'); return; }
  if (!d.clienteId) { toast('Selecciona un cliente', 'bad'); return; }
  if (!d.items.length) { toast('Agrega al menos una app', 'bad'); return; }
  if (!d.inicio) { toast('Elige la fecha de inicio', 'bad'); return; }
  const need = {};
  for (const it of d.items) {
    if (!it.servicioId) { toast('Elige el servicio de cada app', 'bad'); return; }
    if (it.cuentaId) { const c = cuenta(it.cuentaId); need[it.cuentaId] = (need[it.cuentaId] || 0) + (it.completa ? c.perfilesMax : 1); }
  }
  for (const k in need) if (need[k] > libres(k)) { toast(`La cuenta ${cuenta(k).correo} no tiene perfiles suficientes`, 'bad'); return; }
  let cid = d.clienteId;
  if (cid === '__new') {
    const tel = d.nuevoTel.trim();
    const existente = tel && S.clientes.find(c => normTel(c.telefono) === normTel(tel));
    if (existente) cid = existente.id;
    else { const c = { id: uid(), nombre: d.nuevoNombre.trim(), telefono: tel, notas: '', creado: hoy() }; S.clientes.push(c); cid = c.id; }
  }
  const ventaId = uid(), venceDef = addDays(d.inicio, d.dur);
  const nuevos = d.items.map(it => ({
    id: uid(), ventaId, clienteId: cid, servicioId: it.servicioId, cuentaId: it.cuentaId || '',
    perfil: it.completa ? '' : String(it.perfil || '').trim(), pin: String(it.pin || '').trim(), precio: Number(it.precio) || 0,
    completa: !!it.completa, inicio: d.inicio, vence: d.difFechas && it.vence ? it.vence : venceDef,
    pagado: !!d.pagado, activa: true, notas: d.notas.trim(), creado: new Date().toISOString(), renovaciones: 0, comboId: d.comboId || '',
  }));
  S.subs.push(...nuevos);
  if (d.pagado) S.pagos.push({ id: uid(), clienteId: cid, subIds: nuevos.map(s => s.id), monto: sum(nuevos, 'precio'), fecha: hoy(), metodo: d.metodo, concepto: d.comboId ? 'Combo' : 'Venta' });
  anotarCosto(nuevos, 'Costo');
  save();
  closeModal(); render();
  toast(nuevos.length > 1 ? `Combo guardado (${nuevos.length} apps) ✅` : 'Venta guardada ✅');
  if (entregar) abrirWA(cid, mensaje('entrega', nuevos));
}

/* ---------- Renovar ---------- */
function modalRenovar(ids) {
  const subs = ids.map(subById).filter(Boolean);
  if (!subs.length) return;
  const cl = cliente(subs[0].clienteId);
  openModal(`<form data-form="renovar" data-ids="${ids.join(',')}">
    ${mHead('Renovar · ' + esc(cl?.nombre || ''))}
    <div class="m-b">
      ${subs.map(s => `<div class="row tight" style="margin-bottom:7px">${badgeSvc(s.servicioId)}<div class="grow"><b>${esc(svc(s.servicioId)?.nombre || '')}</b><small>${esc(s.completa ? 'Cuenta completa' : s.perfil || '')} · ${venceLabel(s)} (${fecha(s.vence)})</small></div>
        <label class="fld inline"><span>Precio</span><input type="number" step="any" min="0" name="p_${s.id}" value="${s.precio}"></label></div>`).join('')}
      <div class="g3" style="margin-top:12px">
        <label class="fld"><span>Duración</span><select name="dur">${optDur(S.settings.duracion)}</select></label>
        <label class="fld"><span>Contar desde</span><select name="desde"><option value="auto">Automático</option><option value="vence">Su vencimiento</option><option value="hoy">Hoy</option></select></label>
        <label class="fld"><span>Método de pago</span><select name="metodo">${optMetodo(METODOS[1])}</select></label>
      </div>
      <p class="hint">Automático: si aún no vence o venció hace ${S.settings.diasGracia} días o menos, se suma desde su vencimiento; si lleva más tiempo vencido, desde hoy.</p>
      <label class="chk"><input type="checkbox" name="pagado" checked> Ya pagó (registrar el cobro)</label>
    </div>
    <div class="m-f"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" value="guardar" class="btn">Renovar</button><button type="submit" value="avisar" class="btn pri">${icon('wa')}Renovar y avisar</button></div>
  </form>`);
}

/* ---------- Menú de una venta ---------- */
function modalMenuSub(id) {
  const s = subById(id); if (!s) return;
  const cl = cliente(s.clienteId);
  openModal(`${mHead(esc(cl?.nombre || 'Venta') + ' · ' + esc(svc(s.servicioId)?.nombre || ''))}
    <div class="sheet-list">
      <button data-a="editSub" data-id="${id}">${icon('edit')}Editar venta</button>
      <button data-a="waEntrega" data-id="${id}">${icon('wa')}Enviar datos de acceso por WhatsApp</button>
      <button data-a="waRecordar" data-id="${id}">${icon('bell')}Enviar recordatorio de pago</button>
      <button data-a="copiarAcceso" data-id="${id}">${icon('copy')}Copiar datos de acceso</button>
      <button data-a="copiarEnlace" data-id="${id}">${icon('link')}Copiar enlace de acceso (abre en celular, PC o tablet)</button>
      ${s.activa ? `<button data-a="liberar" data-id="${id}">${icon('unlink')}Liberar perfil (cliente no renovó)</button>` : `<button data-a="reactivar" data-id="${id}">${icon('renew')}Reactivar</button>`}
      <button class="danger" data-a="delSub" data-id="${id}">${icon('trash')}Eliminar venta</button>
    </div>`, { size: 'small' });
}
function modalSub(id) {
  const s = subById(id); if (!s) return;
  const clientes = S.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const optCuentas = S.servicios.map(sv => { const cs = S.cuentas.filter(c => c.servicioId === sv.id); return cs.length ? `<optgroup label="${esc(sv.nombre)}">${cs.map(c => `<option value="${c.id}" ${c.id === s.cuentaId ? 'selected' : ''}>${esc(c.correo)} (${libres(c.id, new Set([s.id]))} libres)</option>`).join('')}</optgroup>` : ''; }).join('');
  openModal(`<form data-form="sub" data-id="${id}">
    ${mHead('Editar venta')}
    <div class="m-b">
      <label class="fld"><span>Cliente</span><select name="clienteId">${clientes.map(c => `<option value="${c.id}" ${c.id === s.clienteId ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label>
      <div class="g2"><label class="fld"><span>Servicio</span><select name="servicioId">${optServicios(s.servicioId)}</select></label>
      <label class="fld"><span>Cuenta madre</span><select name="cuentaId"><option value="">Sin asignar</option>${optCuentas}</select></label></div>
      <div class="g3"><label class="fld"><span>Perfil</span><input name="perfil" value="${esc(s.perfil)}"></label>
      <label class="fld"><span>PIN</span><input name="pin" value="${esc(s.pin)}" inputmode="numeric"></label>
      <label class="fld"><span>Precio</span><input type="number" step="any" min="0" name="precio" value="${s.precio}"></label></div>
      <div class="g2 keep"><label class="fld"><span>Inicio</span><input type="date" name="inicio" value="${s.inicio}"></label>
      <label class="fld"><span>Vence</span><input type="date" name="vence" value="${s.vence}" required></label></div>
      <label class="chk"><input type="checkbox" name="completa" ${s.completa ? 'checked' : ''}> Cuenta completa</label>
      <label class="chk"><input type="checkbox" name="pagado" ${s.pagado ? 'checked' : ''}> Pagado</label>
      <label class="fld"><span>Datos de acceso propios (opcional)</span><textarea name="acceso" rows="3" placeholder="Para IPTV u otros sin cuenta madre: servidor, usuario, clave…">${esc(s.acceso || '')}</textarea></label>
      <label class="fld"><span>Notas</span><input name="notas" value="${esc(s.notas || '')}"></label>
      <p class="hint">Renovada ${s.renovaciones || 0} ${s.renovaciones === 1 ? 'vez' : 'veces'} · creada el ${fecha(String(s.creado || s.inicio).slice(0, 10))}</p>
    </div>
    <div class="m-f"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
  </form>`);
}

/* ---------- Clientes ---------- */
function modalCliente(id) {
  const c = id ? cliente(id) : { nombre: '', telefono: '', notas: '' };
  openModal(`<form data-form="cliente" data-id="${id || ''}">
    ${mHead(id ? 'Editar cliente' : 'Nuevo cliente')}
    <div class="m-b">
      <label class="fld"><span>Nombre</span><input name="nombre" value="${esc(c.nombre)}" required autofocus></label>
      <label class="fld"><span>WhatsApp</span><input name="telefono" value="${esc(c.telefono)}" inputmode="tel" placeholder="300 123 4567"></label>
      <p class="hint">Si no pones indicativo se usa +${esc(S.settings.pais)} automáticamente.</p>
      <label class="fld"><span>Lealtad (estrellas)</span><select name="estrellas">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${(c.estrellas || 0) === n ? 'selected' : ''}>${n ? '★'.repeat(n) : 'Sin estrellas'}</option>`).join('')}</select></label>
      <label class="fld"><span>Notas</span><textarea name="notas" rows="3" placeholder="Ej. paga por Nequi, prefiere perfil 2…">${esc(c.notas)}</textarea></label>
    </div>
    <div class="m-f">${id ? `<button type="button" class="btn ghost left" style="color:var(--bad)" data-a="delCliente" data-id="${id}">${icon('trash')}Eliminar</button>` : ''}<button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
  </form>`);
}
function modalVerCliente(id) {
  const c = cliente(id);
  if (!c) { toast('Cliente no encontrado', 'bad'); return; }
  const info = infoCliente(c);
  const act = info.subs.slice().sort((a, b) => a.vence.localeCompare(b.vence));
  const lib = S.subs.filter(s => s.clienteId === id && !s.activa);
  const pagos = S.pagos.filter(p => p.clienteId === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const pendientes = act.filter(s => !s.pagado || ['vencida', 'hoy', 'porvencer'].includes(estadoSub(s)));
  openModal(`${mHead('Cliente')}
    <div class="m-b">
      <div class="cli-h">${avatar(c.nombre, 'xl')}<div style="min-width:0"><h3>${esc(c.nombre)}</h3><p>${esc(c.telefono || 'Sin teléfono')} · cliente desde ${fecha(c.creado)}</p>
        <div class="mini"><span class="chip ok">Pagado ${money(info.pagado)}</span>${info.debe ? `<span class="chip warn">Debe ${money(info.debe)}</span>` : ''}${info.worst ? `<span class="chip ${EST[info.worst].c}">${EST[info.worst].t}</span>` : ''}</div></div></div>
      <div class="row-btns">
        <button class="btn sm" data-a="waChat" data-id="${id}">${icon('wa')}Chat</button>
        ${pendientes.length ? `<button class="btn sm pri" data-a="waCobro" data-id="${id}">${icon('bell')}Enviar cobro</button><button class="btn sm" data-a="renovarCli" data-id="${id}">${icon('renew')}Renovar todo</button>` : ''}
        ${act.length ? `<button class="btn sm" data-a="waEntregaCli" data-id="${id}">${icon('key')}Reenviar accesos</button>` : ''}
        <button class="btn sm" data-a="nuevaVentaCli" data-id="${id}">${icon('plus')}Venta</button>
        <button class="btn sm ghost" data-a="editCliente" data-id="${id}">${icon('edit')}Editar</button>
      </div>
      ${c.notas ? `<div class="banner" style="margin:12px 0 0">${icon('edit')}<span>${esc(c.notas)}</span></div>` : ''}
      <div class="sec-t">Servicios activos (${act.length})</div>
      <div class="list">${act.length ? act.map(rowSub).join('') : emptyMini('Sin servicios activos')}</div>
      ${lib.length ? `<details><summary>Historial liberado (${lib.length})</summary><div class="list">${lib.map(rowSub).join('')}</div></details>` : ''}
      <div class="sec-t">Pagos (${pagos.length})</div>
      ${pagos.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${pagos.slice(0, 20).map(p => `<tr><td>${fecha(p.fecha)}</td><td>${esc(p.concepto || '')}</td><td>${esc(p.metodo || '')}</td><td class="num">${money(p.monto)}</td></tr>`).join('')}</tbody></table></div>` : emptyMini('Sin pagos registrados')}
    </div>`, { kind: 'cliente', reopen: () => modalVerCliente(id), size: 'wide' });
}

/* ---------- Cuentas madre ---------- */
function proveedoresDatalist() {
  const ps = [...new Set(S.cuentas.map(c => c.proveedor).filter(Boolean))];
  return `<datalist id="dlProv">${ps.map(p => `<option value="${esc(p)}">`).join('')}</datalist>`;
}
function modalCuenta(id, preset = {}) {
  const sid0 = preset.servicioId || F.aSvc || S.servicios[0]?.id;
  const c = id ? cuenta(id) : { servicioId: sid0, correo: '', clave: '', perfilesMax: svc(sid0)?.perfiles || 5, proveedor: '', costo: '', vence: addDays(hoy(), 30), notas: '', activa: true };
  if (!S.servicios.length) { toast('Primero crea un servicio', 'bad'); return; }
  const u = id ? subsDeCuenta(id).length : 0;
  openModal(`<form data-form="cuenta" data-id="${id || ''}" autocomplete="off">
    ${mHead(id ? 'Editar cuenta madre' : 'Nueva cuenta madre')}
    <div class="m-b">
      <div class="g2"><label class="fld"><span>Servicio</span><select name="servicioId" data-cuentasvc ${u ? 'disabled' : ''}>${optServicios(c.servicioId)}</select>${u ? `<input type="hidden" name="servicioId" value="${c.servicioId}">` : ''}</label>
      <label class="fld"><span>Perfiles de la cuenta</span><input type="number" min="1" max="50" name="perfilesMax" value="${c.perfilesMax}" required></label></div>
      <label class="fld"><span>Correo</span><input name="correo" type="text" inputmode="email" value="${esc(c.correo)}" required autofocus placeholder="cuenta@correo.com"></label>
      <label class="fld"><span>Clave</span><input name="clave" value="${esc(c.clave)}" placeholder="Opcional"></label>
      <div class="g3"><label class="fld"><span>Proveedor</span><input name="proveedor" list="dlProv" value="${esc(c.proveedor)}" placeholder="Ej. Proveedor Lima"></label>
      <label class="fld"><span>Costo</span><input type="number" min="0" step="any" name="costo" value="${c.costo}" placeholder="0"></label>
      <label class="fld"><span>Vence con proveedor</span><input type="date" name="vence" value="${c.vence || ''}"></label></div>
      ${proveedoresDatalist()}
      <label class="fld"><span>Nombres y PIN de los perfiles (opcional)</span><textarea name="perfilesDef" rows="3" placeholder="Uno por línea, ej.&#10;Perfil 1:1234&#10;Perfil 2:5678">${esc(((c.perfilesDef) || []).map(d => d.nombre + (d.pin ? ':' + d.pin : '')).join('\n'))}</textarea></label>
      <p class="hint">Si los escribes, al vender o repartir se asignan solos con su PIN.</p>
      <label class="fld"><span>Notas</span><input name="notas" value="${esc(c.notas || '')}" placeholder="Ej. pago trimestral, cambiar clave cada mes…"></label>
      ${id ? `<label class="chk"><input type="checkbox" name="activa" ${c.activa !== false ? 'checked' : ''}> Cuenta activa</label>` : `<label class="chk"><input type="checkbox" name="gasto" checked> Registrar el costo como gasto de hoy</label>`}
    </div>
    <div class="m-f">${id ? `<button type="button" class="btn ghost left" style="color:var(--bad)" data-a="delCuenta" data-id="${id}">${icon('trash')}Eliminar</button>` : ''}<button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn" value="guardar">Guardar</button><button type="submit" class="btn pri" value="repartir">${icon('split')}Guardar y repartir</button></div>
  </form>`);
}
function modalImportCuentas() {
  const sid0 = F.aSvc || S.servicios[0]?.id;
  openModal(`<form data-form="importCuentas" autocomplete="off">
    ${mHead('Importar varias cuentas')}
    <div class="m-b">
      <p class="hint" style="margin:0 0 12px">Pega una cuenta por línea con el formato <code>correo:clave</code> (también sirve <code>|</code>, <code>;</code>, coma o tabulación). Todas quedan con los datos de abajo.</p>
      <label class="fld"><span>Cuentas</span><textarea name="lista" rows="7" required placeholder="netflix.ventas01@correo.com:Clave123&#10;netflix.ventas02@correo.com:Clave456"></textarea></label>
      <div class="g2"><label class="fld"><span>Servicio</span><select name="servicioId" data-cuentasvc>${optServicios(sid0)}</select></label>
      <label class="fld"><span>Perfiles por cuenta</span><input type="number" min="1" max="50" name="perfilesMax" value="${svc(sid0)?.perfiles || 5}"></label></div>
      <div class="g3"><label class="fld"><span>Proveedor</span><input name="proveedor" list="dlProv"></label>
      <label class="fld"><span>Costo c/u</span><input type="number" min="0" step="any" name="costo" placeholder="0"></label>
      <label class="fld"><span>Vencen</span><input type="date" name="vence" value="${addDays(hoy(), 30)}"></label></div>
      ${proveedoresDatalist()}
      <label class="chk"><input type="checkbox" name="gasto" checked> Registrar el costo total como gasto</label>
    </div>
    <div class="m-f"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn pri">Importar</button></div>
  </form>`);
}
function modalRenovarCuenta(id) {
  const c = cuenta(id); if (!c) return;
  openModal(`<form data-form="renovarCuenta" data-id="${id}">
    ${mHead('Renovar con proveedor')}
    <div class="m-b">
      <div class="row tight" style="margin-bottom:12px">${badgeSvc(c.servicioId)}<div class="grow"><b>${esc(c.correo)}</b><small>${esc(c.proveedor || 'Sin proveedor')} · ${c.vence ? venceTxt(c.vence) + ' (' + fecha(c.vence) + ')' : 'sin fecha'}</small></div></div>
      <div class="g3"><label class="fld"><span>Duración</span><select name="dur">${optDur(30)}</select></label>
      <label class="fld"><span>Contar desde</span><select name="desde"><option value="vence">Su vencimiento</option><option value="hoy">Hoy</option></select></label>
      <label class="fld"><span>Costo</span><input type="number" min="0" step="any" name="costo" value="${c.costo || ''}"></label></div>
      <label class="chk"><input type="checkbox" name="gasto" checked> Registrar el costo como gasto</label>
    </div>
    <div class="m-f"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn pri">Renovar</button></div>
  </form>`);
}

/* ---------- Gastos, servicios, combos ---------- */
function modalGasto() {
  openModal(`<form data-form="gasto">
    ${mHead('Nuevo gasto')}
    <div class="m-b">
      <label class="fld"><span>Concepto</span><input name="concepto" required autofocus placeholder="Ej. Publicidad en Instagram"></label>
      <div class="g3"><label class="fld"><span>Monto</span><input type="number" min="0" step="any" name="monto" required></label>
      <label class="fld"><span>Fecha</span><input type="date" name="fecha" value="${hoy()}"></label>
      <label class="fld"><span>Categoría</span><select name="categoria">${CAT_GASTO.map(c => `<option>${c}</option>`).join('')}</select></label></div>
    </div>
    <div class="m-f"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
  </form>`);
}
function modalServicio(id) {
  const s = id ? svc(id) : { nombre: '', color: '#ff6a2b', perfiles: 5, precio: 10000, catalogo: true };
  openModal(`<form data-form="servicio" data-id="${id || ''}">
    ${mHead(id ? 'Editar servicio' : 'Nuevo servicio')}
    <div class="m-b">
      <div class="g2"><label class="fld"><span>Nombre</span><input name="nombre" value="${esc(s.nombre)}" required autofocus placeholder="Ej. Vix Premium"></label>
      <label class="fld"><span>Color</span><input type="color" name="color" value="${esc(s.color)}"></label></div>
      <div class="g2 keep"><label class="fld"><span>Perfiles por cuenta</span><input type="number" min="1" max="50" name="perfiles" value="${s.perfiles}"></label>
      <label class="fld"><span>Precio por perfil</span><input type="number" min="0" step="any" name="precio" value="${s.precio}"></label></div>
      <label class="fld"><span>Costo por venta (opcional)</span><input type="number" min="0" step="any" name="costo" value="${s.costo || ''}" placeholder="0"></label>
      <p class="hint">Para lo que vendes sin cuenta madre (IPTV, códigos, licencias…): este costo se anota como gasto en cada venta y renovación, así la ganancia sale real.</p>
      <label class="chk"><input type="checkbox" name="catalogo" ${s.catalogo ? 'checked' : ''}> Mostrar en la tienda</label>
    </div>
    <div class="m-f">${id ? `<button type="button" class="btn ghost left" style="color:var(--bad)" data-a="delServicio" data-id="${id}">${icon('trash')}Eliminar</button>` : ''}<button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
  </form>`);
}
function modalCombo(id) {
  const c = id ? S.combos.find(x => x.id === id) : { nombre: '', servicioIds: [], precio: '' };
  openModal(`<form data-form="combo" data-id="${id || ''}">
    ${mHead(id ? 'Editar combo' : 'Nuevo combo')}
    <div class="m-b">
      <div class="g2 keep"><label class="fld"><span>Nombre</span><input name="nombre" value="${esc(c.nombre)}" required autofocus placeholder="Ej. Combo Familiar"></label>
      <label class="fld"><span>Precio del combo</span><input type="number" min="0" step="any" name="precio" value="${c.precio}" required></label></div>
      <div class="fld"><span>Apps incluidas</span></div>
      <div class="checks">${S.servicios.map(s => `<label><input type="checkbox" name="s" value="${s.id}" ${c.servicioIds.includes(s.id) ? 'checked' : ''}>${badgeSvc(s.id)}${esc(s.nombre)}</label>`).join('')}</div>
      <p class="hint" id="comboInfo"></p>
    </div>
    <div class="m-f">${id ? `<button type="button" class="btn ghost left" style="color:var(--bad)" data-a="delCombo" data-id="${id}">${icon('trash')}Eliminar</button>` : ''}<button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn pri">Guardar</button></div>
  </form>`);
  updateComboInfo($('#modal form'));
}
function updateComboInfo(form) {
  const el = $('#comboInfo'); if (!el || !form) return;
  const ids = [...form.querySelectorAll('input[name=s]:checked')].map(i => i.value);
  const normal = ids.reduce((a, id) => a + (svc(id)?.precio || 0), 0);
  const precio = Number(form.elements.precio.value) || 0;
  el.textContent = ids.length ? `Precio por separado: ${money(normal)}${precio && normal > precio ? ` · el cliente ahorra ${money(normal - precio)}` : ''}` : 'Elige al menos 2 apps.';
}
function modalPin() {
  openModal(`<form data-form="pin">
    ${mHead('PIN de acceso')}
    <div class="m-b">
      <p class="hint" style="margin:0 0 12px">Se pedirá cada vez que abras la app en este dispositivo. Si lo olvidas, tendrás que borrar los datos del navegador, así que guarda un respaldo.</p>
      <div class="g2 keep"><label class="fld"><span>Nuevo PIN</span><input type="password" name="p1" inputmode="numeric" minlength="4" maxlength="8" required autofocus></label>
      <label class="fld"><span>Repetir PIN</span><input type="password" name="p2" inputmode="numeric" minlength="4" maxlength="8" required></label></div>
    </div>
    <div class="m-f"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn pri">Guardar PIN</button></div>
  </form>`, { size: 'small' });
}
function modalMasivo() {
  const grupos = gruposCobro();
  openModal(`${mHead('Recordatorios por WhatsApp')}
    <div class="m-b">
      <p class="hint" style="margin:0 0 12px">Toca cada cliente para abrir WhatsApp con su mensaje listo. Se van marcando a medida que envías.</p>
      ${grupos.map(g => { const c = cliente(g.cid); const enviado = g.subs.some(s => s.recordado === hoy()); return `<div class="row${enviado ? ' done' : ''}" id="mas_${g.cid}">${avatar(c?.nombre || '?')}<div class="grow"><b>${esc(c?.nombre || '—')}</b><small>${g.subs.length} servicio${g.subs.length > 1 ? 's' : ''} · ${venceLabel(g.subs[0])} · ${money(sum(g.subs, 'precio'))}</small></div><button class="btn sm${enviado ? '' : ' pri'}" data-a="masivoWA" data-id="${g.cid}">${icon('wa')}${enviado ? 'Reenviar' : 'Enviar'}</button></div>`; }).join('')}
    </div>`, { kind: 'masivo' });
}
function modalBuscar() {
  openModal(`${mHead('Buscar')}
    <div class="m-b">
      <label class="search" style="margin-bottom:12px">${icon('search')}<input id="gsQ" type="search" placeholder="Cliente, teléfono, correo, perfil o proveedor…" autofocus></label>
      <div id="gsRes" class="gs-res"></div>
    </div>`, { kind: 'buscar' });
}
function buscarGlobal(q) {
  q = q.trim().toLowerCase();
  const el = $('#gsRes'); if (!el) return;
  if (q.length < 2) { el.innerHTML = emptyMini('Escribe al menos 2 letras'); return; }
  const cl = S.clientes.filter(c => [c.nombre, c.telefono, c.notas].join(' ').toLowerCase().includes(q)).slice(0, 8);
  const ct = S.cuentas.filter(c => [c.correo, c.proveedor, c.notas].join(' ').toLowerCase().includes(q)).slice(0, 8);
  const sb = S.subs.filter(s => s.activa && [s.perfil, s.pin].join(' ').toLowerCase().includes(q)).slice(0, 8);
  let h = '';
  if (cl.length) h += '<div class="sec-t">Clientes</div>' + cl.map(c => `<div class="row tight" data-a="verCliente" data-id="${c.id}">${avatar(c.nombre)}<div class="grow"><b>${esc(c.nombre)}</b><small>${esc(c.telefono || '')}</small></div></div>`).join('');
  if (ct.length) h += '<div class="sec-t">Cuentas madre</div>' + ct.map(c => `<div class="row tight" data-a="editCuenta" data-id="${c.id}">${badgeSvc(c.servicioId)}<div class="grow"><b>${esc(c.correo)}</b><small>${esc(c.proveedor || '')} · ${libres(c.id)} libres</small></div></div>`).join('');
  if (sb.length) h += '<div class="sec-t">Perfiles</div>' + sb.map(s => `<div class="row tight" data-a="verCliente" data-id="${s.clienteId}">${badgeSvc(s.servicioId)}<div class="grow"><b>${esc(s.perfil)} · ${esc(cliente(s.clienteId)?.nombre || '')}</b><small>${esc(cuenta(s.cuentaId)?.correo || '')}</small></div></div>`).join('');
  el.innerHTML = h || emptyMini('Sin resultados');
}

/* ---------- Repartir perfiles de una cuenta madre ---------- */
function modalRepartir(cid) {
  const c = cuenta(cid); if (!c) return;
  const sv = svc(c.servicioId), n = libres(cid);
  if (!n) { toast('Esta cuenta no tiene perfiles libres', 'warn'); return; }
  const nombres = [];
  for (let i = 0; i < n; i++) nombres.push(nextPerfil(cid, nombres));
  const clientes = S.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const opts = `<option value="">— Dejar libre —</option><option value="__new">＋ Nuevo cliente</option>${clientes.map(x => `<option value="${x.id}">${esc(x.nombre)}${x.telefono ? ' · ' + esc(x.telefono) : ''}</option>`).join('')}`;
  openModal(`<form data-form="repartir" data-id="${cid}" data-n="${n}" autocomplete="off">
    ${mHead('Repartir perfiles')}
    <div class="m-b">
      <div class="row tight" style="margin-bottom:10px">${badgeSvc(c.servicioId, true)}<div class="grow"><b>${esc(sv?.nombre || '')} · ${esc(c.correo)}</b><small>${n} perfil${n > 1 ? 'es' : ''} libre${n > 1 ? 's' : ''} de ${c.perfilesMax}</small></div></div>
      <p class="hint" style="margin:0 0 12px">Asigna cada perfil a un cliente. Los que dejes en “Dejar libre” siguen disponibles. Al guardar te aparece la lista para mandarle a cada cliente <b>solo su perfil</b> por WhatsApp.</p>
      ${nombres.map((nm, i) => `<div class="item">
        <div class="item-h"><span class="sv" style="--c:${esc(sv?.color || '#666')}">${i + 1}</span><b>PERFIL ${i + 1}</b></div>
        <label class="fld"><span>Cliente</span><select name="r${i}_cli" data-rep="${i}">${opts}</select></label>
        <div class="g2" id="rn${i}" hidden>
          <label class="fld"><span>Nombre del cliente</span><input name="r${i}_nom" placeholder="Ej. María Torres"></label>
          <label class="fld"><span>WhatsApp</span><input name="r${i}_tel" inputmode="tel" placeholder="300 123 4567"></label>
        </div>
        <div class="g3">
          <label class="fld"><span>Nombre del perfil</span><input name="r${i}_perfil" value="${esc(nm)}"></label>
          <label class="fld"><span>PIN</span><input name="r${i}_pin" value="${esc(pinDef(cid, nm))}" placeholder="Opcional" inputmode="numeric" maxlength="8"></label>
          <label class="fld"><span>Precio</span><input type="number" min="0" step="any" name="r${i}_precio" value="${sv?.precio || 0}"></label>
        </div>
      </div>`).join('')}
      <div class="g3">
        <label class="fld"><span>Fecha de inicio</span><input type="date" name="inicio" value="${hoy()}"></label>
        <label class="fld"><span>Duración</span><select name="dur">${optDur(S.settings.duracion)}</select></label>
        <label class="fld"><span>Método de pago</span><select name="metodo">${optMetodo(METODOS[1])}</select></label>
      </div>
      <label class="chk"><input type="checkbox" name="pagado" checked> Ya pagaron (registrar los cobros)</label>
    </div>
    <div class="m-f"><button type="button" class="btn" data-a="cerrar">Cancelar</button><button type="submit" class="btn pri">${icon('wa')}Guardar y enviar uno por uno</button></div>
  </form>`, { size: 'wide' });
}
function modalEnvios(ids) {
  const subs = ids.map(subById).filter(Boolean);
  openModal(`${mHead('Enviar accesos uno por uno')}
    <div class="m-b">
      <p class="hint" style="margin:0 0 12px">Cada cliente recibe solo su perfil, con un enlace que abre en su celular, PC, portátil o tablet. Toca <b>Enviar</b> en cada uno; se van marcando.</p>
      ${subs.map(s => { const cl = cliente(s.clienteId); return `<div class="row" id="env_${s.id}" style="margin-bottom:7px">${avatar(cl?.nombre || '?')}
        <div class="grow"><b>${esc(cl?.nombre || '—')}</b><small>${esc(svc(s.servicioId)?.nombre || '')} · ${esc(s.perfil)}${s.pin ? ' · PIN ' + esc(s.pin) : ''}</small><small class="mut">${esc(cl?.telefono || 'sin teléfono: WhatsApp te pedirá elegir el contacto')}</small></div>
        <div class="acts"><button class="ib" title="Copiar enlace de acceso" data-a="copiarEnlace" data-id="${s.id}">${icon('link')}</button><button class="ib" title="Copiar mensaje" data-a="copiarMsg" data-id="${s.id}">${icon('copy')}</button><button class="btn sm pri" data-a="envioWA" data-id="${s.id}">${icon('wa')}Enviar</button></div></div>`; }).join('')}
    </div>
    <div class="m-f"><button class="btn pri" data-a="cerrar">Listo</button></div>`, { kind: 'envios' });
}

/* ---------- Logo ---------- */
function procesarLogo(file) {
  $('#logoFile').value = '';
  if (!file) return;
  if (!/^image\//.test(file.type)) { toast('Elige una imagen (PNG, JPG, WEBP o SVG)', 'bad'); return; }
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Ícono cuadrado 512×512 con fondo blanco para la app instalada (celular/PC)
      try {
        const ic = document.createElement('canvas'); ic.width = ic.height = 512;
        const ix = ic.getContext('2d'); ix.fillStyle = '#ffffff'; ix.fillRect(0, 0, 512, 512);
        const iw = img.width || 512, ih = img.height || 512, ik = 420 / Math.max(iw, ih);
        ix.drawImage(img, (512 - iw * ik) / 2, (512 - ih * ik) / 2, iw * ik, ih * ik);
        S.settings.logoIcono = ic.toDataURL('image/jpeg', 0.9);
      } catch (e) { S.settings.logoIcono = ''; }
      const max = 256, k = Math.min(1, max / Math.max(img.width || max, img.height || max));
      const w = Math.max(1, Math.round((img.width || max) * k)), h = Math.max(1, Math.round((img.height || max) * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      let url = cv.toDataURL('image/png');
      if (url.length > 120000) url = cv.toDataURL('image/webp', 0.9);
      S.settings.logo = url;
      changed('Logo actualizado ✅');
    };
    img.onerror = () => toast('No pude leer esa imagen', 'bad');
    img.src = r.result;
  };
  r.readAsDataURL(file);
}
const cargarImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// Imagen vertical con la lista de precios y el logo (para estados de WhatsApp o Instagram)
async function imagenCatalogo() {
  const st = S.settings, vis = S.servicios.filter(s => s.catalogo);
  if (!vis.length && !S.combos.length) { toast('Marca al menos un servicio para la tienda', 'warn'); return; }
  try { await document.fonts.ready; } catch (e) { /* nada */ }
  const F0 = "'Plus Jakarta Sans', system-ui, sans-serif", W = 1080;
  const H = Math.max(1350, 470 + vis.length * 128 + (S.combos.length ? 110 + S.combos.length * 150 : 0) + 230);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b0d1c'); g.addColorStop(1, '#1a1030'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W, 0, 0, W, 0, 700); glow.addColorStop(0, 'rgba(255,106,43,.35)'); glow.addColorStop(1, 'rgba(255,106,43,0)'); x.fillStyle = glow; x.fillRect(0, 0, W, H);
  const logo = await cargarImg(st.logo || LOGO_BASE);
  if (logo) { x.save(); rrect(x, W / 2 - 85, 70, 170, 170, 40); x.clip(); x.fillStyle = '#fff'; x.fillRect(W / 2 - 85, 70, 170, 170); const k = Math.min(170 / logo.width, 170 / logo.height); x.drawImage(logo, W / 2 - logo.width * k / 2, 155 - logo.height * k / 2, logo.width * k, logo.height * k); x.restore(); }
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = `800 64px ${F0}`; x.fillText(st.negocio, W / 2, 320, W - 120);
  x.fillStyle = '#ff8a4c'; x.font = `700 36px ${F0}`; x.fillText('LISTA DE PRECIOS', W / 2, 375);
  let y = 430;
  const fila = (color, sig, nombre, sub, precio, alto) => {
    x.fillStyle = 'rgba(255,255,255,.06)'; rrect(x, 70, y, W - 140, alto, 28); x.fill();
    x.fillStyle = color; rrect(x, 100, y + alto / 2 - 36, 72, 72, 20); x.fill();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `800 28px ${F0}`; x.fillText(sig, 136, y + alto / 2 + 10);
    x.textAlign = 'left'; x.font = `700 38px ${F0}`; x.fillText(nombre, 200, y + (sub ? alto / 2 - 4 : alto / 2 + 13), 520);
    if (sub) { x.fillStyle = 'rgba(255,255,255,.6)'; x.font = `500 26px ${F0}`; x.fillText(sub, 200, y + alto / 2 + 34, 520); }
    x.textAlign = 'right'; x.fillStyle = '#ff8a4c'; x.font = `800 44px ${F0}`; x.fillText(precio, W - 100, y + alto / 2 + 15);
    y += alto + 18;
  };
  for (const s of vis) {
    const stock = stockServicio(s.id);
    fila(s.color, sigla(s.nombre), s.nombre, st.catStock && S.cuentas.length ? (stock > 0 ? `${stock} disponible${stock === 1 ? '' : 's'}` : 'Agotado') : '', money(s.precio), 110);
  }
  if (S.combos.length) {
    y += 20; x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = `800 44px ${F0}`; x.fillText('COMBOS', W / 2, y + 40); y += 80;
    for (const c of S.combos) {
      const normal = c.servicioIds.reduce((a, id) => a + (svc(id)?.precio || 0), 0);
      const nombres = c.servicioIds.map(id => svc(id)?.nombre).filter(Boolean).join(' + ');
      fila(svc(c.servicioIds[0])?.color || '#ff6a2b', String(c.servicioIds.length), c.nombre, nombres + (normal > c.precio ? ` · ahorras ${money(normal - c.precio)}` : ''), money(c.precio), 132);
    }
  }
  x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.85)'; x.font = `600 32px ${F0}`;
  x.fillText(`Entrega inmediata · Precios por ${st.duracion} días`, W / 2, H - 120);
  if (st.whatsapp) { x.fillStyle = '#25d366'; x.font = `800 38px ${F0}`; x.fillText(`WhatsApp ${st.whatsapp}`, W / 2, H - 65); }
  cv.toBlob(async blob => {
    if (!blob) { toast('No se pudo crear la imagen', 'bad'); return; }
    const nombre = `precios-${st.negocio.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    const file = new File([blob], nombre, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: st.negocio }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    descargar(nombre, blob, 'image/png'); toast('Imagen descargada ✅');
  }, 'image/png');
}

/* =====================================================================
   SINCRONIZACIÓN ENTRE DISPOSITIVOS (Netlify Functions + Netlify Blobs)
   ===================================================================== */
const SKEY = 'cuentaspro_sync', BKEY = 'cuentaspro_base';
let SY = (() => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } })();
let SY_EST = SY.clave ? 'sync' : 'off', SY_ERR = '', SY_T = null, SY_BUSY = false, SY_AGAIN = false, SY_GEN = 0, SY_PEND = null;
const syncOn = () => !!SY.clave;
function sySave() { try { localStorage.setItem(SKEY, JSON.stringify(SY)); } catch (e) { /* nada */ } }
function guardarBase() { try { localStorage.setItem(BKEY, JSON.stringify(S)); } catch (e) { /* nada */ } }
function leerBase() { try { return JSON.parse(localStorage.getItem(BKEY)) || {}; } catch (e) { return {}; } }
function forzarSubida() { if (syncOn()) { SY.forzar = true; sySave(); } }
function syncMarcar() {
  if (!syncOn()) return;
  SY.dirty = true; SY_GEN++; sySave();
  clearTimeout(SY_T); SY_T = setTimeout(syncAhora, 1200);
  setEst('sync');
}
const EST_SYNC = { off: ['cloudOff', 'Sincronización apagada', ''], ok: ['cloud', 'Sincronizado', 'ok'], sync: ['cloud', 'Sincronizando…', 'sync'], error: ['cloudOff', 'Error al sincronizar', 'bad'], offline: ['cloudOff', 'Sin internet: se sincroniza al volver la conexión', 'mut'] };
function setEst(e) { SY_EST = e; renderSyncIcon(); }
function textoSync() {
  if (SY_EST === 'error') return 'Error: ' + SY_ERR;
  if (SY_EST === 'ok' && SY.ultimo) { const m = Math.round((Date.now() - SY.ultimo) / 60000); return 'Sincronizado ' + (m < 1 ? 'hace un momento' : `hace ${m} min`); }
  return EST_SYNC[SY_EST][1];
}
function renderSyncIcon() {
  const b = $('#syncBtn');
  if (b) { b.hidden = !syncOn(); const [ic, , cls] = EST_SYNC[SY_EST]; b.className = 'ib sync-ib ' + cls; b.innerHTML = icon(ic); b.title = textoSync(); }
  const t = $('#syncStatus'); if (t) { t.textContent = textoSync(); t.className = 'chip ' + (EST_SYNC[SY_EST][2] || ''); }
}
async function api(method, body, qs = '') {
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch('/api/sync' + qs, { method, cache: 'no-store', signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + SY.clave, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    return { status: r.status, j };
  } finally { clearTimeout(to); }
}
function chk(r) {
  if (r.status === 401) throw new Error('la clave no coincide con SYNC_KEY de Netlify');
  if (r.status === 404) throw new Error('este sitio no tiene la función de sincronización (publícalo desde GitHub)');
  if (r.status >= 400) throw new Error((r.j && r.j.error) || 'error ' + r.status);
}
// Mezcla de tres vías: lo que cambió en este dispositivo gana; lo demás viene de la nube
function fusionar(b, l, r) {
  b = b || {};
  const out = { ...r };
  const tomb = { ...(r.borrados || {}), ...(l.borrados || {}) };
  const limite = Date.now() - 90 * 864e5;
  for (const k in tomb) if (tomb[k] < limite) delete tomb[k];
  out.borrados = tomb;
  for (const k of COLS) {
    const bm = new Map((b[k] || []).map(x => [x.id, JSON.stringify(x)]));
    const lm = new Map((l[k] || []).map(x => [x.id, x]));
    const rm = new Map((r[k] || []).map(x => [x.id, x]));
    const res = [];
    for (const id of new Set([...rm.keys(), ...lm.keys()])) {
      if (tomb[id]) continue;
      const lx = lm.get(id), rx = rm.get(id);
      if (lx && rx) res.push(JSON.stringify(lx) === bm.get(id) ? rx : lx);
      else if (lx) { if (!bm.has(id)) res.push(lx); }
      else if (!bm.has(id)) res.push(rx);
    }
    out[k] = res;
  }
  const bs = b.settings || {}, ls = l.settings || {}, rs = r.settings || {}, st = { ...rs };
  for (const key of new Set([...Object.keys(ls), ...Object.keys(rs)])) if (JSON.stringify(ls[key]) !== JSON.stringify(bs[key])) st[key] = ls[key];
  out.settings = st;
  return out;
}
function refrescarTrasSync() {
  // No redibuja Ajustes mientras escribes en un formulario
  const ae = document.activeElement;
  if (ae && ae.closest && ae.closest('#view form')) { renderChrome(); return; }
  render(); refreshModal();
}
function aplicarRemoto(remote) {
  const tema = S.settings.tema;
  S = normalizar(remote.data || {}); S.settings.tema = tema;
  guardarLocal(); guardarBase();
  SY.rev = remote.rev || 0; SY.dirty = false; SY.forzar = false; SY.ultimo = Date.now(); sySave();
  setEst('ok'); refrescarTrasSync();
}
async function syncAhora() {
  if (!syncOn()) return;
  if (SY_BUSY) { SY_AGAIN = true; return; }
  if (!navigator.onLine) { setEst('offline'); return; }
  SY_BUSY = true; setEst('sync');
  try {
    const g = await api('GET', null, '?solo=rev'); chk(g);
    let rev = (g.j && g.j.rev) || 0;
    if (SY.forzar) {
      const gen = SY_GEN;
      const p = await api('PUT', { force: true, data: S }); chk(p);
      SY.rev = p.j.rev; SY.forzar = false; SY.dirty = gen !== SY_GEN; guardarBase();
    } else {
      if (rev > (SY.rev || 0)) {
        const f = await api('GET'); chk(f);
        const remote = f.j || {}; rev = remote.rev || rev;
        if (!SY.dirty) { aplicarRemoto(remote); return; }
        const tema = S.settings.tema;
        S = normalizar(fusionar(leerBase(), S, remote.data || {})); S.settings.tema = tema;
        guardarLocal(); refrescarTrasSync();
      }
      if (SY.dirty) {
        const gen = SY_GEN;
        const p = await api('PUT', { baseRev: rev, data: S });
        if (p.status === 409) SY_AGAIN = true;
        else { chk(p); SY.rev = p.j.rev; SY.dirty = gen !== SY_GEN; guardarBase(); }
      } else SY.rev = rev;
    }
    SY.ultimo = Date.now(); sySave(); setEst(SY.dirty ? 'sync' : 'ok');
    if (SY.dirty) SY_AGAIN = true;
  } catch (e) {
    SY_ERR = e.name === 'AbortError' ? 'el servidor tardó demasiado' : (e.message || 'error');
    setEst(navigator.onLine ? 'error' : 'offline');
  } finally {
    SY_BUSY = false;
    if (SY_AGAIN) { SY_AGAIN = false; setTimeout(syncAhora, 800); }
  }
}
async function conectarSync(clave) {
  if (clave.length < 8) { toast('La clave debe tener al menos 8 caracteres', 'bad'); return; }
  SY = { clave, rev: 0 }; setEst('sync');
  let g;
  try { g = await api('GET'); } catch (e) { g = { status: 0 }; }
  if (g.status !== 200) {
    SY = {}; sySave(); setEst('off');
    toast(g.status === 401 ? 'Clave incorrecta: debe ser igual a SYNC_KEY en Netlify' : g.status === 404 ? 'Este sitio no tiene la función de sincronización. Publícalo desde GitHub (mira el README).' : g.status === 503 ? 'Falta crear la variable SYNC_KEY en Netlify' : 'No pude conectar con el servidor', 'bad');
    return;
  }
  sySave();
  const remote = g.j || {};
  const hayRemoto = remote.rev > 0 && remote.data;
  const hayLocal = S.subs.length || S.cuentas.length || S.clientes.length;
  if (hayRemoto && hayLocal) { SY_PEND = remote; modalElegirSync(remote); }
  else if (hayRemoto) { aplicarRemoto(remote); toast('Conectado: datos descargados de la nube ✅'); }
  else { forzarSubida(); SY.dirty = true; sySave(); await syncAhora(); render(); toast('Sincronización activada ✅'); }
}
function modalElegirSync(remote) {
  const d = remote.data || {};
  openModal(`${mHead('¿Qué datos quieres usar?')}
    <div class="m-b"><p>La nube ya tiene datos (${(d.cuentas || []).length} cuentas, ${(d.clientes || []).length} clientes, ${(d.subs || []).length} ventas) y este dispositivo también (${S.cuentas.length} cuentas, ${S.clientes.length} clientes, ${S.subs.length} ventas).</p>
    <p class="hint" style="margin-top:10px">Si este es un dispositivo nuevo, elige <b>Usar los de la nube</b>.</p></div>
    <div class="m-f"><button class="btn" data-a="syncSubirLocal">Subir los de aquí (reemplaza la nube)</button><button class="btn pri" data-a="syncUsarNube">Usar los de la nube</button></div>`, { size: 'small' });
}
function htmlSync() {
  if (!syncOn()) return `<section class="card set-sec"><h3>Usar en varios dispositivos</h3>
    <p>Conecta tu celular, PC, portátil y tablet para ver y editar los mismos datos en todos. Primero crea la variable <code>SYNC_KEY</code> en Netlify (los pasos están en el README) y escribe aquí esa misma clave en cada dispositivo.</p>
    <form data-form="sync" autocomplete="off" class="row-btns" style="align-items:flex-end">
      <label class="fld" style="flex:1;min-width:200px;margin:0"><span>Clave de sincronización</span><input type="password" name="clave" minlength="8" required placeholder="La misma SYNC_KEY de Netlify"></label>
      <button class="btn pri" type="submit">${icon('cloud')}Conectar</button>
    </form></section>`;
  return `<section class="card set-sec"><h3>Usar en varios dispositivos</h3>
    <p>Este dispositivo está conectado. Los cambios se guardan en la nube y aparecen en tus otros dispositivos en segundos (o cuando vuelvas a abrir la app).</p>
    <div class="row-btns" style="align-items:center"><span id="syncStatus" class="chip ${EST_SYNC[SY_EST][2]}">${esc(textoSync())}</span>
    <button class="btn sm" data-a="syncAhora">${icon('renew')}Sincronizar ahora</button><button class="btn sm ghost" data-a="syncSalir">Desconectar</button></div></section>`;
}

/* =====================================================================
   ACCIONES
   ===================================================================== */
function changed(msg) { save(); render(); refreshModal(); if (msg) toast(msg); }
function done(msg) { save(); closeModal(); render(); if (msg) toast(msg); }
// Gasto automático para servicios vendidos sin cuenta madre que tienen "costo por venta"
function anotarCosto(subs, etiqueta) {
  const sin = subs.filter(s => !s.cuentaId && Number(svc(s.servicioId)?.costo) > 0);
  if (!sin.length) return;
  const monto = sin.reduce((a, s) => a + Number(svc(s.servicioId).costo), 0);
  S.gastos.push({ id: uid(), concepto: `${etiqueta} · ${sin.map(s => svc(s.servicioId).nombre).join(' + ')} · ${cliente(sin[0].clienteId)?.nombre || ''}`, monto, fecha: hoy(), categoria: 'Cuentas' });
}
function marcarPagado(subs, concepto = 'Pago') {
  const pend = subs.filter(s => !s.pagado);
  if (!pend.length) return;
  pend.forEach(s => { s.pagado = true; });
  S.pagos.push({ id: uid(), clienteId: pend[0].clienteId, subIds: pend.map(s => s.id), monto: sum(pend, 'precio'), fecha: hoy(), metodo: METODOS[1], concepto });
}
function reactivarSub(id) {
  const s = subById(id); if (!s) return;
  if (s.cuentaId) {
    const c = cuenta(s.cuentaId);
    const need = s.completa ? (c?.perfilesMax || 1) : 1;
    if (!c || libres(s.cuentaId) < need) { toast('Esa cuenta ya no tiene perfiles libres. Edita la venta y asigna otra cuenta.', 'warn'); modalSub(id); return; }
  }
  modalRenovar([id]);
}

const A = {
  noop: () => {},
  go: id => { closeModal(true); go(id); },
  filtro: id => { F.vEst = id; closeModal(true); go('ventas'); },
  vTab: id => { F.vEst = id; render(); },
  aTab: id => { F.aTab = id; if (VIEW !== 'cuentas') go('cuentas'); else render(); },
  aSvc: id => { F.aSvc = id; render(); },
  mes: n => { F.mes = addMonthYM(F.mes, Number(n)); render(); },
  tema: () => { S.settings.tema = S.settings.tema === 'light' ? 'dark' : 'light'; save(); render(); },
  buscar: () => modalBuscar(),
  alertas: () => { closeModal(true); go('panel'); },
  cerrar: () => closeModal(),
  confSi: () => { const f = CONF; closeConfirm(); if (f) f(); },
  confNo: () => closeConfirm(),

  nueva: () => modalVenta(),
  combo: () => { if (S.combos.length) modalVenta({ modo: 'combo' }); else { toast('Primero crea tu primer combo', 'warn'); modalCombo(); } },
  venderEn: id => modalVenta({ cuentaId: id }),
  nuevaVentaCli: id => modalVenta({ clienteId: id }),
  addItem: () => { const last = DRAFT.items[DRAFT.items.length - 1]; DRAFT.items.push(nuevoItem(last?.servicioId || S.servicios[0].id)); rerenderItems(); updateTotal(); },
  delItem: i => { DRAFT.items.splice(Number(i), 1); rerenderItems(); updateTotal(); },

  verCliente: id => modalVerCliente(id),
  nuevoCliente: () => modalCliente(),
  editCliente: id => modalCliente(id),
  delCliente: id => {
    const n = S.subs.filter(s => s.clienteId === id).length;
    confirmar(`¿Eliminar a <b>${esc(cliente(id)?.nombre)}</b>?${n ? ` También se eliminarán sus ${n} ventas y se liberarán sus perfiles. Los pagos se conservan en reportes.` : ''}`, () => {
      borrar('clientes', c => c.id === id); borrar('subs', s => s.clienteId === id);
      MODAL = null; done('Cliente eliminado');
    }, { txt: 'Eliminar' });
  },
  waChat: id => abrirWA(id, ''),
  waCobro: id => {
    const g = gruposCobro().find(x => x.cid === id);
    if (!g) { toast('Este cliente no tiene cobros pendientes'); return; }
    abrirWA(id, mensaje(tipoRecordatorio(g.subs), g.subs));
    g.subs.forEach(s => { s.recordado = hoy(); }); changed();
  },
  masivo: () => modalMasivo(),
  masivoWA: (id, el) => {
    const g = gruposCobro().find(x => x.cid === id); if (!g) return;
    abrirWA(id, mensaje(tipoRecordatorio(g.subs), g.subs));
    g.subs.forEach(s => { s.recordado = hoy(); }); save(); render();
    const row = $('#mas_' + id); if (row) row.classList.add('done');
    if (el) { el.classList.remove('pri'); el.innerHTML = icon('wa') + 'Reenviar'; }
  },
  renovarCli: id => { const g = gruposCobro().find(x => x.cid === id); const subs = g ? g.subs : S.subs.filter(s => s.activa && s.clienteId === id); if (subs.length) modalRenovar(subs.map(s => s.id)); },
  waEntregaCli: id => { const subs = S.subs.filter(s => s.activa && s.clienteId === id); if (subs.length) abrirWA(id, mensaje('entrega', subs)); },

  waSub: id => {
    const s = subById(id); if (!s) return;
    const e = estadoSub(s);
    const tipo = (!s.pagado || e === 'vencida' || e === 'hoy') ? 'cobro' : e === 'porvencer' ? 'porVencer' : 'entrega';
    abrirWA(s.clienteId, mensaje(tipo, [s]));
    if (tipo !== 'entrega') { s.recordado = hoy(); changed(); }
  },
  waEntrega: id => { const s = subById(id); if (s) abrirWA(s.clienteId, mensaje('entrega', [s])); },
  waRecordar: id => { const s = subById(id); if (!s) return; abrirWA(s.clienteId, mensaje(tipoRecordatorio([s]), [s])); s.recordado = hoy(); save(); },
  copiarAcceso: id => { const s = subById(id); if (s) copiar(lineaLarga(s).replace(/\*/g, ''), 'Datos copiados'); },
  renovar: id => modalRenovar([id]),
  pagar: id => { const s = subById(id); if (!s) return; marcarPagado([s]); changed(`Pago de ${money(s.precio)} registrado`); },
  menuSub: id => modalMenuSub(id),
  editSub: id => modalSub(id),
  liberar: id => confirmar('¿Liberar este perfil? Quedará disponible para vender a otra persona y la venta pasará al historial.', () => {
    const s = subById(id); if (s) { s.activa = false; s.liberada = hoy(); } closeModal(); changed('Perfil liberado');
  }, { txt: 'Liberar' }),
  reactivar: id => reactivarSub(id),
  delSub: id => confirmar('¿Eliminar esta venta definitivamente? Los pagos registrados se conservan.', () => {
    borrar('subs', s => s.id === id); closeModal(); changed('Venta eliminada');
  }, { txt: 'Eliminar' }),
  liberarTodos: () => {
    const l = paraLiberar();
    confirmar(`¿Liberar ${l.length} perfil${l.length > 1 ? 'es' : ''} vencidos hace más de ${S.settings.diasGracia} días?`, () => {
      l.forEach(s => { s.activa = false; s.liberada = hoy(); }); changed(`${l.length} perfiles liberados`);
    }, { txt: 'Liberar', danger: false });
  },

  nuevaCuenta: () => modalCuenta(),
  importCuentas: () => modalImportCuentas(),
  editCuenta: id => modalCuenta(id),
  renovarCuenta: id => modalRenovarCuenta(id),
  delCuenta: id => {
    const n = subsDeCuenta(id).length;
    confirmar(`¿Eliminar la cuenta <b>${esc(cuenta(id)?.correo)}</b>?${n ? ` Tiene ${n} venta${n > 1 ? 's' : ''} activa${n > 1 ? 's' : ''}: quedarán sin cuenta asignada.` : ''}`, () => {
      borrar('cuentas', c => c.id === id);
      S.subs.forEach(s => { if (s.cuentaId === id) s.cuentaId = ''; });
      done('Cuenta eliminada');
    }, { txt: 'Eliminar' });
  },
  copiar: (_, el) => copiar(el.dataset.v),
  verClave: (_, el) => {
    const code = el.parentElement.querySelector('.secret'); if (!code) return;
    const visible = code.dataset.on === '1';
    code.textContent = visible ? '••••••••' : code.dataset.secret; code.dataset.on = visible ? '0' : '1';
  },

  copiarCatalogo: () => copiar(textoCatalogo(), 'Catálogo copiado'),
  waCatalogo: () => window.open('https://wa.me/?text=' + encodeURIComponent(textoCatalogo()), '_blank', 'noopener'),
  shareCatalogo: async () => {
    if (navigator.share) { try { await navigator.share({ title: S.settings.negocio, text: textoCatalogo() }); } catch (e) { /* cancelado */ } }
    else copiar(textoCatalogo(), 'Catálogo copiado');
  },

  nuevoGasto: () => modalGasto(),
  delGasto: id => confirmar('¿Eliminar este gasto?', () => { borrar('gastos', g => g.id === id); changed('Gasto eliminado'); }, { txt: 'Eliminar' }),
  delPago: id => confirmar('¿Eliminar este pago? Las ventas asociadas volverán a quedar “sin pagar”.', () => {
    const p = S.pagos.find(x => x.id === id);
    if (p) (p.subIds || []).forEach(sid => { const s = subById(sid); if (s) s.pagado = false; });
    borrar('pagos', x => x.id === id); changed('Pago eliminado');
  }, { txt: 'Eliminar' }),
  exportCSV: tipo => exportarCSV(tipo),

  nuevoServicio: () => modalServicio(),
  editServicio: id => modalServicio(id),
  delServicio: id => {
    if (S.cuentas.some(c => c.servicioId === id) || S.subs.some(s => s.servicioId === id)) { toast('No puedes eliminarlo: tiene cuentas o ventas. Desmárcalo de la tienda si ya no lo vendes.', 'warn'); return; }
    confirmar('¿Eliminar este servicio?', () => {
      borrar('servicios', s => s.id === id);
      S.combos.forEach(c => { c.servicioIds = c.servicioIds.filter(x => x !== id); });
      borrar('combos', c => c.servicioIds.length < 2);
      done('Servicio eliminado');
    }, { txt: 'Eliminar' });
  },
  nuevoCombo: () => modalCombo(),
  editCombo: id => modalCombo(id),
  delCombo: id => confirmar('¿Eliminar este combo? Las ventas ya hechas no cambian.', () => { borrar('combos', c => c.id === id); done('Combo eliminado'); }, { txt: 'Eliminar' }),
  plantillasDef: () => confirmar('¿Restaurar los mensajes originales?', () => { S.settings.plantillas = { ...DEF_PLANTILLAS }; changed('Mensajes restaurados'); }, { txt: 'Restaurar', danger: false }),

  pin: () => modalPin(),
  quitarPin: () => confirmar('¿Quitar el PIN de acceso?', () => { S.settings.pinHash = ''; changed('PIN desactivado'); }, { txt: 'Quitar' }),
  bloquear: () => mostrarBloqueo(),
  repartir: id => modalRepartir(id),
  envioWA: (id, el) => {
    const s = subById(id); if (!s) return;
    abrirWA(s.clienteId, mensaje('entrega', [s]));
    const row = document.getElementById('env_' + id); if (row) row.classList.add('done');
    if (el) { el.classList.remove('pri'); el.innerHTML = icon('wa') + 'Reenviar'; }
  },
  copiarEnlace: id => { const s = subById(id); if (s) copiar(enlaceAcceso([s]), 'Enlace copiado'); },
  copiarMsg: id => { const s = subById(id); if (s) copiar(mensaje('entrega', [s]), 'Mensaje copiado'); },
  subirLogo: () => $('#logoFile').click(),
  quitarLogo: () => { S.settings.logo = ''; S.settings.logoIcono = ''; changed('Logo quitado'); },
  imgCatalogo: () => imagenCatalogo(),
  mrnImportar: () => {
    const d = MRN_PEND; if (!d) return;
    const rep = !!($('#mrnReemplazar') && $('#mrnReemplazar').checked);
    MRN_PEND = null; closeModal(true);
    let r;
    try { r = importarMrn(d, rep); } catch (e) { console.error(e); toast('No se pudo importar: ' + e.message, 'bad'); return; }
    save(); go('panel');
    openModal(`${mHead('¡Datos de MrNetflix importados! ✅')}
      <div class="m-b"><div class="list">
        <div class="row tight">${icon('clientes')}<div class="grow"><b>${r.clientes} clientes nuevos</b><small>${r.actualizados ? r.actualizados + ' ya existían y se actualizaron' : 'con teléfono, estrellas y notas'}</small></div></div>
        <div class="row tight">${icon('ventas')}<div class="grow"><b>${r.ventas} servicios activos</b><small>con su fecha de vencimiento</small></div></div>
        <div class="row tight">${icon('tienda')}<div class="grow"><b>${r.servicios} servicios nuevos</b><small>con precio y costo de MrNetflix</small></div></div>
        <div class="row tight">${icon('reportes')}<div class="grow"><b>${r.pagos} pagos y ${r.gastos} gastos</b><small>tu historial de ventas en Reportes</small></div></div>
      </div>
      <p class="hint" style="margin-top:12px">Siguiente paso: en <b>Cuentas</b> agrega tus cuentas madre (Netflix, Disney…) y en <b>Ajustes → Servicios</b> revisa cuántos perfiles tiene cada una. Si sigues usando MrNetflix unos días, puedes volver a importar el archivo: no se duplica nada.</p></div>
      <div class="m-f"><button class="btn pri" data-a="cerrar">Listo</button></div>`, { size: 'small' });
  },
  syncAhora: () => { if (syncOn()) { syncAhora(); toast('Sincronizando…'); } else go('ajustes'); },
  syncSalir: () => confirmar('¿Desconectar este dispositivo de la sincronización? Tus datos se quedan aquí, pero ya no se compartirán.', () => {
    SY = {}; sySave(); try { localStorage.removeItem(BKEY); } catch (e) { /* nada */ } setEst('off'); render(); toast('Sincronización desactivada');
  }, { txt: 'Desconectar' }),
  syncUsarNube: () => { const r = SY_PEND; SY_PEND = null; closeModal(true); if (r) { aplicarRemoto(r); toast('Listo: este dispositivo ya tiene los datos de la nube ✅'); } },
  syncSubirLocal: () => { SY_PEND = null; closeModal(true); forzarSubida(); SY.dirty = true; sySave(); syncAhora(); render(); toast('Subiendo los datos de este dispositivo…'); },
  exportar: () => exportar(),
  importar: () => $('#fileImport').click(),
  demo: () => {
    const hay = S.subs.length || S.cuentas.length || S.clientes.length;
    const run = () => { cargarDemo(); forzarSubida(); changed('Datos de ejemplo cargados'); go('panel'); };
    if (hay) confirmar('Esto <b>reemplaza</b> tus cuentas, clientes, ventas, pagos y gastos actuales por datos de ejemplo. ¿Continuar?', run, { txt: 'Reemplazar' }); else run();
  },
  borrarTodo: () => confirmar('¿Borrar <b>todos</b> los datos de este navegador? Descarga un respaldo antes si lo necesitas. No se puede deshacer.', () => {
    const st = S.settings; S = defaultState(); S.settings = { ...S.settings, negocio: st.negocio, usuario: st.usuario, simbolo: st.simbolo, decimales: st.decimales, pais: st.pais, tema: st.tema, logo: st.logo, whatsapp: st.whatsapp };
    forzarSubida(); changed('Datos borrados'); go('panel');
  }, { txt: 'Borrar todo' }),
};

/* ---------- Formularios ---------- */
const num = v => Number(v) || 0;
const FORMS = {
  venta: (fd, f, modo) => guardarVenta(modo === 'entregar'),
  renovar: (fd, f, modo) => {
    const subs = f.dataset.ids.split(',').map(subById).filter(Boolean);
    const dur = num(fd.get('dur')), desde = fd.get('desde'), pagado = fd.get('pagado') === 'on';
    for (const s of subs) {
      if (!s.activa && s.cuentaId) {
        const c = cuenta(s.cuentaId);
        if (!c || libres(s.cuentaId) < (s.completa ? c.perfilesMax : 1)) { toast(`La cuenta de ${svc(s.servicioId)?.nombre} ya no tiene perfiles libres`, 'bad'); return; }
      }
    }
    for (const s of subs) {
      s.precio = num(fd.get('p_' + s.id));
      let base;
      if (desde === 'hoy' || !s.activa) base = hoy();
      else if (desde === 'vence') base = s.vence;
      else base = diffDays(hoy(), s.vence) > S.settings.diasGracia ? hoy() : s.vence;
      s.vence = addDays(base, dur);
      s.activa = true; s.pagado = pagado; s.renovaciones = (s.renovaciones || 0) + 1; s.recordado = ''; delete s.liberada;
    }
    if (pagado) S.pagos.push({ id: uid(), clienteId: subs[0].clienteId, subIds: subs.map(s => s.id), monto: sum(subs, 'precio'), fecha: hoy(), metodo: fd.get('metodo'), concepto: 'Renovación' });
    anotarCosto(subs, 'Costo renovación');
    done(`Renovado hasta ${fecha(subs[0].vence)} ✅`);
    if (modo === 'avisar') abrirWA(subs[0].clienteId, mensaje('renovacion', subs));
  },
  sub: (fd, f) => {
    const s = subById(f.dataset.id); if (!s) return;
    const n = {
      clienteId: fd.get('clienteId'), servicioId: fd.get('servicioId'), cuentaId: fd.get('cuentaId') || '',
      perfil: String(fd.get('perfil') || '').trim(), pin: String(fd.get('pin') || '').trim(), precio: num(fd.get('precio')),
      completa: fd.get('completa') === 'on', inicio: fd.get('inicio') || s.inicio, vence: fd.get('vence') || s.vence,
      pagado: fd.get('pagado') === 'on', notas: String(fd.get('notas') || '').trim(), acceso: String(fd.get('acceso') || '').trim(),
    };
    if (n.cuentaId) {
      const c = cuenta(n.cuentaId);
      if (c.servicioId !== n.servicioId) { toast('Esa cuenta madre es de otro servicio', 'bad'); return; }
      if (s.activa && (n.completa ? c.perfilesMax : 1) > libres(n.cuentaId, new Set([s.id]))) { toast('Esa cuenta no tiene perfiles libres suficientes', 'bad'); return; }
    }
    if (n.pagado && !s.pagado) S.pagos.push({ id: uid(), clienteId: n.clienteId, subIds: [s.id], monto: n.precio, fecha: hoy(), metodo: METODOS[1], concepto: 'Pago' });
    Object.assign(s, n);
    done('Venta actualizada');
  },
  cliente: (fd, f) => {
    const id = f.dataset.id;
    const data = { nombre: String(fd.get('nombre') || '').trim(), telefono: String(fd.get('telefono') || '').trim(), notas: String(fd.get('notas') || '').trim(), estrellas: num(fd.get('estrellas')) };
    if (!data.nombre) { toast('Escribe el nombre', 'bad'); return; }
    if (id) Object.assign(cliente(id), data); else S.clientes.push({ id: uid(), creado: hoy(), ...data });
    done(id ? 'Cliente actualizado' : 'Cliente creado');
  },
  cuenta: (fd, f, modo) => {
    const id = f.dataset.id;
    const correo = String(fd.get('correo') || '').trim();
    if (!correo) { toast('Escribe el correo', 'bad'); return; }
    const data = {
      servicioId: fd.get('servicioId'), correo, clave: String(fd.get('clave') || ''), perfilesMax: Math.max(1, num(fd.get('perfilesMax'))),
      proveedor: String(fd.get('proveedor') || '').trim(), costo: num(fd.get('costo')), vence: fd.get('vence') || '', notas: String(fd.get('notas') || '').trim(),
      perfilesDef: parsePerfiles(fd.get('perfilesDef')),
    };
    if (data.perfilesDef.length > data.perfilesMax) data.perfilesMax = data.perfilesDef.length;
    let nuevoId = id;
    if (id) {
      const u = usados(id);
      if (data.perfilesMax < u) { toast(`Esta cuenta ya tiene ${u} perfiles vendidos`, 'bad'); return; }
      Object.assign(cuenta(id), data, { activa: fd.get('activa') === 'on' });
    } else {
      if (S.cuentas.some(c => c.servicioId === data.servicioId && c.correo.toLowerCase() === correo.toLowerCase())) { toast('Esa cuenta ya existe', 'bad'); return; }
      nuevoId = uid();
      S.cuentas.push({ id: nuevoId, creado: hoy(), activa: true, ...data });
      if (data.costo && fd.get('gasto') === 'on') S.gastos.push({ id: uid(), concepto: `Cuenta ${svc(data.servicioId)?.nombre || ''} · ${correo}`, monto: data.costo, fecha: hoy(), categoria: 'Cuentas' });
    }
    done(id ? 'Cuenta actualizada' : 'Cuenta madre agregada ✅');
    if (modo === 'repartir') { if (libres(nuevoId) > 0) modalRepartir(nuevoId); else toast('Esta cuenta no tiene perfiles libres', 'warn'); }
  },
  importCuentas: fd => {
    const sid = fd.get('servicioId'), per = Math.max(1, num(fd.get('perfilesMax'))), costo = num(fd.get('costo'));
    const lines = String(fd.get('lista') || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let n = 0, malas = 0;
    for (const l of lines) {
      const m = l.match(/^([^\s|;:,\t]+@[^\s|;:,\t]+)\s*(?:[|;:,\t]\s*(.*))?$/);
      if (!m || S.cuentas.some(c => c.servicioId === sid && c.correo.toLowerCase() === m[1].toLowerCase())) { malas++; continue; }
      S.cuentas.push({ id: uid(), servicioId: sid, correo: m[1], clave: (m[2] || '').trim(), perfilesMax: per, proveedor: String(fd.get('proveedor') || '').trim(), costo, vence: fd.get('vence') || '', notas: '', activa: true, creado: hoy() });
      n++;
    }
    if (!n) { toast('No encontré líneas válidas (formato correo:clave)', 'bad'); return; }
    if (costo && fd.get('gasto') === 'on') S.gastos.push({ id: uid(), concepto: `Compra de ${n} cuenta${n > 1 ? 's' : ''} ${svc(sid)?.nombre || ''}`, monto: costo * n, fecha: hoy(), categoria: 'Cuentas' });
    done(`${n} cuenta${n > 1 ? 's' : ''} importada${n > 1 ? 's' : ''}${malas ? ` · ${malas} omitida${malas > 1 ? 's' : ''}` : ''} ✅`);
  },
  renovarCuenta: (fd, f) => {
    const c = cuenta(f.dataset.id); if (!c) return;
    const base = fd.get('desde') === 'hoy' || !c.vence ? hoy() : c.vence;
    c.vence = addDays(base, num(fd.get('dur')));
    c.costo = num(fd.get('costo'));
    if (c.costo && fd.get('gasto') === 'on') S.gastos.push({ id: uid(), concepto: `Renovación ${svc(c.servicioId)?.nombre || ''} · ${c.correo}`, monto: c.costo, fecha: hoy(), categoria: 'Cuentas' });
    done(`Cuenta renovada hasta ${fecha(c.vence)} ✅`);
  },
  gasto: fd => {
    const monto = num(fd.get('monto'));
    if (!monto) { toast('Escribe el monto', 'bad'); return; }
    S.gastos.push({ id: uid(), concepto: String(fd.get('concepto') || '').trim(), monto, fecha: fd.get('fecha') || hoy(), categoria: fd.get('categoria') });
    done('Gasto registrado');
  },
  servicio: (fd, f) => {
    const id = f.dataset.id;
    const data = { nombre: String(fd.get('nombre') || '').trim(), color: fd.get('color') || '#ff6a2b', perfiles: Math.max(1, num(fd.get('perfiles'))), precio: num(fd.get('precio')), costo: num(fd.get('costo')), catalogo: fd.get('catalogo') === 'on' };
    if (!data.nombre) { toast('Escribe el nombre', 'bad'); return; }
    if (id) Object.assign(svc(id), data); else S.servicios.push({ id: uid(), ...data });
    done(id ? 'Servicio actualizado' : 'Servicio agregado');
  },
  combo: (fd, f) => {
    const id = f.dataset.id, ids = fd.getAll('s');
    const data = { nombre: String(fd.get('nombre') || '').trim(), precio: num(fd.get('precio')), servicioIds: ids };
    if (!data.nombre) { toast('Escribe el nombre del combo', 'bad'); return; }
    if (ids.length < 2) { toast('Elige al menos 2 apps', 'bad'); return; }
    if (id) Object.assign(S.combos.find(c => c.id === id), data); else S.combos.push({ id: uid(), ...data });
    done(id ? 'Combo actualizado' : 'Combo creado ✅');
  },
  ajustes: fd => {
    const st = S.settings;
    st.negocio = String(fd.get('negocio') || '').trim() || 'Mi Negocio';
    st.usuario = String(fd.get('usuario') || '').trim();
    st.whatsapp = String(fd.get('whatsapp') || '').trim();
    st.simbolo = String(fd.get('simbolo') || '$').trim() || '$';
    st.decimales = num(fd.get('decimales'));
    st.pais = String(fd.get('pais') || '').replace(/\D/g, '');
    st.diasAviso = Math.max(1, num(fd.get('diasAviso')));
    st.diasGracia = Math.max(0, num(fd.get('diasGracia')));
    st.duracion = Math.max(1, num(fd.get('duracion')));
    changed('Ajustes guardados ✅');
  },
  repartir: (fd, f) => {
    const cid = f.dataset.id, c = cuenta(cid), n = Number(f.dataset.n);
    if (!c) return;
    const filas = [];
    for (let i = 0; i < n; i++) {
      const cli = fd.get(`r${i}_cli`);
      if (!cli) continue;
      const r = { i, cli, nom: String(fd.get(`r${i}_nom`) || '').trim(), tel: String(fd.get(`r${i}_tel`) || '').trim(),
        perfil: String(fd.get(`r${i}_perfil`) || '').trim(), pin: String(fd.get(`r${i}_pin`) || '').trim(), precio: num(fd.get(`r${i}_precio`)) };
      if (cli === '__new' && !r.nom) { toast(`Escribe el nombre del cliente del perfil ${i + 1}`, 'bad'); return; }
      filas.push(r);
    }
    if (!filas.length) { toast('Asigna al menos un perfil a un cliente', 'bad'); return; }
    if (filas.length > libres(cid)) { toast('No hay tantos perfiles libres en esta cuenta', 'bad'); return; }
    const usados = new Set(subsDeCuenta(cid).map(s => String(s.perfil || '').toLowerCase()));
    for (const r of filas) {
      if (!r.perfil) continue;
      const k = r.perfil.toLowerCase();
      if (usados.has(k)) { toast(`El nombre "${r.perfil}" está repetido en esta cuenta`, 'bad'); return; }
      usados.add(k);
    }
    const inicio = fd.get('inicio') || hoy(), dur = num(fd.get('dur')) || S.settings.duracion, pagado = fd.get('pagado') === 'on', metodo = fd.get('metodo');
    const vence = addDays(inicio, dur), ids = [];
    for (const r of filas) {
      let clienteId = r.cli;
      if (clienteId === '__new') {
        const ex = r.tel && S.clientes.find(x => normTel(x.telefono) === normTel(r.tel));
        if (ex) clienteId = ex.id;
        else { const nc = { id: uid(), nombre: r.nom, telefono: r.tel, notas: '', creado: hoy() }; S.clientes.push(nc); clienteId = nc.id; }
      }
      const s = { id: uid(), ventaId: uid(), clienteId, servicioId: c.servicioId, cuentaId: cid, perfil: r.perfil || nextPerfil(cid), pin: r.pin,
        precio: r.precio, completa: false, inicio, vence, pagado, activa: true, notas: '', creado: new Date().toISOString(), renovaciones: 0, comboId: '' };
      S.subs.push(s); ids.push(s.id);
      if (pagado) S.pagos.push({ id: uid(), clienteId, subIds: [s.id], monto: s.precio, fecha: hoy(), metodo, concepto: 'Venta' });
    }
    done(`${ids.length} perfil${ids.length > 1 ? 'es repartidos' : ' asignado'} ✅`);
    modalEnvios(ids);
  },
  sync: fd => conectarSync(String(fd.get('clave') || '').trim()),
  plantillas: fd => { for (const k of Object.keys(DEF_PLANTILLAS)) S.settings.plantillas[k] = String(fd.get(k) || ''); changed('Mensajes guardados ✅'); },
  pin: async fd => {
    const p1 = String(fd.get('p1') || ''), p2 = String(fd.get('p2') || '');
    if (!/^\d{4,8}$/.test(p1)) { toast('El PIN debe tener de 4 a 8 números', 'bad'); return; }
    if (p1 !== p2) { toast('Los PIN no coinciden', 'bad'); return; }
    S.settings.pinHash = await hashPin(p1);
    done('PIN activado 🔒');
  },
};

/* ---------- Respaldo / CSV / Demo ---------- */
function exportar() {
  S.settings.ultimoRespaldo = hoy();
  const data = JSON.stringify({ app: 'CuentasPro', exportado: new Date().toISOString(), ...S }, null, 2);
  descargar(`respaldo-cuentaspro-${hoy()}.json`, data, 'application/json');
  changed('Respaldo descargado ✅');
}
function importar(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const txt = String(r.result || '').replace(/^\ufeff/, '').trim();
      if (/^[^{[]*,/.test(txt.split('\n')[0]) && !txt.startsWith('{')) { toast('Ese archivo es una lista CSV (solo títulos y filas), no un respaldo. En MrNetflix usa “Exportar datos”.', 'bad'); $('#fileImport').value = ''; return; }
      const d = JSON.parse(txt);
      if (esMrNetflix(d)) { $('#fileImport').value = ''; modalImportMrn(d); return; }
      if (!d || !Array.isArray(d.subs) || !Array.isArray(d.cuentas)) throw new Error('formato');
      confirmar(`Restaurar respaldo con <b>${d.cuentas.length}</b> cuentas, <b>${(d.clientes || []).length}</b> clientes y <b>${d.subs.length}</b> ventas. Esto reemplaza los datos actuales.`, () => {
        S = normalizar(d); forzarSubida(); changed('Respaldo restaurado ✅'); go('panel');
      }, { txt: 'Restaurar', danger: false });
    } catch (e) { toast('Ese archivo no es un respaldo de CuentasPro ni de MrNetflix', 'bad'); }
    $('#fileImport').value = '';
  };
  r.readAsText(file);
}
/* ---------- Importar desde MrNetflix ---------- */
const norm = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const esMrNetflix = d => !!d && Array.isArray(d.clientes) && (Array.isArray(d.productos) || Array.isArray(d.transacciones)) && !Array.isArray(d.subs);
const COLOR_KW = [['NETFLIX', '#e50914'], ['DISNEY', '#113ccf'], ['AMAZON', '#00a8e1'], ['PRIME', '#00a8e1'], ['HBO', '#7b2ff7'], ['STAR', '#c2185b'], ['SPOTIFY', '#1db954'], ['YOUTUBE', '#ff0033'], ['CRUNCHY', '#f47521'], ['PARAMOUNT', '#0064ff'], ['IPTV', '#ff6a2b'], ['OLEADA', '#0ea5e9'], ['PLEX', '#e5a00d'], ['CANVA', '#00a8b5'], ['OFFICE', '#d83b01'], ['CAPCUT', '#333333'], ['VIX', '#ff5a00'], ['APPLE', '#555555'], ['CHATGPT', '#10a37f'], ['DEZZER', '#a238ff'], ['DEEZER', '#a238ff'], ['WIN', '#00a651'], ['MEGA', '#e11d48'], ['UNIVERSAL', '#1e40af'], ['MAX', '#7b2ff7'], ['COMBO', '#ff6a2b'], ['PANTALLA', '#64748b']];
const PERF_KW = [['NETFLIX', 5], ['DISNEY', 7], ['AMAZON', 6], ['PRIME', 6], ['HBO', 5], ['MAX', 5], ['STAR', 7], ['SPOTIFY', 6], ['YOUTUBE', 6], ['CRUNCHY', 4], ['PARAMOUNT', 6], ['VIX', 5], ['UNIVERSAL', 5]];
function hslHex(h, sat, l) {
  sat /= 100; l /= 100;
  const f = n => { const k = (n + h / 30) % 12, a = sat * Math.min(l, 1 - l); const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}
const colorPara = n => { const k = norm(n); const m = COLOR_KW.find(([w]) => k.includes(w)); return m ? m[1] : hslHex(hue(n), 60, 45); };
const perfilesPara = n => { const k = norm(n); const m = PERF_KW.find(([w]) => k.includes(w)); return m ? m[1] : 1; };
function fechaLocal(v) {
  if (v == null || v === '') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v);
  const d = new Date(typeof v === 'number' ? v : String(v));
  return isNaN(d) ? '' : toISO(d);
}
let MRN_PEND = null;
function modalImportMrn(d) {
  MRN_PEND = d;
  const tx = d.transacciones || [];
  const ya = S.subs.some(s => String(s.origen || '').startsWith('mrn:'));
  const hay = S.clientes.length || S.subs.length || S.cuentas.length;
  const demo = S.cuentas.some(c => /@correo\.com$/.test(c.correo)) || S.clientes.some(c => c.nombre === 'María Torres' && c.telefono && c.telefono.length === 10);
  openModal(`${mHead('Importar desde MrNetflix')}
    <div class="m-b">
      <div class="kpis" style="grid-template-columns:repeat(2,1fr)">
        ${kpi('Clientes', d.clientes.length, 'con su vencimiento', 'acc', 'noop')}
        ${kpi('Productos', (d.productos || []).length, 'pasan a Servicios', '', 'noop')}
        ${kpi('Ventas', tx.length, 'pasan a Reportes', 'ok', 'noop')}
        ${kpi('Total vendido', money(sum(tx, 'precio')), 'ganancia ' + money(sum(tx, 'ganancia')), 'ok', 'noop')}
      </div>
      <p class="hint" style="margin:0 0 12px">Cada <b>producto</b> queda como servicio con su precio y costo. Cada <b>cliente</b> queda con su servicio, teléfono, estrellas y fecha de vencimiento (y los datos de acceso que tenía guardados). Cada <b>venta</b> queda como pago en Reportes y su costo como gasto del mes, para que la ganancia dé igual que en MrNetflix.</p>
      ${ya ? `<div class="banner">${icon('check')}<span>Ya importaste de MrNetflix antes: solo se agregan las ventas nuevas y se actualizan vencimientos y teléfonos. <b>No se duplica nada.</b></span></div>` : ''}
      ${hay ? `<label class="chk"><input type="checkbox" id="mrnReemplazar" ${demo && !ya ? 'checked' : ''}> Borrar primero lo que hay ahora en CuentasPro${demo ? ' (son datos de ejemplo)' : ''}</label>` : ''}
    </div>
    <div class="m-f"><button class="btn" data-a="cerrar">Cancelar</button><button class="btn pri" data-a="mrnImportar">${icon('upload')}Importar</button></div>`);
}
function importarMrn(d, reemplazar) {
  const r = { servicios: 0, clientes: 0, actualizados: 0, ventas: 0, pagos: 0, gastos: 0 };
  if (reemplazar) { for (const k of ['cuentas', 'clientes', 'subs', 'pagos', 'gastos', 'combos', 'servicios']) borrar(k, () => true); }
  // Productos → servicios
  const porId = new Map(), porNombre = new Map(S.servicios.map(x => [norm(x.nombre), x]));
  for (const p of d.productos || []) {
    const k = norm(p.nombre); if (!k) continue;
    let sv = S.servicios.find(x => x.origen === 'mrn:p' + p.id) || porNombre.get(k);
    const precio = num(p.cliente) || num(p.vendedor);
    if (!sv) {
      sv = { id: uid(), nombre: String(p.nombre).trim(), color: colorPara(p.nombre), perfiles: perfilesPara(p.nombre), precio, costo: num(p.costo), precioRevendedor: num(p.vendedor), catalogo: p.activo !== false, origen: 'mrn:p' + p.id };
      S.servicios.push(sv); porNombre.set(k, sv); r.servicios++;
    } else if (String(sv.origen || '').startsWith('mrn:')) { sv.precio = precio || sv.precio; sv.costo = num(p.costo); sv.precioRevendedor = num(p.vendedor); }
    porId.set(p.id, sv);
  }
  const buscarSvc = nombre => {
    const k = norm(nombre); if (!k) return null;
    if (porNombre.has(k)) return porNombre.get(k);
    const c = [...porNombre.entries()].filter(([n]) => n.length > 2 && (n.startsWith(k) || k.startsWith(n)));
    return c.length === 1 ? c[0][1] : null;
  };
  // Ventas por cliente (la más reciente primero)
  const txPorCli = new Map();
  for (const t of d.transacciones || []) { if (!txPorCli.has(t.clienteId)) txPorCli.set(t.clienteId, []); txPorCli.get(t.clienteId).push(t); }
  for (const l of txPorCli.values()) l.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  // Clientes → clientes + ventas activas
  const cliPorMrn = new Map();
  for (const c of d.clientes) {
    const nombre = String(c.nombre || '').trim() || 'Sin nombre';
    let tel = String(c.tel || '').trim(); if (tel.replace(/\D/g, '').length < 7) tel = '';
    const org = 'mrn:' + c.id;
    let cl = S.clientes.find(x => (x.origenes || []).includes(org))
      || S.clientes.find(x => norm(x.nombre) === norm(nombre) && (!tel || !x.telefono || normTel(x.telefono) === normTel(tel)));
    const txs = txPorCli.get(c.id) || [], ult = txs[0];
    if (!cl) {
      const creado = (typeof c.id === 'number' && c.id > 1e12 ? fechaLocal(c.id) : '') || fechaLocal(txs.length ? txs[txs.length - 1].fecha : '') || hoy();
      cl = { id: uid(), nombre, telefono: tel, notas: '', creado, estrellas: num(c.estrellas), origenes: [] };
      S.clientes.push(cl); r.clientes++;
    } else { if (tel && !cl.telefono) cl.telefono = tel; if (c.estrellas != null) cl.estrellas = num(c.estrellas); }
    if (!cl.origenes) cl.origenes = [];
    if (!cl.origenes.includes(org)) cl.origenes.push(org);
    cliPorMrn.set(c.id, cl.id);
    let sv = buscarSvc(c.servicio) || (ult && porId.get(ult.productoId));
    if (!sv) {
      sv = { id: uid(), nombre: String(c.servicio || 'Servicio').trim(), color: colorPara(c.servicio), perfiles: perfilesPara(c.servicio), precio: ult ? num(ult.precio) : 0, costo: ult ? num(ult.costo) : 0, catalogo: false, origen: 'mrn:s' + norm(c.servicio) };
      S.servicios.push(sv); porNombre.set(norm(sv.nombre), sv); r.servicios++;
    }
    const vence = fechaLocal(c.vence) || addDays(hoy(), num(c.dias));
    const acceso = String(c.cuenta || '').trim();
    let sub = S.subs.find(x => x.origen === org);
    if (sub) {
      sub.clienteId = cl.id; sub.servicioId = sv.id; sub.vence = vence; sub.activa = true;
      if (acceso) sub.acceso = acceso;
      r.actualizados++;
    } else {
      let inicio = ult ? fechaLocal(ult.fecha) : '';
      if (!inicio || inicio > vence) inicio = addDays(vence, -30);
      S.subs.push({ id: uid(), ventaId: uid(), clienteId: cl.id, servicioId: sv.id, cuentaId: '', perfil: '', pin: '', precio: ult ? num(ult.precio) : sv.precio,
        completa: false, inicio, vence, pagado: true, activa: true, notas: '', acceso, creado: new Date().toISOString(), renovaciones: Math.max(0, txs.length - 1), comboId: '', origen: org });
      r.ventas++;
    }
  }
  // Transacciones → pagos (+ costo como gasto del mes)
  const ya = new Set(S.pagos.map(p => p.origen).filter(Boolean));
  const gastos = {};
  for (const t of d.transacciones || []) {
    const org = 'mrn:t' + t.id; if (ya.has(org)) continue;
    const f = fechaLocal(t.fecha) || hoy();
    let cid = cliPorMrn.get(t.clienteId);
    if (!cid) { const m = S.clientes.find(x => norm(x.nombre) === norm(t.clienteNombre)); cid = m ? m.id : ''; }
    const sv = porId.get(t.productoId) || buscarSvc(t.productoNombre);
    S.pagos.push({ id: uid(), clienteId: cid, clienteNombre: String(t.clienteNombre || ''), subIds: [], servicioId: sv ? sv.id : '', monto: num(t.precio), fecha: f, metodo: 'MrNetflix', concepto: String(t.productoNombre || 'Venta'), origen: org });
    r.pagos++;
    if (num(t.costo) > 0) { const ym = mesDe(f); if (!gastos[ym]) gastos[ym] = { monto: 0, fecha: f, n: 0 }; gastos[ym].monto += num(t.costo); gastos[ym].n++; if (f > gastos[ym].fecha) gastos[ym].fecha = f; }
  }
  for (const [ym, g] of Object.entries(gastos)) {
    S.gastos.push({ id: uid(), concepto: `Costo de ${g.n} venta${g.n > 1 ? 's' : ''} de MrNetflix (${mesLabel(ym)})`, monto: g.monto, fecha: g.fecha, categoria: 'Cuentas', origen: 'mrn:g' + ym });
    r.gastos++;
  }
  return r;
}
function exportarCSV(tipo) {
  let rows = [];
  if (tipo === 'ventas') {
    rows.push(['Cliente', 'Teléfono', 'Servicio', 'Cuenta', 'Perfil', 'PIN', 'Precio', 'Inicio', 'Vence', 'Estado', 'Pagado', 'Renovaciones']);
    for (const s of S.subs) rows.push([cliente(s.clienteId)?.nombre, cliente(s.clienteId)?.telefono, svc(s.servicioId)?.nombre, cuenta(s.cuentaId)?.correo, s.completa ? 'Completa' : s.perfil, s.pin, s.precio, s.inicio, s.vence, EST[estadoSub(s)].t, s.pagado ? 'Sí' : 'No', s.renovaciones || 0]);
  } else if (tipo === 'clientes') {
    rows.push(['Nombre', 'Teléfono', 'Notas', 'Servicios activos', 'Total pagado', 'Cliente desde']);
    for (const c of S.clientes) { const i = infoCliente(c); rows.push([c.nombre, c.telefono, c.notas, i.subs.length, i.pagado, c.creado]); }
  } else if (tipo === 'cuentas') {
    rows.push(['Servicio', 'Correo', 'Clave', 'Proveedor', 'Costo', 'Vence', 'Perfiles', 'Libres', 'Activa']);
    for (const c of S.cuentas) rows.push([svc(c.servicioId)?.nombre, c.correo, c.clave, c.proveedor, c.costo, c.vence, c.perfilesMax, libres(c.id), c.activa !== false ? 'Sí' : 'No']);
  } else if (tipo === 'pagos') {
    rows.push(['Fecha', 'Cliente', 'Concepto', 'Método', 'Monto']);
    for (const p of S.pagos.filter(p => mesDe(p.fecha) === F.mes)) rows.push([p.fecha, cliente(p.clienteId)?.nombre, p.concepto, p.metodo, p.monto]);
  } else if (tipo === 'gastos') {
    rows.push(['Fecha', 'Concepto', 'Categoría', 'Monto']);
    for (const g of S.gastos.filter(g => mesDe(g.fecha) === F.mes)) rows.push([g.fecha, g.concepto, g.categoria, g.monto]);
  }
  descargar(`${tipo}-${hoy()}.csv`, '﻿' + csv(rows), 'text/csv;charset=utf-8');
  toast('CSV descargado');
}
function cargarDemo() {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[rnd(0, a.length - 1)];
  S.cuentas = []; S.clientes = []; S.subs = []; S.pagos = []; S.gastos = [];
  const provs = ['Proveedor Lima', 'Distribuidor Bogotá', 'Mayorista Medellín'];
  S.servicios.slice(0, 6).forEach((sv, k) => {
    for (let i = 1; i <= (k < 2 ? 2 : 1); i++) {
      const slug = sv.nombre.toLowerCase().replace(/[^a-z]/g, '');
      S.cuentas.push({ id: uid(), servicioId: sv.id, correo: `${slug}.ventas0${i}@correo.com`, clave: 'Clave' + rnd(1000, 9999), perfilesMax: sv.perfiles, proveedor: pick(provs), costo: Math.round(sv.precio * sv.perfiles * 0.3 / 1000) * 1000, vence: addDays(hoy(), rnd(-1, 26)), notas: '', activa: true, creado: hoy() });
    }
  });
  ['María Torres', 'Juan Pérez', 'Laura Gómez', 'Carlos Ruiz', 'Valentina Ríos', 'Andrés Mejía', 'Camila Restrepo', 'Santiago López', 'Daniela Cárdenas', 'Felipe Ortiz', 'Sara Montoya', 'Mateo Giraldo']
    .forEach(nm => S.clientes.push({ id: uid(), nombre: nm, telefono: '3' + rnd(100000000, 229999999), notas: '', creado: addDays(hoy(), -rnd(10, 120)) }));
  for (const cl of S.clientes) {
    for (let j = 0, k = rnd(1, 3); j < k; j++) {
      const disp = S.cuentas.filter(c => libres(c.id) > 0); if (!disp.length) break;
      const c = pick(disp), sv = svc(c.servicioId), inicio = addDays(hoy(), -rnd(0, 36)), pag = Math.random() > 0.18;
      const s = { id: uid(), ventaId: uid(), clienteId: cl.id, servicioId: sv.id, cuentaId: c.id, perfil: nextPerfil(c.id), pin: Math.random() > 0.6 ? String(rnd(1000, 9999)) : '', precio: sv.precio, completa: false, inicio, vence: addDays(inicio, 30), pagado: pag, activa: true, notas: '', creado: inicio + 'T12:00:00', renovaciones: rnd(0, 3) };
      S.subs.push(s);
      if (pag) S.pagos.push({ id: uid(), clienteId: cl.id, subIds: [s.id], monto: s.precio, fecha: inicio, metodo: pick(METODOS.slice(0, 4)), concepto: s.renovaciones ? 'Renovación' : 'Venta' });
    }
  }
  const ym = mesDe(hoy());
  for (let m = 1; m <= 5; m++) {
    const mm = addMonthYM(ym, -m);
    for (let i = 0, n = rnd(8, 16); i < n; i++) { const sv = pick(S.servicios.slice(0, 6)); S.pagos.push({ id: uid(), clienteId: pick(S.clientes).id, subIds: [], monto: sv.precio, fecha: `${mm}-${pad(rnd(1, 28))}`, metodo: 'Nequi', concepto: 'Venta' }); }
    S.gastos.push({ id: uid(), concepto: 'Compra de cuentas', monto: rnd(5, 9) * 10000, fecha: `${mm}-${pad(rnd(1, 28))}`, categoria: 'Cuentas' });
  }
  const diaMax = Math.max(1, new Date().getDate());
  for (const c of S.cuentas.slice(0, 2)) S.gastos.push({ id: uid(), concepto: `Cuenta ${svc(c.servicioId).nombre}`, monto: c.costo, fecha: `${ym}-${pad(rnd(1, diaMax))}`, categoria: 'Cuentas' });
  S.settings.ultimoRespaldo = hoy();
}

/* ---------- PIN / bloqueo ---------- */
async function hashPin(t) {
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('cuentaspro:' + t));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  let h = 0; for (const c of 'cuentaspro:' + t) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h;
}
function mostrarBloqueo() {
  closeModal(true);
  $('#lock').hidden = false; $('#lockErr').textContent = ''; $('#lockPin').value = '';
  setTimeout(() => $('#lockPin').focus(), 50);
}

/* =====================================================================
   EVENTOS
   ===================================================================== */
document.addEventListener('click', e => {
  if (e.target.id === 'modal') { closeModal(); return; }
  if (e.target.id === 'confirm') { closeConfirm(); return; }
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.a];
  if (fn) { e.preventDefault(); fn(el.dataset.id, el, e); }
});
document.addEventListener('submit', async e => {
  const f = e.target;
  if (f.id === 'lockForm') {
    e.preventDefault();
    const ok = (await hashPin($('#lockPin').value)) === S.settings.pinHash;
    if (ok) { $('#lock').hidden = true; render(); } else { $('#lockErr').textContent = 'PIN incorrecto'; $('#lockPin').value = ''; }
    return;
  }
  const name = f.dataset.form;
  if (!name || !FORMS[name]) return;
  e.preventDefault();
  FORMS[name](new FormData(f), f, e.submitter ? e.submitter.value : '');
});
document.addEventListener('input', e => {
  const t = e.target;
  if (DRAFT && t.closest('#fVenta')) { draftInput(t, false); return; }
  if (t.dataset.f) { F[t.dataset.f] = t.value; render(); return; }
  if (t.id === 'gsQ') { buscarGlobal(t.value); return; }
  if (t.form && t.form.dataset.form === 'combo') updateComboInfo(t.form);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (DRAFT && t.closest('#fVenta')) { draftInput(t, true); return; }
  if (t.dataset.fc) { F[t.dataset.fc] = t.value; render(); return; }
  if (t.dataset.price) { const s = svc(t.dataset.price); if (s) { s.precio = num(t.value); save(); render(); toast('Precio actualizado'); } return; }
  if (t.dataset.cat) { const s = svc(t.dataset.cat); if (s) { s.catalogo = t.checked; save(); render(); } return; }
  if (t.dataset.set) { S.settings[t.dataset.set] = t.type === 'checkbox' ? t.checked : t.value; save(); render(); return; }
  if (t.id === 'fileImport') { importar(t.files[0]); return; }
  if (t.id === 'logoFile') { procesarLogo(t.files[0]); return; }
  if (t.dataset.rep != null) { const box = document.getElementById('rn' + t.dataset.rep); if (box) box.hidden = t.value !== '__new'; return; }
  if (t.hasAttribute('data-cuentasvc')) { const s = svc(t.value), inp = t.form && t.form.elements.perfilesMax; if (s && inp) inp.value = s.perfiles; }
  if (t.form && t.form.dataset.form === 'combo') updateComboInfo(t.form);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('#confirm').classList.contains('open')) closeConfirm();
  else if ($('#modal').classList.contains('open')) closeModal();
});
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (VIEWS[h] && h !== VIEW) go(h); });
window.addEventListener('storage', e => { if (e.key === KEY) { S = load(); render(); } });

/* ---------- Inicio ---------- */
let ULTIMO_DIA = hoy();
function init() {
  const h = location.hash.slice(1);
  VIEW = VIEWS[h] ? h : 'panel';
  render();
  if (S.settings.pinHash) mostrarBloqueo();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  setInterval(() => { if (hoy() !== ULTIMO_DIA) { ULTIMO_DIA = hoy(); F.mes = mesDe(hoy()); render(); } }, 60000);
  if (syncOn()) syncAhora();
  setInterval(() => { if (syncOn() && document.visibilityState === 'visible') syncAhora(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && syncOn()) syncAhora(); });
  window.addEventListener('online', () => { if (syncOn()) syncAhora(); });
  window.addEventListener('offline', () => { if (syncOn()) setEst('offline'); });
}
init();
