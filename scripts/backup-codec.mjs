import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';
import {realpath, stat} from 'node:fs/promises';
import {resolve, relative, isAbsolute, dirname, basename, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const MAGIC = Buffer.from('STYLED-BACKUP-1\n');
export const DEV_REF = 'qkyeitvwscrxbiwamxan';
export const LIVE_REF = 'yfwqcidkfjzpwbylgnug';
export const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const localHosts = ['localhost', '127.0.0.1', '[::1]'];
export function backupKey(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw Error('Set BACKUP_ENCRYPTION_KEY to a private base64-encoded 32-byte key.');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) throw Error('Set BACKUP_ENCRYPTION_KEY to a private base64-encoded 32-byte key.');
  return key;
}
export function encryptBackup(bytes, key) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]);
}
export function decryptBackup(bytes, key) {
  if (!bytes.subarray(0, MAGIC.length).equals(MAGIC) || bytes.length < MAGIC.length + 28) throw Error('Not a Styled encrypted backup.');
  const at = MAGIC.length, decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(at, at + 12));
  decipher.setAuthTag(bytes.subarray(at + 12, at + 28));
  return Buffer.concat([decipher.update(bytes.subarray(at + 28)), decipher.final()]);
}
function databaseURL(value) {
  let u;
  try {
    u = new URL(value || '');
    // Validate encodings before handing decoded fields to libpq.
    for (const part of [u.username, u.password, u.pathname]) if (/[\x00-\x1f\x7f]/.test(decodeURIComponent(part))) throw Error();
  } catch { throw Error('Provide a valid PostgreSQL connection URL.'); }
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || u.search || u.hash || !u.username) throw Error('Use a PostgreSQL URL with an explicit user and no query or fragment.');
  return u;
}
export function devDatabase(value) {
  const u = databaseURL(value);
  if (u.pathname !== '/postgres' || !(u.hostname === `db.${DEV_REF}.supabase.co` || (u.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(u.username) === `postgres.${DEV_REF}`))) throw Error('Only the isolated Styled development database can be backed up with this script.');
  return u;
}
export function localRestoreDatabase(value) {
  const u = databaseURL(value);
  if (!localHosts.includes(u.hostname) || !/^\/styled_restore_[a-z0-9_]+$/.test(u.pathname)) throw Error('Restore is restricted to a fresh local database named styled_restore_*.');
  return u;
}
// Do not inherit libpq routing/service/options/password-file settings or unrelated secrets.
export function toolEnvironment(source = process.env) {
  return Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL'].filter(k => source[k] !== undefined).map(k => [k, source[k]]));
}
export function pgEnvironment(u, source = process.env) {
  return {...toolEnvironment(source), PGHOST: u.hostname.replace(/^\[|\]$/g, ''), PGPORT: u.port || '5432', PGDATABASE: decodeURIComponent(u.pathname.slice(1)), PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password), PGPASSFILE: '/dev/null', PGCONNECT_TIMEOUT: '10', PGSSLMODE: localHosts.includes(u.hostname) ? 'disable' : 'verify-full', PGSSLROOTCERT: source.PGSSLROOTCERT || 'system'};
}
function inside(root, path) {
  const part = relative(root, path);
  return part === '' || (!isAbsolute(part) && part !== '..' && !part.startsWith('../'));
}
// Resolve existing ancestors too, so a not-yet-created child of a symlink is checked.
async function canonical(path) {
  try { return await realpath(path); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    const parent = dirname(path);
    if (parent === path) throw e;
    return join(await canonical(parent), basename(path));
  }
}
export async function privateBackupFolder(value, repository = repositoryRoot) {
  if (!value) throw Error('Choose a private backup folder outside the repository.');
  const folder = await canonical(resolve(value)), root = await realpath(repository);
  if (inside(root, folder)) throw Error('Choose a private backup folder outside the repository.');
  try {
    const info = await stat(folder);
    if (!info.isDirectory() || (info.mode & 0o077) !== 0 || (process.getuid && info.uid !== process.getuid())) throw Error('Backup folder must be an owner-only directory (0700).');
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
  return folder;
}
