// PP · cuenta de demostración para clientes (usuario "Cliente").
// Tiene su propia sesión, separada de la del despacho: con ella no se puede leer ni escribir
// ningún dato real (WebDAV, clientes, chats…), porque las rutas del despacho exigen la sesión
// del equipo. En el navegador solo se abre la vista de cliente con documentos ficticios.
const crypto = require("crypto");

const PASSWORD = process.env.PP_DEMO_PASSWORD || "prueba";
const DEMO_USER = { id: "cliente", name: "Cliente", role: "demo", passwordSet: true };
const COOKIE = "pp_demo_session";
const TTL = 12 * 60 * 60 * 1000;
const sessions = new Map();

function token(req) {
  const item = (req.headers.cookie || "").split(";").map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`));
  return item ? decodeURIComponent(item.slice(COOKIE.length + 1)) : "";
}
function active(req) {
  const key = token(req), expires = sessions.get(key);
  if (!expires) return false;
  if (expires < Date.now()) { sessions.delete(key); return false; }
  return true;
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; if (data.length > 4096) { reject(new Error("too large")); req.destroy(); } });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (error) { reject(error); } });
    req.on("error", reject);
  });
}

// Devuelve true si ha respondido a la petición.
module.exports = function ppDemo(req, res, requestPath) {
  // Si el service worker aún no está activo, el PDF compartido llega aquí: se vuelve a la app con aviso.
  if (requestPath === "/compartir" && req.method === "POST") { req.resume(); res.writeHead(303, { Location: "/#compartido=error" }); res.end(); return true; }
  if (!requestPath.startsWith("/api/")) return false;

  if (requestPath === "/api/pp-demo/login" && req.method === "POST") {
    readBody(req).then(({ password }) => {
      const supplied = Buffer.from(String(password || "")), expected = Buffer.from(PASSWORD);
      if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return send(res, 401, { error: "Usuario o contraseña incorrectos." });
      if (sessions.size > 5000) for (const [key, expires] of sessions) if (expires < Date.now()) sessions.delete(key);
      const key = crypto.randomBytes(32).toString("hex");
      sessions.set(key, Date.now() + TTL);
      send(res, 200, { user: DEMO_USER }, { "Set-Cookie": `${COOKIE}=${key}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${TTL / 1000}` });
    }).catch(() => send(res, 400, { error: "No se pudo iniciar la demostración." }));
    return true;
  }

  const demo = active(req);
  if (requestPath === "/api/auth/status" && req.method === "GET") {
    if (demo) { send(res, 200, { user: DEMO_USER, needsSetup: false, users: [] }); return true; }
    // Sin sesión: se añade "Cliente" a la lista de usuarios de la pantalla de acceso.
    const end = res.end.bind(res);
    res.end = (chunk, ...rest) => {
      try {
        const data = JSON.parse(String(chunk));
        if (!data.user && Array.isArray(data.users)) { data.users.push(DEMO_USER); chunk = JSON.stringify(data); }
      } catch {}
      return end(chunk, ...rest);
    };
    return false;
  }
  if (demo && requestPath === "/api/auth/logout" && req.method === "POST") {
    sessions.delete(token(req));
    send(res, 200, { ok: true }, { "Set-Cookie": `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` });
    return true;
  }
  return false;
};
