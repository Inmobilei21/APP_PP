// La Calderera · Gestión de la casa rural
// Servidor sin dependencias (igual que APP.AM y APP PP): Node http, datos en JSON en el volumen
// de Railway (/data) y documentos en el servidor WebDAV del despacho cuando está configurado.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "public");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf", ".webmanifest": "application/manifest+json; charset=utf-8", ".json": "application/json; charset=utf-8" };
const dataDirectory = process.env.DATA_DIR || (fs.existsSync("/data") ? "/data" : path.join(__dirname, ".data"));
const uploadsDirectory = path.join(dataDirectory, "adjuntos");
const files = {
  users: path.join(dataDirectory, "usuarios.json"),
  sessions: path.join(dataDirectory, "sesiones.json"),
  settings: path.join(dataDirectory, "ajustes.json"),
  reservations: path.join(dataDirectory, "reservas.json"),
  cleanings: path.join(dataDirectory, "limpiezas.json"),
  inspections: path.join(dataDirectory, "revisiones.json"),
  incidents: path.join(dataDirectory, "incidencias.json"),
  repairs: path.join(dataDirectory, "reparaciones.json"),
  attachments: path.join(dataDirectory, "adjuntos.json")
};
const applicationVersion = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.RAILWAY_DEPLOYMENT_ID || "local";
const sessionDuration = 30 * 24 * 60 * 60 * 1000;
const cookieName = "lc_session";
const maxUpload = 25 * 1024 * 1024;

const defaultSettings = {
  hourlyRate: 10,
  workersCanInspect: false,
  checklist: {
    previa: ["Cristales limpios", "Camas hechas con ropa limpia", "Baños limpios y con toallas", "Cocina limpia y menaje completo", "Muebles en buen estado", "Suelos limpios", "Calefacción / aire acondicionado funcionando", "Agua caliente funcionando", "Luces y bombillas funcionando", "Basura vacía", "Productos de bienvenida y consumibles repuestos", "Piscina y exterior en orden"],
    posterior: ["Cristales bien", "Camas bien", "Muebles bien", "Colchones y almohadas sin manchas", "Menaje completo, sin roturas", "Electrodomésticos funcionando", "Paredes y puertas sin desperfectos", "Mandos a distancia y llaves", "Baños sin desperfectos", "Exterior, jardín y piscina sin daños", "Sin objetos olvidados por los huéspedes"]
  }
};

/* ---------- Almacenamiento ---------- */
function readFileJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeFileJson(file, data) {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, file);
}
function load(name) { const saved = readFileJson(files[name], []);return Array.isArray(saved) ? saved : []; }
function save(name, records) { writeFileJson(files[name], records); }
function loadSettings() {
  const saved = readFileJson(files.settings, {});
  return { ...defaultSettings, ...saved, checklist: { ...defaultSettings.checklist, ...(saved.checklist || {}) } };
}
function newId(prefix) { return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`; }
function cleanText(value, maximum = 500) { return String(value ?? "").trim().slice(0, maximum); }
function cleanDate(value) { const text = cleanText(value, 10);return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ""; }
function cleanNumber(value, { min = 0, max = 1e7, decimals = 2 } = {}) {
  const number = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number)) return 0;
  return Math.round(Math.min(max, Math.max(min, number)) * 10 ** decimals) / 10 ** decimals;
}
function nights(start, end) { return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86400000)); }

/* ---------- Usuarios y sesiones ---------- */
const sessions = new Map(Object.entries(readFileJson(files.sessions, {})).filter(([, s]) => s?.userId && s.expires > Date.now()));
function saveSessions() { writeFileJson(files.sessions, Object.fromEntries([...sessions].filter(([, s]) => s.expires > Date.now()))); }
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, passwordHash: crypto.scryptSync(password, salt, 64).toString("hex") };
}
function passwordOk(user, password) {
  if (!user?.passwordHash || typeof password !== "string") return false;
  const a = Buffer.from(hashPassword(password, user.salt).passwordHash, "hex"), b = Buffer.from(user.passwordHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function validPassword(password) { return typeof password === "string" && password.length >= 6 && password.length <= 128; }
function normalizeLogin(value) { return cleanText(value, 60).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9._-]/g, ""); }
function publicUser(user) { return { id: user.id, name: user.name, username: user.username, role: user.role, active: user.active !== false }; }
function cookieValue(req, name) {
  const item = (req.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}
function sessionCookie(token, maxAge) {
  const secure = process.env.NODE_ENV === "development" ? "" : " Secure;";
  return `${cookieName}=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}
function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, expires: Date.now() + sessionDuration });saveSessions();
  return token;
}
function currentUser(req) {
  const token = cookieValue(req, cookieName), session = sessions.get(token);
  if (!session) return null;
  if (session.expires < Date.now()) { sessions.delete(token);saveSessions();return null; }
  // La sesión se renueva por uso (como mucho una vez al día)
  if (session.expires - Date.now() < sessionDuration - 86400000) { session.expires = Date.now() + sessionDuration;saveSessions(); }
  const user = load("users").find(u => u.id === session.userId);
  return user && user.active !== false ? user : null;
}

