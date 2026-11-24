// ===== Planner Revalle · API no Supabase (Edge Function "api") =====
// Gerado por supabase/build-api.py: este arquivo junta (1) esta camada de adaptação, (2) o apps-script/Code.gs sem mudanças
// e (3) as ações novas. As abas da planilha viram tabelas e os arquivos do Drive viram o bucket privado "dados".
import { createClient } from 'npm:@supabase/supabase-js@2';
function chave_() {
  const k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (k) return k;
  const s = Deno.env.get('SUPABASE_SECRET_KEYS') || ''; try { const j = JSON.parse(s); return typeof j === 'string' ? j : (j.default || Object.values(j)[0]); } catch (e) { return s; }
}
const SB = createClient(Deno.env.get('SUPABASE_URL'), chave_(), { auth: { persistSession: false } });
const BUCKET = 'dados';
const TAB = { Usuarios: ['usuarios', ['email']], Sessoes: ['sessoes', ['token']], Equipes: ['equipes', ['unb', 'setor']], Links: ['links', ['token']],
  Arquivos: ['arquivos', ['nome']], Notas: ['notas', ['id']], SnsVinculo: ['sns_vinculo', ['sns_email']], PedidosSNS: ['pedidos_sns', ['id']], Log: ['log', null] };
let DB = {}, CHG = [], FILES = {}, WRITES = [], MAILS = [];

// ---- SHA-256 síncrono (mesmo resultado do Utilities.computeDigest do Apps Script, para as senhas continuarem valendo)
function sha256(bytes) {
  const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n); m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
  const w = new Uint32Array(64);
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3), s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)), mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32), ov = new DataView(out.buffer); H.forEach((x, i) => ov.setUint32(i * 4, x)); return out;
}
const TE = new TextEncoder();
const Utilities = {
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  computeDigest: (_alg, s) => sha256(TE.encode(String(s))),
  base64Encode: (b) => { let s = ''; for (const x of b) s += String.fromCharCode(x & 255); return btoa(s); },
  getUuid: () => crypto.randomUUID()
};
const LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
const CacheService = { getScriptCache: () => ({ get: () => null, put() {} }) };
const MailApp = { sendEmail(o) { if (!Deno.env.get('RESEND_API_KEY')) throw new Error('envio de e-mail ainda não configurado'); MAILS.push(o); } };
const Session = { getEffectiveUser: () => ({ getEmail: () => '' }) };
const PropertiesService = { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) };
