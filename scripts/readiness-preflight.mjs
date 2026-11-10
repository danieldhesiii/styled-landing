import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {DEV_REF, LIVE_REF, repositoryRoot, backupKey, devDatabase, localRestoreDatabase, toolEnvironment} from './backup-codec.mjs';

const ENV_FILES = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local'];
const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'STYLED_DEV_DATABASE_URL', 'BACKUP_ENCRYPTION_KEY', 'STYLED_LOCAL_RESTORE_URL'];
const TARGETS = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SITE_URL', 'SITE_URL', 'STYLED_DEV_DATABASE_URL', 'DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL', 'STYLED_LOCAL_RESTORE_URL'];
const unset = value => !value || /<|>|\.\.\.|\$\{|\$\(/.test(value) || /^(?:your[-_]|replace[-_]|changeme)/i.test(value);

// Parse only literal dotenv assignments. Never source a file or expand variables.
export function parseEnvironment(text) {
  const result = Object.create(null);
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) throw Error('Unsupported environment syntax.');
    let value = match[2];
    if (value.startsWith('"') || value.startsWith("'")) {
      const quoted = value.match(/^(["'])(.*?)\1\s*(?:#.*)?$/);
      if (!quoted) throw Error('Unsupported environment syntax.');
      value = quoted[2];
    } else value = value.replace(/\s+#.*$/, '').trim();
    // Preserve every duplicate for isolation checks, rather than silently hiding one.
    if (Object.hasOwn(result, match[1]) && result[match[1]] !== value) throw Error('Conflicting environment assignments.');
    result[match[1]] = value;
  }
  return result;
}
function isolated(name, value) {
  if (value.includes(LIVE_REF)) return false;
  if (['STYLED_DEV_DATABASE_URL', 'DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL'].includes(name)) { devDatabase(value); return true; }
  if (name === 'STYLED_LOCAL_RESTORE_URL') { localRestoreDatabase(value); return true; }
  const u = new URL(value);
  if (u.username || u.password || u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) return false;
  if (name.includes('SUPABASE')) return u.protocol === 'https:' && u.host === `${DEV_REF}.supabase.co`;
  return (u.protocol === 'https:' && u.host === 'styledukprodprogress.vercel.app') || (['http:', 'https:'].includes(u.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname));
}
export function runPreflight({root = repositoryRoot, env = process.env, read = readFileSync, run = spawnSync} = {}) {
  const checks = [];
  const add = (id, status, detail) => checks.push({id, status, detail});
  const layers = [];
  for (const file of ENV_FILES) {
    try { layers.push(parseEnvironment(read(resolve(root, file), 'utf8'))); }
    catch (error) { if (error.code !== 'ENOENT') add('environment-files', 'refused', 'An environment file is unreadable or has unsupported/conflicting syntax; contents withheld.'); }
  }
  layers.push(env);
  const effective = Object.assign(Object.create(null), ...layers);
  let isolationRefused = false, targetSeen = false;
  for (const layer of layers) for (const name of TARGETS) {
    const value = layer[name];
    if (!value) continue;
    if (/[<>]|\$/.test(value)) {
      // Template placeholders remain missing, but dynamic/live targets fail closed.
      if (value.includes(LIVE_REF) || /styleduk\.com/i.test(value) || /\$/.test(value)) isolationRefused = true;
      continue;
    }
    targetSeen = true;
    try { if (!isolated(name, value)) isolationRefused = true; } catch { isolationRefused = true; }
  }
  add('environment-isolation', isolationRefused ? 'refused' : targetSeen ? 'verified' : 'missing', isolationRefused ? 'A configured target is live, unknown, dynamic or outside the development/local allowlist; values withheld.' : targetSeen ? 'Every configured literal target matches the development/local allowlist; no connection attempted.' : 'No concrete target is configured.');
  for (const name of REQUIRED) {
    const value = effective[name];
    let status = unset(value) ? 'missing' : 'verified';
    if (status === 'verified' && name === 'BACKUP_ENCRYPTION_KEY') { try { backupKey(value); } catch { status = 'refused'; } }
    add(name, status, status === 'verified' ? 'Present locally; format checked where applicable, credentials not authenticated.' : status === 'missing' ? 'Absent or placeholder; configure privately when needed.' : 'Invalid key encoding; value withheld.');
  }
  add('automatic-email', effective.ENABLE_BOOKING_EMAILS === 'true' ? 'refused' : !effective.ENABLE_BOOKING_EMAILS || effective.ENABLE_BOOKING_EMAILS === 'false' ? 'verified' : 'refused', 'Safe local preparation requires automatic booking emails off.');
  if (env.PGHOSTADDR || env.PGSERVICE || env.PGSERVICEFILE || env.PGOPTIONS) add('libpq-overrides', 'refused', 'Ambient libpq routing/service/options settings detected. Backup scripts discard these; clear them before release review.');
  for (const [id, file, expected, parse] of [
    ['vercel-link', '.vercel/project.json', 'styledukprodprogress', text => JSON.parse(text).projectName],
    ['supabase-link', 'supabase/.temp/project-ref', DEV_REF, text => text.trim()],
  ]) {
    try {
      const target = parse(read(resolve(root, file), 'utf8'));
      add(id, !target ? 'missing' : target === expected ? 'verified' : 'refused', 'Local project link must identify development; absent names/links require private verification.');
    } catch (error) {
      add(id, error.code === 'ENOENT' ? 'missing' : 'refused', 'Local project link is absent or unreadable; no hosted lookup attempted.');
    }
  }
  const childEnv = toolEnvironment(env);
  const execute = (command, args) => {
    try { return run(command, args, {cwd: root, env: childEnv, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024, windowsHide: true}); }
    catch { return {status: null}; }
  };
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  add('node', nodeMajor >= 20 ? 'verified' : 'refused', 'Local tooling requires Node.js 20 or later.');
  for (const tool of ['git', 'pg_dump', 'pg_restore', 'psql']) {
    const result = execute(tool, ['--version']);
    add(`tool:${tool}`, result.status === 0 && !result.error ? 'verified' : 'missing', 'Availability probe only; server/client compatibility and database access are unverified.');
  }
  const git = args => execute('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', ...args]);
  for (const push of [false, true]) {
    const origin = git(['remote', 'get-url', ...(push ? ['--push'] : []), '--all', 'origin']);
    const urls = String(origin.stdout || '').trim().split(/\r?\n/);
    const originOK = origin.status === 0 && urls.every(url => /^(?:git@github\.com:|https:\/\/github\.com\/)danieldhesiii\/styledukprodprogress(?:\.git)?$/.test(url));
    add(push ? 'git-push-origin' : 'git-origin', originOK ? 'verified' : origin.status === 0 ? 'refused' : 'missing', 'All origin URLs must identify the documented development repository; values withheld.');
  }
  const branch = git(['branch', '--show-current']);
  add('git-branch', branch.status === 0 && String(branch.stdout).trim() === 'main' ? 'verified' : 'missing', 'Review the development main branch before preparing a release.');
  const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
  add('git-clean', status.status === 0 && !status.error && !String(status.stdout).trim() ? 'verified' : 'missing', 'Tracked changes and untracked files must be reviewed; filenames withheld.');
  for (const [id, detail] of [
    ['backup-restore-evidence', 'No database export/restore performed. Require a dated authenticated archive, isolated restore, schema/row counts and roles/extensions checks.'],
    ['storage-recovery', 'Database dumps exclude Storage bytes. Require separate private file backup and recovery verification.'],
    ['hosted-readiness', 'Hosted settings, actual delivery, provider approval, business permissions and live schema compatibility are not checked.'],
    ['client-server-compatibility', 'Compare PostgreSQL client versions to the actual development server and verify TLS trust privately before export.'],
  ]) add(id, 'unverified', detail);
  return {scope: 'development-only local inspection; no release approval', checks, exitCode: checks.some(c => c.status === 'refused') ? 2 : checks.some(c => c.status === 'missing' || c.status === 'unverified') ? 1 : 0};
}
export function formatPreflight(report) {
  return ['Development local preflight — read-only; no DB/network calls or secret values.', ...report.checks.map(c => `[${c.status.toUpperCase()}] ${c.id}: ${c.detail}`), 'This report is not backup proof or permission to deploy. Exit 1 = incomplete/unverified; exit 2 = refused/unsafe.'].join('\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) { console.error('Usage: node scripts/readiness-preflight.mjs (no arguments; values are never echoed)'); process.exitCode = 2; }
  else {
    try { const report = runPreflight(); console.log(formatPreflight(report)); process.exitCode = report.exitCode; }
    catch { console.error('Local preflight failed; diagnostic values withheld.'); process.exitCode = 2; }
  }
}