/* ---------- Respuestas ---------- */
function json(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}
function fail(res, status, error) { json(res, status, { error }); }
function readJson(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk;if (body.length > limit) { reject(Object.assign(new Error("Datos demasiado grandes."), { status: 413 }));req.destroy(); } });
    req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch { reject(Object.assign(new Error("Datos no válidos."), { status: 400 })); } });
    req.on("error", reject);
  });
}
function readBuffer(req, limit = maxUpload) {
  return new Promise((resolve, reject) => {
    const chunks = [];let size = 0;
    req.on("data", chunk => { size += chunk.length;if (size > limit) { reject(Object.assign(new Error("El archivo supera los 25 MB."), { status: 413 }));req.destroy();return; }chunks.push(chunk); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/* ---------- Servidor de documentos (WebDAV, como Asesoría Molinero y ProPymes) ---------- */
const webdavBaseUrl = (process.env.WEBDAV_URL || "https://servidor.asesoriamolinero.es").replace(/\/+$/, "");
const webdavRoot = "/" + String(process.env.WEBDAV_ROOT || "LA_CALDERERA").split("/").filter(Boolean).map(encodeURIComponent).join("/");
function webdavConfigured() { return Boolean(process.env.WEBDAV_USERNAME && process.env.WEBDAV_PASSWORD); }
async function davRequest(relative, options = {}) {
  const url = `${webdavBaseUrl}${webdavRoot}${relative ? "/" + relative.split("/").map(encodeURIComponent).join("/") : ""}`;
  const auth = Buffer.from(`${process.env.WEBDAV_USERNAME}:${process.env.WEBDAV_PASSWORD}`).toString("base64");
  const response = await fetch(url, { ...options, headers: { Authorization: `Basic ${auth}`, ...(options.headers || {}) }, redirect: "manual", signal: AbortSignal.timeout(30000) });
  if (!response.ok && ![201, 204, 207].includes(response.status)) throw Object.assign(new Error(`El servidor de documentos respondió ${response.status}.`), { status: response.status });
  return response;
}
async function davEnsureFolders(parts) {
  for (let i = 0;i <= parts.length;i++) {
    try { await davRequest(parts.slice(0, i).join("/"), { method: "MKCOL" }); } catch (error) { if (![405, 301, 302].includes(error.status)) throw error; }
  }
}
function safeFileName(name) {
  return cleanText(name, 120).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_") || "archivo";
}
async function storeFile(buffer, { name, type, folder }) {
  const id = newId("adj"), stored = `${id.slice(4)}_${safeFileName(name)}`;
  const record = { id, name: cleanText(name, 160) || "archivo", type: cleanText(type, 100) || "application/octet-stream", size: buffer.length, createdAt: new Date().toISOString() };
  if (webdavConfigured()) {
    try {
      await davEnsureFolders([folder]);
      await davRequest(`${folder}/${stored}`, { method: "PUT", headers: { "Content-Type": record.type }, body: buffer });
      return { ...record, storage: "webdav", path: `${folder}/${stored}` };
    } catch (error) { console.error("WebDAV no disponible, se guarda en el volumen:", error.message); }
  }
  fs.mkdirSync(path.join(uploadsDirectory, folder), { recursive: true });
  fs.writeFileSync(path.join(uploadsDirectory, folder, stored), buffer, { mode: 0o600 });
  return { ...record, storage: "local", path: `${folder}/${stored}` };
}
async function readStoredFile(record) {
  if (record.storage === "webdav") return Buffer.from(await (await davRequest(record.path, { method: "GET" })).arrayBuffer());
  const file = path.join(uploadsDirectory, record.path);
  if (!file.startsWith(uploadsDirectory)) throw new Error("Ruta no válida");
  return fs.readFileSync(file);
}
async function deleteStoredFile(record) {
  try {
    if (record.storage === "webdav") await davRequest(record.path, { method: "DELETE" });
    else fs.rmSync(path.join(uploadsDirectory, record.path), { force: true });
  } catch (error) { console.error("No se pudo borrar el adjunto:", error.message); }
}

/* ---------- Vistas según el tipo de usuario ---------- */
// El trabajador nunca recibe el nombre del huésped, sus datos de contacto ni el importe de la reserva:
// se filtran aquí, en el servidor, para que no lleguen al navegador de ningún modo.
function reservationFor(user, reservation) {
  const base = { id: reservation.id, checkIn: reservation.checkIn, checkOut: reservation.checkOut, nights: nights(reservation.checkIn, reservation.checkOut), guests: reservation.guests, adults: reservation.adults, children: reservation.children, status: reservation.status, cleaningNotes: reservation.cleaningNotes || "" };
  if (user.role === "admin") return { ...reservation, nights: base.nights };
  return base;
}
function attachmentsFor(ids) {
  const all = load("attachments");
  return (ids || []).map(id => all.find(a => a.id === id)).filter(Boolean).map(({ id, name, type, size, createdAt, uploadedBy }) => ({ id, name, type, size, createdAt, uploadedBy }));
}
function cleaningFor(user, cleaning) {
  const users = load("users");
  return { ...cleaning, workerName: users.find(u => u.id === cleaning.workerId)?.name || "—", attachments: attachmentsFor(cleaning.attachmentIds) };
}
function visibleCleanings(user) {
  const all = load("cleanings");
  return (user.role === "admin" ? all : all.filter(c => c.workerId === user.id)).map(c => cleaningFor(user, c));
}
function canInspect(user) { return user.role === "admin" || loadSettings().workersCanInspect; }
function inspectionFor(reservationId, phase) {
  const saved = load("inspections").find(i => i.reservationId === reservationId && i.phase === phase);
  const template = loadSettings().checklist[phase] || [];
  if (saved) return saved;
  return { reservationId, phase, items: template.map(text => ({ text, status: "" })), notes: "", completed: false };
}
function incidentFor(incident) { return { ...incident, attachments: attachmentsFor(incident.attachmentIds) }; }
function repairFor(repair) { return { ...repair, attachments: attachmentsFor(repair.attachmentIds) }; }

/* ---------- Sincronización con Avaibook ---------- */
// Avaibook (que a su vez reúne Booking y Airbnb) exporta el calendario de cada alojamiento en iCal.
// Con AVAIBOOK_ICAL_URL configurada, las reservas se importan solas cada 15 minutos. Más adelante se
// puede cambiar por la API de Avaibook para traer también importe y datos del huésped.
let avaibookStatus = { configured: Boolean(process.env.AVAIBOOK_ICAL_URL), lastSync: null, lastError: "", imported: 0 };
function icalDate(value) {
  const match = String(value || "").match(/(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}
function parseIcal(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  return [...unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)].map(([, block]) => {
    const field = name => (block.match(new RegExp(`^${name}(?:;[^:\\r\\n]*)?:(.*)$`, "m"))?.[1] || "").trim();
    return { uid: field("UID"), start: icalDate(field("DTSTART")), end: icalDate(field("DTEND")), summary: field("SUMMARY").replace(/\\,/g, ",").replace(/\\n/gi, " "), description: field("DESCRIPTION").replace(/\\,/g, ",").replace(/\\n/gi, "\n") };
  }).filter(event => event.uid && event.start && event.end);
}
function channelFrom(text) {
  if (/airbnb/i.test(text)) return "Airbnb";
  if (/booking/i.test(text)) return "Booking";
  return "Avaibook";
}
async function syncAvaibook() {
  const url = process.env.AVAIBOOK_ICAL_URL;
  avaibookStatus.configured = Boolean(url);
  if (!url) throw Object.assign(new Error("Falta la variable AVAIBOOK_ICAL_URL en Railway."), { status: 503 });
  try {
    const response = await fetch(url, { headers: { "User-Agent": "LaCalderera/1.0" }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Avaibook respondió ${response.status}.`);
    const events = parseIcal(await response.text()).filter(e => !/no disponible|not available|bloquead|blocked/i.test(e.summary));
    const reservations = load("reservations");let imported = 0;
    for (const event of events) {
      const existing = reservations.find(r => r.externalId === event.uid);
      if (existing) {
        if (existing.checkIn !== event.start || existing.checkOut !== event.end) { existing.checkIn = event.start;existing.checkOut = event.end;existing.updatedAt = new Date().toISOString(); }
        continue;
      }
      reservations.push({ id: newId("res"), externalId: event.uid, channel: channelFrom(`${event.summary} ${event.description}`), guestName: event.summary || "Reserva Avaibook", phone: "", email: "", amount: 0, guests: 0, adults: 0, children: 0, checkIn: event.start, checkOut: event.end, status: "confirmada", notes: event.description.slice(0, 2000), cleaningNotes: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      imported++;
    }
    save("reservations", reservations);
    avaibookStatus = { configured: true, lastSync: new Date().toISOString(), lastError: "", imported };
    return avaibookStatus;
  } catch (error) {
    avaibookStatus = { ...avaibookStatus, lastSync: new Date().toISOString(), lastError: error.message };
    throw Object.assign(error, { status: 502 });
  }
}
if (process.env.AVAIBOOK_ICAL_URL) {
  syncAvaibook().catch(error => console.error("Avaibook:", error.message));
  setInterval(() => syncAvaibook().catch(error => console.error("Avaibook:", error.message)), 15 * 60 * 1000).unref();
}

/* ---------- Rutas de la API ---------- */
const routes = [];
function route(method, pattern, handler, { admin = false, auth = true } = {}) {
  const keys = [];
  const regex = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, key) => { keys.push(key);return "([^/]+)"; }) + "$");
  routes.push({ method, regex, keys, handler, admin, auth });
}

route("GET", "/api/version", (req, res) => json(res, 200, { version: applicationVersion }), { auth: false });

// Datos que cambian: el navegador los pide cada pocos segundos para estar siempre al día
route("GET", "/api/estado", (req, res, { user }) => {
  const stamp = Object.values(files).map(file => { try { return fs.statSync(file).mtimeMs; } catch { return 0; } }).join("-");
  json(res, 200, { version: applicationVersion, data: crypto.createHash("sha1").update(stamp + user.id).digest("hex").slice(0, 16) });
});

route("GET", "/api/auth/status", (req, res) => {
  const user = currentUser(req), needsSetup = !load("users").some(u => u.role === "admin");
  json(res, 200, { user: user ? publicUser(user) : null, needsSetup });
}, { auth: false });

route("POST", "/api/auth/setup", async (req, res) => {
  const users = load("users");
  if (users.some(u => u.role === "admin")) return fail(res, 409, "El administrador ya está creado.");
  const { name, username, password } = await readJson(req);
  const login = normalizeLogin(username);
  if (!cleanText(name) || !login) return fail(res, 400, "Indica nombre y usuario.");
  if (!validPassword(password)) return fail(res, 400, "La contraseña debe tener al menos 6 caracteres.");
  const user = { id: newId("usr"), name: cleanText(name, 80), username: login, role: "admin", active: true, ...hashPassword(password), createdAt: new Date().toISOString() };
  save("users", [...users, user]);
  json(res, 201, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(createSession(user.id), sessionDuration / 1000) });
}, { auth: false });

const loginAttempts = new Map();
route("POST", "/api/auth/login", async (req, res) => {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const attempt = loginAttempts.get(ip) || { count: 0, until: 0 };
  if (attempt.until > Date.now()) return fail(res, 429, "Demasiados intentos. Espera unos minutos.");
  const { username, password } = await readJson(req);
  const user = load("users").find(u => u.username === normalizeLogin(username) && u.active !== false);
  if (!passwordOk(user, password)) {
    attempt.count++;if (attempt.count >= 8) { attempt.until = Date.now() + 10 * 60 * 1000;attempt.count = 0; }
    loginAttempts.set(ip, attempt);
    return fail(res, 401, "Usuario o contraseña incorrectos.");
  }
  loginAttempts.delete(ip);
  json(res, 200, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(createSession(user.id), sessionDuration / 1000) });
}, { auth: false });

route("POST", "/api/auth/logout", (req, res) => {
  sessions.delete(cookieValue(req, cookieName));saveSessions();
  json(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
}, { auth: false });

route("POST", "/api/auth/password", async (req, res, { user }) => {
  const { current, password } = await readJson(req);
  if (!passwordOk(user, current)) return fail(res, 400, "La contraseña actual no es correcta.");
  if (!validPassword(password)) return fail(res, 400, "La nueva contraseña debe tener al menos 6 caracteres.");
  const users = load("users"), saved = users.find(u => u.id === user.id);
  Object.assign(saved, hashPassword(password));save("users", users);
  json(res, 200, { ok: true });
});

/* Usuarios (solo administrador) */
route("GET", "/api/usuarios", (req, res) => json(res, 200, load("users").map(publicUser)), { admin: true });
route("POST", "/api/usuarios", async (req, res) => {
  const { name, username, password, role } = await readJson(req);
  const users = load("users"), login = normalizeLogin(username);
  if (!cleanText(name) || !login) return fail(res, 400, "Indica nombre y usuario.");
  if (users.some(u => u.username === login)) return fail(res, 409, "Ya existe un usuario con ese nombre de acceso.");
  if (!validPassword(password)) return fail(res, 400, "La contraseña debe tener al menos 6 caracteres.");
  const user = { id: newId("usr"), name: cleanText(name, 80), username: login, role: role === "admin" ? "admin" : "trabajador", active: true, ...hashPassword(password), createdAt: new Date().toISOString() };
  save("users", [...users, user]);
  json(res, 201, publicUser(user));
}, { admin: true });
route("PUT", "/api/usuarios/:id", async (req, res, { user, params }) => {
  const body = await readJson(req), users = load("users"), target = users.find(u => u.id === params.id);
  if (!target) return fail(res, 404, "Usuario no encontrado.");
  if (body.name !== undefined) target.name = cleanText(body.name, 80) || target.name;
  if (body.role !== undefined && target.id !== user.id) target.role = body.role === "admin" ? "admin" : "trabajador";
  if (body.active !== undefined && target.id !== user.id) target.active = Boolean(body.active);
  if (body.password) { if (!validPassword(body.password)) return fail(res, 400, "La contraseña debe tener al menos 6 caracteres.");Object.assign(target, hashPassword(body.password)); }
  save("users", users);
  if (target.active === false) { for (const [token, s] of sessions) if (s.userId === target.id) sessions.delete(token);saveSessions(); }
  json(res, 200, publicUser(target));
}, { admin: true });

/* Ajustes */
route("GET", "/api/ajustes", (req, res, { user }) => {
  const settings = loadSettings();
  json(res, 200, user.role === "admin" ? { ...settings, webdav: { configured: webdavConfigured(), root: decodeURIComponent(webdavRoot) }, avaibook: avaibookStatus } : { hourlyRate: settings.hourlyRate, workersCanInspect: settings.workersCanInspect });
});
route("PUT", "/api/ajustes", async (req, res) => {
  const body = await readJson(req), settings = loadSettings();
  if (body.hourlyRate !== undefined) settings.hourlyRate = cleanNumber(body.hourlyRate, { min: 0, max: 1000 });
  if (body.workersCanInspect !== undefined) settings.workersCanInspect = Boolean(body.workersCanInspect);
  for (const phase of ["previa", "posterior"]) {
    if (Array.isArray(body.checklist?.[phase])) settings.checklist[phase] = body.checklist[phase].map(t => cleanText(t, 160)).filter(Boolean).slice(0, 80);
  }
  writeFileJson(files.settings, { hourlyRate: settings.hourlyRate, workersCanInspect: settings.workersCanInspect, checklist: settings.checklist });
  json(res, 200, settings);
}, { admin: true });

/* Reservas */
const reservationStatuses = ["confirmada", "pendiente", "cancelada", "finalizada"];
function reservationFromBody(body, current = {}) {
  const adults = cleanNumber(body.adults ?? current.adults, { max: 99, decimals: 0 }), children = cleanNumber(body.children ?? current.children, { max: 99, decimals: 0 });
  return {
    ...current,
    guestName: cleanText(body.guestName ?? current.guestName, 120),
    phone: cleanText(body.phone ?? current.phone, 40),
    email: cleanText(body.email ?? current.email, 120),
    channel: cleanText(body.channel ?? current.channel, 30) || "Directa",
    amount: cleanNumber(body.amount ?? current.amount),
    adults, children,
    guests: cleanNumber(body.guests ?? (adults + children || current.guests), { max: 99, decimals: 0 }) || adults + children,
    checkIn: cleanDate(body.checkIn ?? current.checkIn),
    checkOut: cleanDate(body.checkOut ?? current.checkOut),
    status: reservationStatuses.includes(body.status) ? body.status : current.status || "confirmada",
    notes: cleanText(body.notes ?? current.notes, 4000),
    cleaningNotes: cleanText(body.cleaningNotes ?? current.cleaningNotes, 2000),
    updatedAt: new Date().toISOString()
  };
}
route("GET", "/api/reservas", (req, res, { user }) => {
  const list = load("reservations").filter(r => user.role === "admin" || r.status !== "cancelada").sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const cleanings = load("cleanings"), inspections = load("inspections"), incidents = load("incidents");
  json(res, 200, list.map(r => ({
    ...reservationFor(user, r),
    cleaningHours: cleanings.filter(c => c.reservationId === r.id && (user.role === "admin" || c.workerId === user.id)).reduce((s, c) => s + c.hours, 0),
    inspections: Object.fromEntries(["previa", "posterior"].map(phase => [phase, inspections.find(i => i.reservationId === r.id && i.phase === phase)?.completed ? "completada" : inspections.some(i => i.reservationId === r.id && i.phase === phase) ? "en curso" : ""])),
    openIncidents: user.role === "admin" ? incidents.filter(i => i.reservationId === r.id && i.status !== "resuelta").length : undefined
  })));
});
route("GET", "/api/reservas/:id", (req, res, { user, params }) => {
  const reservation = load("reservations").find(r => r.id === params.id);
  if (!reservation || (user.role !== "admin" && reservation.status === "cancelada")) return fail(res, 404, "Reserva no encontrada.");
  const showInspections = canInspect(user);
  json(res, 200, {
    reservation: reservationFor(user, reservation),
    cleanings: visibleCleanings(user).filter(c => c.reservationId === reservation.id),
    inspections: showInspections ? { previa: inspectionFor(reservation.id, "previa"), posterior: inspectionFor(reservation.id, "posterior") } : null,
    incidents: showInspections ? load("incidents").filter(i => i.reservationId === reservation.id).map(incidentFor) : []
  });
});
route("POST", "/api/reservas", async (req, res) => {
  const reservation = reservationFromBody(await readJson(req), { id: newId("res"), createdAt: new Date().toISOString() });
  if (!reservation.checkIn || !reservation.checkOut || reservation.checkOut < reservation.checkIn) return fail(res, 400, "Revisa las fechas de entrada y salida.");
  save("reservations", [...load("reservations"), reservation]);
  json(res, 201, reservation);
}, { admin: true });
route("PUT", "/api/reservas/:id", async (req, res, { params }) => {
  const list = load("reservations"), index = list.findIndex(r => r.id === params.id);
  if (index < 0) return fail(res, 404, "Reserva no encontrada.");
  const updated = reservationFromBody(await readJson(req), list[index]);
  if (!updated.checkIn || !updated.checkOut || updated.checkOut < updated.checkIn) return fail(res, 400, "Revisa las fechas de entrada y salida.");
  list[index] = updated;save("reservations", list);
  json(res, 200, updated);
}, { admin: true });
route("DELETE", "/api/reservas/:id", async (req, res, { params }) => {
  save("reservations", load("reservations").filter(r => r.id !== params.id));
  save("inspections", load("inspections").filter(i => i.reservationId !== params.id));
  json(res, 200, { ok: true });
}, { admin: true });
route("POST", "/api/avaibook/sincronizar", async (req, res) => json(res, 200, await syncAvaibook()), { admin: true });

/* Limpiezas: el trabajador solo puede registrar sus horas y adjuntar fotos o documentos */
route("GET", "/api/limpiezas", (req, res, { user }) => json(res, 200, visibleCleanings(user).sort((a, b) => b.date.localeCompare(a.date))));
route("POST", "/api/limpiezas", async (req, res, { user }) => {
  const body = await readJson(req), settings = loadSettings();
  const reservation = load("reservations").find(r => r.id === body.reservationId);
  if (!reservation) return fail(res, 400, "Elige la reserva.");
  const hours = cleanNumber(body.hours, { max: 24 });
  if (!hours) return fail(res, 400, "Indica el número de horas.");
  const workerId = user.role === "admin" && body.workerId ? body.workerId : user.id;
  if (!load("users").some(u => u.id === workerId)) return fail(res, 400, "Trabajador no válido.");
  const rate = settings.hourlyRate;
  const cleaning = { id: newId("lim"), reservationId: reservation.id, workerId, date: cleanDate(body.date) || new Date().toISOString().slice(0, 10), startTime: cleanText(body.startTime, 5), hours, rate, total: Math.round(hours * rate * 100) / 100, notes: cleanText(body.notes, 2000), paid: false, attachmentIds: [], createdBy: user.id, createdAt: new Date().toISOString() };
  save("cleanings", [...load("cleanings"), cleaning]);
  json(res, 201, cleaningFor(user, cleaning));
});
route("PUT", "/api/limpiezas/:id", async (req, res, { user, params }) => {
  const list = load("cleanings"), cleaning = list.find(c => c.id === params.id);
  if (!cleaning || (user.role !== "admin" && cleaning.workerId !== user.id)) return fail(res, 404, "Limpieza no encontrada.");
  if (user.role !== "admin" && cleaning.paid) return fail(res, 403, "Esta limpieza ya está pagada; pide al administrador que la cambie.");
  const body = await readJson(req);
  if (body.hours !== undefined) cleaning.hours = cleanNumber(body.hours, { max: 24 }) || cleaning.hours;
  if (body.date !== undefined) cleaning.date = cleanDate(body.date) || cleaning.date;
  if (body.startTime !== undefined) cleaning.startTime = cleanText(body.startTime, 5);
  if (body.notes !== undefined) cleaning.notes = cleanText(body.notes, 2000);
  if (user.role === "admin") {
    if (body.rate !== undefined) cleaning.rate = cleanNumber(body.rate, { max: 1000 });
    if (body.paid !== undefined) { cleaning.paid = Boolean(body.paid);cleaning.paidAt = cleaning.paid ? new Date().toISOString() : null; }
  }
  cleaning.total = Math.round(cleaning.hours * cleaning.rate * 100) / 100;
  save("cleanings", list);
  json(res, 200, cleaningFor(user, cleaning));
});
route("DELETE", "/api/limpiezas/:id", async (req, res, { user, params }) => {
  const list = load("cleanings"), cleaning = list.find(c => c.id === params.id);
  if (!cleaning || (user.role !== "admin" && (cleaning.workerId !== user.id || cleaning.paid))) return fail(res, 404, "Limpieza no encontrada.");
  await removeAttachments(cleaning.attachmentIds);
  save("cleanings", list.filter(c => c.id !== cleaning.id));
  json(res, 200, { ok: true });
});

/* Revisiones previa y posterior */
route("PUT", "/api/reservas/:id/revision/:phase", async (req, res, { user, params }) => {
  if (!canInspect(user)) return fail(res, 403, "No tienes permiso para las revisiones.");
  if (!["previa", "posterior"].includes(params.phase)) return fail(res, 404, "Revisión no válida.");
  if (!load("reservations").some(r => r.id === params.id)) return fail(res, 404, "Reserva no encontrada.");
  const body = await readJson(req), list = load("inspections");
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 100).map(item => ({ text: cleanText(item.text, 160), status: ["ok", "mal", ""].includes(item.status) ? item.status : "", note: cleanText(item.note, 300) })).filter(i => i.text);
  const inspection = { reservationId: params.id, phase: params.phase, items, notes: cleanText(body.notes, 2000), completed: Boolean(body.completed), updatedBy: user.id, updatedByName: user.name, updatedAt: new Date().toISOString() };
  const index = list.findIndex(i => i.reservationId === params.id && i.phase === params.phase);
  if (index < 0) list.push(inspection);else list[index] = inspection;
  save("inspections", list);
  json(res, 200, inspection);
});

/* Incidencias */
route("GET", "/api/incidencias", (req, res) => {
  const reservations = load("reservations");
  json(res, 200, load("incidents").map(i => ({ ...incidentFor(i), reservation: reservations.find(r => r.id === i.reservationId) || null })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}, { admin: true });
route("POST", "/api/incidencias", async (req, res, { user }) => {
  if (!canInspect(user)) return fail(res, 403, "No tienes permiso para crear incidencias.");
  const body = await readJson(req);
  if (!load("reservations").some(r => r.id === body.reservationId)) return fail(res, 400, "Elige la reserva.");
  const description = cleanText(body.description, 2000);
  if (!description) return fail(res, 400, "Describe la incidencia.");
  const incident = { id: newId("inc"), reservationId: body.reservationId, phase: body.phase === "previa" ? "previa" : "posterior", item: cleanText(body.item, 160), description, severity: ["leve", "media", "grave"].includes(body.severity) ? body.severity : "media", cost: cleanNumber(body.cost), status: "abierta", attachmentIds: [], createdBy: user.id, createdByName: user.name, createdAt: new Date().toISOString() };
  save("incidents", [...load("incidents"), incident]);
  json(res, 201, incidentFor(incident));
});
route("PUT", "/api/incidencias/:id", async (req, res, { params }) => {
  const list = load("incidents"), incident = list.find(i => i.id === params.id);
  if (!incident) return fail(res, 404, "Incidencia no encontrada.");
  const body = await readJson(req);
  if (body.description !== undefined) incident.description = cleanText(body.description, 2000) || incident.description;
  if (body.severity !== undefined && ["leve", "media", "grave"].includes(body.severity)) incident.severity = body.severity;
  if (body.cost !== undefined) incident.cost = cleanNumber(body.cost);
  if (body.status !== undefined) { incident.status = body.status === "resuelta" ? "resuelta" : "abierta";incident.resolvedAt = incident.status === "resuelta" ? new Date().toISOString() : null; }
  if (body.resolution !== undefined) incident.resolution = cleanText(body.resolution, 2000);
  save("incidents", list);
  json(res, 200, incidentFor(incident));
}, { admin: true });
route("DELETE", "/api/incidencias/:id", async (req, res, { params }) => {
  const list = load("incidents"), incident = list.find(i => i.id === params.id);
  if (incident) await removeAttachments(incident.attachmentIds);
  save("incidents", list.filter(i => i.id !== params.id));
  json(res, 200, { ok: true });
}, { admin: true });
// Pasar una incidencia a la lista de reparaciones
route("POST", "/api/incidencias/:id/reparacion", async (req, res, { user, params }) => {
  const incident = load("incidents").find(i => i.id === params.id);
  if (!incident) return fail(res, 404, "Incidencia no encontrada.");
  const repair = { id: newId("rep"), task: incident.item ? `${incident.item}: ${incident.description}`.slice(0, 200) : incident.description.slice(0, 200), details: incident.description, incidentId: incident.id, done: false, doneAt: null, cost: incident.cost || 0, attachmentIds: [], createdBy: user.id, createdAt: new Date().toISOString() };
  save("repairs", [...load("repairs"), repair]);
  json(res, 201, repairFor(repair));
}, { admin: true });

/* Lista de reparaciones */
route("GET", "/api/reparaciones", (req, res) => json(res, 200, load("repairs").map(repairFor).sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt.localeCompare(a.createdAt))), { admin: true });
route("POST", "/api/reparaciones", async (req, res, { user }) => {
  const body = await readJson(req), task = cleanText(body.task, 200);
  if (!task) return fail(res, 400, "Indica la tarea.");
  const repair = { id: newId("rep"), task, details: cleanText(body.details, 2000), supplier: cleanText(body.supplier, 120), cost: cleanNumber(body.cost), done: false, doneAt: null, attachmentIds: [], createdBy: user.id, createdAt: new Date().toISOString() };
  save("repairs", [...load("repairs"), repair]);
  json(res, 201, repairFor(repair));
}, { admin: true });
route("PUT", "/api/reparaciones/:id", async (req, res, { params }) => {
  const list = load("repairs"), repair = list.find(r => r.id === params.id);
  if (!repair) return fail(res, 404, "Reparación no encontrada.");
  const body = await readJson(req);
  if (body.task !== undefined) repair.task = cleanText(body.task, 200) || repair.task;
  if (body.details !== undefined) repair.details = cleanText(body.details, 2000);
  if (body.supplier !== undefined) repair.supplier = cleanText(body.supplier, 120);
  if (body.cost !== undefined) repair.cost = cleanNumber(body.cost);
  if (body.done !== undefined) { repair.done = Boolean(body.done);repair.doneAt = repair.done ? (cleanDate(body.doneAt) || new Date().toISOString().slice(0, 10)) : null; }
  save("repairs", list);
  json(res, 200, repairFor(repair));
}, { admin: true });
route("DELETE", "/api/reparaciones/:id", async (req, res, { params }) => {
  const list = load("repairs"), repair = list.find(r => r.id === params.id);
  if (repair) await removeAttachments(repair.attachmentIds);
  save("repairs", list.filter(r => r.id !== params.id));
  json(res, 200, { ok: true });
}, { admin: true });

/* Adjuntos: fotos y documentos de limpiezas, incidencias y facturas de reparaciones */
const owners = {
  limpieza: { collection: "cleanings", folder: "Limpiezas", allowed: (user, item) => user.role === "admin" || item.workerId === user.id },
  incidencia: { collection: "incidents", folder: "Incidencias", allowed: user => canInspect(user) },
  reparacion: { collection: "repairs", folder: "Reparaciones", allowed: user => user.role === "admin" }
};
async function removeAttachments(ids = []) {
  const all = load("attachments"), removing = all.filter(a => ids.includes(a.id));
  for (const record of removing) await deleteStoredFile(record);
  save("attachments", all.filter(a => !ids.includes(a.id)));
}
function findOwnerOf(attachmentId) {
  for (const [kind, owner] of Object.entries(owners)) {
    const item = load(owner.collection).find(i => (i.attachmentIds || []).includes(attachmentId));
    if (item) return { kind, owner, item };
  }
  return null;
}
route("POST", "/api/adjuntos/:kind/:id", async (req, res, { user, params }) => {
  const owner = owners[params.kind];
  if (!owner) return fail(res, 404, "Destino no válido.");
  const list = load(owner.collection), item = list.find(i => i.id === params.id);
  if (!item || !owner.allowed(user, item)) return fail(res, 404, "No encontrado.");
  let name = "archivo";try { name = decodeURIComponent(String(req.headers["x-file-name"] || "archivo")); } catch {}
  const type = String(req.headers["content-type"] || "application/octet-stream").split(";")[0].trim();
  if (!/^(image\/|application\/pdf|application\/(msword|vnd\.openxmlformats|vnd\.ms-excel|vnd\.oasis)|text\/plain)/.test(type)) return fail(res, 415, "Solo se pueden adjuntar fotos, PDF o documentos de Office.");
  const buffer = await readBuffer(req);
  if (!buffer.length) return fail(res, 400, "El archivo está vacío.");
  const month = new Date().toISOString().slice(0, 7);
  const record = { ...await storeFile(buffer, { name, type, folder: `${owner.folder}/${month}` }), uploadedBy: user.name };
  save("attachments", [...load("attachments"), record]);
  const fresh = load(owner.collection), target = fresh.find(i => i.id === params.id);
  target.attachmentIds = [...(target.attachmentIds || []), record.id];
  save(owner.collection, fresh);
  json(res, 201, { id: record.id, name: record.name, type: record.type, size: record.size, createdAt: record.createdAt, uploadedBy: record.uploadedBy, storage: record.storage });
});
route("GET", "/api/adjuntos/:id", async (req, res, { user, params }) => {
  const record = load("attachments").find(a => a.id === params.id), found = findOwnerOf(params.id);
  if (!record || !found || !found.owner.allowed(user, found.item)) return fail(res, 404, "Archivo no encontrado.");
  const data = await readStoredFile(record);
  const download = new URL(req.url, "http://x").searchParams.has("descargar");
  res.writeHead(200, { "Content-Type": record.type, "Content-Length": data.length, "Cache-Control": "private, max-age=3600", "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(record.name)}`, "X-Content-Type-Options": "nosniff" });
  res.end(data);
});
route("DELETE", "/api/adjuntos/:id", async (req, res, { user, params }) => {
  const found = findOwnerOf(params.id);
  if (!found || !found.owner.allowed(user, found.item)) return fail(res, 404, "Archivo no encontrado.");
  if (user.role !== "admin" && found.kind === "limpieza" && found.item.paid) return fail(res, 403, "Esta limpieza ya está pagada.");
  const list = load(found.owner.collection), item = list.find(i => i.id === found.item.id);
  item.attachmentIds = item.attachmentIds.filter(id => id !== params.id);
  save(found.owner.collection, list);
  await removeAttachments([params.id]);
  json(res, 200, { ok: true });
});

/* Resumen de inicio */
route("GET", "/api/resumen", (req, res, { user }) => {
  const today = new Date().toISOString().slice(0, 10);
  const reservations = load("reservations").filter(r => r.status !== "cancelada");
  const cleanings = visibleCleanings(user);
  const upcoming = reservations.filter(r => r.checkOut >= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn)).slice(0, 6).map(r => reservationFor(user, r));
  const unpaid = cleanings.filter(c => !c.paid);
  const summary = { upcoming, unpaidHours: unpaid.reduce((s, c) => s + c.hours, 0), unpaidTotal: Math.round(unpaid.reduce((s, c) => s + c.total, 0) * 100) / 100, hourlyRate: loadSettings().hourlyRate };
  if (user.role === "admin") {
    const year = today.slice(0, 4);
    Object.assign(summary, {
      openIncidents: load("incidents").filter(i => i.status !== "resuelta").length,
      pendingRepairs: load("repairs").filter(r => !r.done).length,
      yearIncome: Math.round(reservations.filter(r => r.checkIn.startsWith(year)).reduce((s, r) => s + (r.amount || 0), 0) * 100) / 100,
      yearReservations: reservations.filter(r => r.checkIn.startsWith(year)).length
    });
  }
  json(res, 200, summary);
});

/* ---------- Servidor ---------- */
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost"), requestPath = url.pathname;
  if (requestPath.startsWith("/api/")) {
    const match = routes.map(r => ({ r, m: r.method === req.method && requestPath.match(r.regex) })).find(x => x.m);
    if (!match) return fail(res, 404, "Ruta no encontrada.");
    const { r, m } = match, params = Object.fromEntries(r.keys.map((key, i) => [key, decodeURIComponent(m[i + 1])]));
    let user = null;
    if (r.auth) {
      user = currentUser(req);
      if (!user) return fail(res, 401, "La sesión ha caducado. Vuelve a entrar.");
      if (r.admin && user.role !== "admin") return fail(res, 403, "Solo el administrador puede hacer esto.");
    }
    try { await r.handler(req, res, { user, params }); }
    catch (error) {
      console.error(req.method, requestPath, error.message);
      if (!res.headersSent) fail(res, error.status && error.status < 600 ? error.status : 500, error.message || "Error del servidor.");
    }
    return;
  }
  const pathname = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const file = path.join(root, pathname);
  if (!file.startsWith(root)) return res.writeHead(403).end("Forbidden");
  fs.readFile(file, (error, data) => {
    if (error) {
      // Rutas de la aplicación: siempre la misma página
      if (!path.extname(pathname)) return fs.readFile(path.join(root, "index.html"), (e, html) => { res.writeHead(200, { "Content-Type": types[".html"], "Cache-Control": "no-cache" });res.end(html); });
      return res.writeHead(404).end("Not found");
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache, must-revalidate" });
    res.end(data);
  });
}).listen(process.env.PORT || 3000, () => console.log(`La Calderera escuchando en el puerto ${process.env.PORT || 3000}`));
