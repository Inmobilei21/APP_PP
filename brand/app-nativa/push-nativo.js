// PP · Notificaciones en la app nativa (iPhone y Android, Capacitor).
// Dentro de la app no existen las notificaciones web (VAPID), así que los mismos avisos que manda
// push.js se envían también por los canales nativos:
//   - Android: Firebase Cloud Messaging (API HTTP v1)  → FIREBASE_SERVICE_ACCOUNT (JSON de la cuenta de servicio)
//   - iPhone:  Apple Push Notification service (HTTP/2) → APNS_KEY (.p8), APNS_KEY_ID, APNS_TEAM_ID
//                                                          APNS_BUNDLE_ID (por defecto es.propymesasesores.app)
//                                                          APNS_SANDBOX=1 para apps instaladas desde Xcode
// Sin esas variables no envía nada (y no falla). Los dispositivos van en DATA_DIR/push-nativo.json y las
// preferencias por tipo son las mismas de push.json («Mi cuenta → Notificaciones»).
const crypto = require("crypto");
const fs = require("fs");
const http2 = require("http2");
const https = require("https");
const path = require("path");

module.exports = function ({ dataDirectory, json, readJson, requireUser }, TYPES) {
  const file = path.join(dataDirectory, "push-nativo.json"), prefsFile = path.join(dataDirectory, "push.json");
  const load = () => { try { const data = JSON.parse(fs.readFileSync(file, "utf8")); return Array.isArray(data.devices) ? data : { devices: [] }; } catch { return { devices: [] }; } };
  const save = data => { fs.mkdirSync(dataDirectory, { recursive: true }); fs.writeFileSync(file, JSON.stringify(data)); };
  const prefsOf = userId => { try { return { ...(JSON.parse(fs.readFileSync(prefsFile, "utf8")).prefs || {})[userId] }; } catch { return {}; } };
  const forget = tokens => { if (!tokens.length) return; const data = load(); data.devices = data.devices.filter(d => !tokens.includes(d.token)); save(data); };
  const b64url = value => Buffer.from(value).toString("base64url");

  // ---------------------------------------------------------------- Android · FCM HTTP v1
  let fcm = null;
  try { fcm = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null; } catch { console.error("FIREBASE_SERVICE_ACCOUNT no es un JSON válido"); }
  let fcmToken = { value: "", expires: 0 };
  function post(url, body, headers) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, { method: "POST", headers: { "Content-Length": Buffer.byteLength(body), ...headers }, timeout: 15000 }, res => {
        let data = ""; res.on("data", chunk => { data += chunk; }); res.on("end", () => resolve({ status: res.statusCode, body: data }));
      });
      req.on("error", reject); req.on("timeout", () => req.destroy(new Error("timeout"))); req.end(body);
    });
  }
  async function fcmAccess() {
    if (fcmToken.value && fcmToken.expires > Date.now() + 60000) return fcmToken.value;
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({ iss: fcm.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }))}`;
    const jwt = `${unsigned}.${crypto.sign("RSA-SHA256", Buffer.from(unsigned), fcm.private_key).toString("base64url")}`;
    const res = await post("https://oauth2.googleapis.com/token", new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }).toString(), { "Content-Type": "application/x-www-form-urlencoded" });
    const data = JSON.parse(res.body || "{}");
    if (!data.access_token) throw new Error(`FCM token ${res.status}`);
    fcmToken = { value: data.access_token, expires: Date.now() + (data.expires_in || 3600) * 1000 };
    return fcmToken.value;
  }
  async function sendAndroid(device, note) {
    const access = await fcmAccess();
    const body = JSON.stringify({ message: { token: device.token, notification: { title: note.title, body: note.body },
      data: { url: note.url, type: note.type }, android: { priority: "HIGH", notification: { tag: note.tag, sound: "default" } } } });
    const res = await post(`https://fcm.googleapis.com/v1/projects/${fcm.project_id}/messages:send`, body, { "Content-Type": "application/json", Authorization: `Bearer ${access}` });
    if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(res.body)) return "gone";
    if (res.status >= 300) throw new Error(`FCM ${res.status}`);
  }

  // ---------------------------------------------------------------- iPhone · APNs
  const apns = process.env.APNS_KEY && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID
    ? { key: process.env.APNS_KEY.replace(/\\n/g, "\n"), keyId: process.env.APNS_KEY_ID, teamId: process.env.APNS_TEAM_ID,
        topic: process.env.APNS_BUNDLE_ID || "es.propymesasesores.app", host: process.env.APNS_SANDBOX === "1" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com" }
    : null;
  let apnsJwt = { value: "", at: 0 };
  function apnsToken() {
    if (apnsJwt.value && Date.now() - apnsJwt.at < 40 * 60 * 1000) return apnsJwt.value;   // Apple pide renovarlo cada <60 min
    const unsigned = `${b64url(JSON.stringify({ alg: "ES256", kid: apns.keyId }))}.${b64url(JSON.stringify({ iss: apns.teamId, iat: Math.floor(Date.now() / 1000) }))}`;
    const signature = crypto.sign("SHA256", Buffer.from(unsigned), { key: apns.key, dsaEncoding: "ieee-p1363" }).toString("base64url");
    apnsJwt = { value: `${unsigned}.${signature}`, at: Date.now() };
    return apnsJwt.value;
  }
  function sendIos(device, note) {
    return new Promise((resolve, reject) => {
      const client = http2.connect(apns.host);
      client.on("error", reject);
      const body = JSON.stringify({ aps: { alert: { title: note.title, body: note.body }, sound: "default", "thread-id": note.tag }, url: note.url, type: note.type });
      const req = client.request({ ":method": "POST", ":path": `/3/device/${device.token}`, authorization: `bearer ${apnsToken()}`,
        "apns-topic": apns.topic, "apns-push-type": "alert", "apns-priority": "10", "apns-collapse-id": String(note.tag).slice(0, 64), "content-type": "application/json" });
      let status = 0, data = "";
      req.on("response", headers => { status = headers[":status"]; });
      req.on("data", chunk => { data += chunk; });
      req.on("end", () => { client.close(); if (status === 410 || /BadDeviceToken|Unregistered/.test(data)) resolve("gone"); else if (status >= 300) reject(new Error(`APNs ${status} ${data}`)); else resolve(); });
      req.on("error", error => { client.close(); reject(error); });
      req.setTimeout(15000, () => req.close(http2.constants.NGHTTP2_CANCEL));
      req.end(body);
    });
  }

  // Mismo contrato que push.notify. Nunca lanza errores.
  function notify(userIds, type, { title, body, url = "/", tag } = {}) {
    try {
      if (!fcm && !apns) return;
      const ids = new Set([].concat(userIds).filter(Boolean));
      const targets = load().devices.filter(d => ids.has(d.userId) && prefsOf(d.userId)[type] !== false && (d.platform === "ios" ? apns : fcm));
      if (!targets.length) return;
      const note = { title: String(title || "Aviso").slice(0, 120), body: String(body || "").slice(0, 300), url, tag: tag || type, type };
      Promise.all(targets.map(d => (d.platform === "ios" ? sendIos(d, note) : sendAndroid(d, note))
        .then(result => (result === "gone" ? d.token : null))
        .catch(error => { console.error("Notificación nativa:", error.message); return null; })))
        .then(gone => forget(gone.filter(Boolean)));
    } catch (error) { console.error("Notificación nativa:", error.message); }
  }

  // POST /api/push/nativo        { token, platform: "ios" | "android" }   alta o renovación del dispositivo
  // POST /api/push/nativo/baja   { token }
  // GET  /api/push/nativo?token=  ¿está dado de alta este dispositivo?
  function handle(req, res, requestPath) {
    if (requestPath !== "/api/push/nativo" && requestPath !== "/api/push/nativo/baja") return false;
    const user = requireUser(req, res); if (!user) return true;
    if (requestPath === "/api/push/nativo" && req.method === "GET") {
      const token = new URL(req.url, "http://x").searchParams.get("token") || "";
      json(res, 200, { registered: load().devices.some(d => d.token === token && d.userId === user.id), types: TYPES, prefs: { ...Object.fromEntries(Object.keys(TYPES).map(t => [t, true])), ...prefsOf(user.id) },
        configured: { android: Boolean(fcm), ios: Boolean(apns) } });
      return true;
    }
    readJson(req, 8 * 1024).then(({ token, platform }) => {
      token = String(token || "").trim();
      if (!/^[\w:.\-]{20,4096}$/.test(token)) return json(res, 400, { error: "Dispositivo no válido." });
      const data = load(); data.devices = data.devices.filter(d => d.token !== token);
      if (requestPath === "/api/push/nativo") {
        data.devices.push({ userId: user.id, token, platform: platform === "ios" ? "ios" : "android", createdAt: new Date().toISOString() });
        save(data); return json(res, 200, { registered: true });
      }
      save(data); return json(res, 200, { registered: false });
    }).catch(() => json(res, 400, { error: "No se pudo guardar el dispositivo." }));
    return true;
  }
  return { notify, handle };
};
