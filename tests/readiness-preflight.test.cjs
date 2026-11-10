const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const codec = import('../scripts/backup-codec.mjs');
const preflight = import('../scripts/readiness-preflight.mjs');
const dev = 'qkyeitvwscrxbiwamxan', live = 'yfwqcidkfjzpwbylgnug';
const configured = () => ({NEXT_PUBLIC_SUPABASE_URL: `https://${dev}.supabase.co`, NEXT_PUBLIC_SITE_URL: 'https://styledukprodprogress.vercel.app', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'PRIVATE-PUBLIC-KEY-SENTINEL', SUPABASE_SERVICE_ROLE_KEY: 'PRIVATE-SERVICE-SENTINEL', STYLED_DEV_DATABASE_URL: `postgresql://postgres:PRIVATE-PASSWORD@db.${dev}.supabase.co/postgres`, BACKUP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'), STYLED_LOCAL_RESTORE_URL: 'postgresql://postgres:PRIVATE-RESTORE@127.0.0.1/styled_restore_test', ENABLE_BOOKING_EMAILS: 'false'});
const absent = () => { const e = Error('PRIVATE-FILE-ERROR'); e.code = 'ENOENT'; throw e; };
function runner(calls = [], dirty = false) {
  return (cmd, args, options) => {
    calls.push({cmd, args, options});
    if (args.includes('--version')) return {status: 0, stdout: 'fixture version'};
    if (args.includes('remote')) return {status: 0, stdout: 'git@github.com:danieldhesiii/styledukprodprogress.git\n'};
    if (args.includes('branch')) return {status: 0, stdout: 'main\n'};
    if (args.includes('status')) return {status: 0, stdout: dirty ? '?? PRIVATE-FILENAME\n' : ''};
    throw Error('Unexpected command');
  };
}
const check = (r, id) => r.checks.find(c => c.id === id).status;

test('keyless preflight is read-only, reports missing separately and never invents recovery proof', async () => {
  const {runPreflight, formatPreflight} = await preflight, calls = [];
  const report = runPreflight({env: {}, read: absent, run: runner(calls)});
  assert.equal(report.exitCode, 1);
  assert.equal(check(report, 'environment-isolation'), 'missing');
  assert.equal(check(report, 'BACKUP_ENCRYPTION_KEY'), 'missing');
  assert.equal(check(report, 'git-clean'), 'verified');
  assert.equal(check(report, 'backup-restore-evidence'), 'unverified');
  assert.equal(calls.length, 8);
  for (const call of calls) {
    assert.ok(call.args.includes('--version') || call.cmd === 'git');
    assert.ok(!call.args.some(a => a.includes('postgresql:')));
    assert.deepEqual(call.options.env, {});
  }
  assert.doesNotMatch(formatPreflight(report), /PRIVATE-/);
});

test('configured preflight verifies presence and isolation but still cannot certify backup or release', async () => {
  const {runPreflight, formatPreflight} = await preflight, env = {...configured(), RESEND_API_KEY: 'PRIVATE-MAIL', PGHOSTADDR: 'PRIVATE-OVERRIDE'};
  const calls = [], report = runPreflight({env, read: absent, run: runner(calls, true)});
  assert.equal(check(report, 'environment-isolation'), 'verified');
  assert.equal(check(report, 'BACKUP_ENCRYPTION_KEY'), 'verified');
  assert.equal(check(report, 'git-clean'), 'missing');
  assert.equal(check(report, 'libpq-overrides'), 'refused');
  assert.equal(report.exitCode, 2);
  assert.doesNotMatch(formatPreflight(report), /PRIVATE-|postgresql:|qkyeit/);
  for (const call of calls) assert.equal(call.options.env.RESEND_API_KEY, undefined);
  const safe = runPreflight({env: configured(), read: absent, run: runner()});
  assert.equal(safe.exitCode, 1);
});

test('refuses live, disguised, unknown and dynamic targets, even when overridden by safe process values', async () => {
  const {runPreflight} = await preflight;
  const values = [
    ['NEXT_PUBLIC_SUPABASE_URL', `https://${live}.supabase.co`],
    ['NEXT_PUBLIC_SITE_URL', 'https://styleduk.com'],
    ['NEXT_PUBLIC_SITE_URL', 'https://styleduk.com.evil.test'],
    ['NEXT_PUBLIC_SUPABASE_URL', `https://${dev}.supabase.co.evil.test`],
    ['NEXT_PUBLIC_SUPABASE_URL', '${PRIVATE_TARGET}'],
    ['DATABASE_URL', `postgresql://postgres.${live}:x@aws-0-eu.pooler.supabase.com/postgres`],
    ['STYLED_LOCAL_RESTORE_URL', 'postgresql://postgres:x@remote.test/styled_restore_test'],
  ];
  for (const [key, value] of values) {
    const report = runPreflight({env: configured(), read: file => file.endsWith('/.env.local') ? `${key}=${value}\n` : absent(), run: runner()});
    assert.equal(check(report, 'environment-isolation'), 'refused', key);
    assert.equal(report.exitCode, 2);
  }
});

test('missing tools, unreadable env, dirty tree, non-dev origin and malformed keys fail closed without diagnostic leaks', async () => {
  const {runPreflight, formatPreflight} = await preflight;
  const env = {...configured(), BACKUP_ENCRYPTION_KEY: 'PRIVATE-MALFORMED', ENABLE_BOOKING_EMAILS: 'true'};
  const report = runPreflight({env, read: () => {throw Error('PRIVATE-READ-ERROR');}, run: (cmd, args) => args.includes('remote') ? {status: 0, stdout: 'https://PRIVATE-TOKEN@github.com/danieldhesiii/styled-landing.git'} : {status: 1, stderr: 'PRIVATE-TOOL-ERROR'}});
  assert.equal(report.exitCode, 2);
  for (const id of ['git-origin', 'BACKUP_ENCRYPTION_KEY', 'automatic-email', 'environment-files']) assert.equal(check(report, id), 'refused');
  assert.equal(check(report, 'tool:pg_dump'), 'missing');
  assert.equal(check(report, 'git-clean'), 'missing');
  assert.doesNotMatch(formatPreflight(report), /PRIVATE-/);
});

test('dotenv parser is literal and refuses multiline/duplicate ambiguity', async () => {
  const {parseEnvironment} = await preflight;
  const env = parseEnvironment('# comment\nexport A="literal # value" # tail\nB=x # tail\nC=\'$(touch never)\'\n');
  assert.equal(env.A, 'literal # value'); assert.equal(env.B, 'x'); assert.equal(env.C, '$(touch never)');
  assert.throws(() => parseEnvironment('A=x\nA=y'));
  assert.throws(() => parseEnvironment('KEY="two\nlines"'));
});

test('codec rejects malformed keys and authenticated archive damage/wrong keys/truncation', async () => {
  const lib = await codec, key = Buffer.alloc(32, 4), plain = Buffer.from('fictional fixture');
  assert.deepEqual(lib.backupKey(key.toString('base64')), key);
  for (const value of ['', key.toString('base64') + 'garbage', ' '.repeat(44), key.toString('base64').slice(0, -1)]) assert.throws(() => lib.backupKey(value));
  const archive = lib.encryptBackup(plain, key);
  assert.deepEqual(lib.decryptBackup(archive, key), plain);
  assert.notDeepEqual(lib.encryptBackup(plain, key), archive);
  assert.throws(() => lib.decryptBackup(archive, Buffer.alloc(32, 5)));
  for (const offset of [0, 16, 28, archive.length - 1]) {const changed = Buffer.from(archive); changed[offset] ^= 1; assert.throws(() => lib.decryptBackup(changed, key));}
  assert.throws(() => lib.decryptBackup(archive.subarray(0, 20), key));
});

test('destination guards reject query routing, encoding tricks, live sources and non-local restores', async () => {
  const lib = await codec;
  assert.equal(lib.devDatabase(configured().STYLED_DEV_DATABASE_URL).hostname, `db.${dev}.supabase.co`);
  assert.equal(lib.devDatabase(`postgresql://postgres.${dev}:x@aws-0-eu.pooler.supabase.com/postgres`).pathname, '/postgres');
  for (const url of [
    `postgresql://postgres:x@db.${live}.supabase.co/postgres`,
    `postgresql://postgres.${live}:x@aws-0-eu.pooler.supabase.com/postgres`,
    configured().STYLED_DEV_DATABASE_URL + '?host=live.test',
    configured().STYLED_DEV_DATABASE_URL + '#private',
    `postgresql://postgres:%00@db.${dev}.supabase.co/postgres`,
    `postgresql://postgres:%ZZ@db.${dev}.supabase.co/postgres`,
    `postgresql://postgres:x@db.${dev}.supabase.co/other`,
  ]) assert.throws(() => lib.devDatabase(url));
  for (const url of ['postgresql://postgres:x@localhost/postgres', 'postgresql://postgres:x@remote.test/styled_restore_test', 'postgresql://postgres:x@localhost/styled_restore_test?host=remote', 'postgresql://postgres:x@localhost/styled_restore_%74est']) assert.throws(() => lib.localRestoreDatabase(url));
  const ipv6 = lib.localRestoreDatabase('postgresql://postgres:x@[::1]/styled_restore_test');
  const env = lib.pgEnvironment(ipv6, {PATH: '/test', PGHOSTADDR: 'live', PGSERVICE: 'live', PGOPTIONS: '-c unsafe', PGSSLMODE: 'disable', SUPABASE_SERVICE_ROLE_KEY: 'PRIVATE', PGPASSFILE: '/private/passwords'});
  assert.equal(env.PGHOST, '::1'); assert.equal(env.PGPASSFILE, '/dev/null');
  for (const key of ['PGHOSTADDR', 'PGSERVICE', 'PGOPTIONS', 'SUPABASE_SERVICE_ROLE_KEY']) assert.equal(env[key], undefined);
  assert.equal(lib.pgEnvironment(lib.devDatabase(configured().STYLED_DEV_DATABASE_URL), {}).PGSSLMODE, 'verify-full');
});

test('private backup paths enforce canonical boundaries and existing directory confidentiality', async t => {
  const lib = await codec, temp = fs.mkdtempSync(path.join(os.tmpdir(), 'styled-path-'));
  t.after(() => fs.rmSync(temp, {recursive: true, force: true}));
  const repo = path.join(temp, 'repo'); fs.mkdirSync(repo, {mode: 0o700});
  const link = path.join(temp, 'alias'); fs.symlinkSync(repo, link);
  for (const folder of ['', repo, path.join(repo, 'child'), link, path.join(link, 'new', 'child')]) await assert.rejects(lib.privateBackupFolder(folder, repo));
  const publicDir = path.join(temp, 'public'); fs.mkdirSync(publicDir); fs.chmodSync(publicDir, 0o755);
  await assert.rejects(lib.privateBackupFolder(publicDir, repo));
  const privateDir = path.join(temp, 'private'); fs.mkdirSync(privateDir, {mode: 0o700});
  assert.equal(await lib.privateBackupFolder(privateDir, repo), fs.realpathSync(privateDir));
  assert.equal(await lib.privateBackupFolder(path.join(temp, 'repo-sibling'), repo), path.join(fs.realpathSync(temp), 'repo-sibling'));
});

test('real backup/restore CLIs reject unsafe inputs before invoking any database tool; never echo input or fs errors', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'styled-cli-')); t.after(() => fs.rmSync(temp, {recursive: true, force: true}));
  const marker = path.join(temp, 'called');
  for (const tool of ['pg_dump', 'psql', 'pg_restore']) {const file = path.join(temp, tool); fs.writeFileSync(file, `#!/bin/sh\ntouch '${marker}'\nexit 9\n`, {mode: 0o700});}
  const env = {...configured(), PATH: temp};
  const cases = [
    ['backup-development.mjs', temp, {...env, STYLED_DEV_DATABASE_URL: `postgresql://postgres:PRIVATE@db.${live}.supabase.co/postgres`}],
    ['backup-development.mjs', root, env],
    ['restore-development-backup.mjs', 'PRIVATE-PATH', {...env, ALLOW_LOCAL_RESTORE: 'yes', STYLED_LOCAL_RESTORE_URL: 'postgresql://postgres:PRIVATE@remote.test/styled_restore_test'}],
    ['restore-development-backup.mjs', 'PRIVATE-PATH', {...env, ALLOW_LOCAL_RESTORE: 'yes'}],
    ['restore-development-backup.mjs', 'PRIVATE-PATH', env],
  ];
  for (const [file, arg, childEnv] of cases) {
    const result = spawnSync(process.execPath, [path.join(root, 'scripts', file), arg], {env: childEnv, encoding: 'utf8'});
    assert.equal(result.status, 1); assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE|postgresql:|ENOENT/);
  }
  assert.equal(fs.existsSync(marker), false);
});

test('preflight rejects live deployment links and live push URLs independently of safe fetch origin', async () => {
  const {runPreflight} = await preflight;
  const report = runPreflight({env: configured(), read: file => {
    if (file.endsWith('/.vercel/project.json')) return JSON.stringify({projectName: 'styled-landing'});
    if (file.endsWith('/supabase/.temp/project-ref')) return live;
    return absent();
  }, run: (cmd, args, options) => args.includes('--push') ? {status: 0, stdout: 'git@github.com:danieldhesiii/styled-landing.git'} : runner()(cmd, args, options)});
  for (const id of ['vercel-link', 'supabase-link', 'git-push-origin']) assert.equal(check(report, id), 'refused');
  assert.equal(check(report, 'git-origin'), 'verified');
});

test('fixture-only CLI round trip writes private ciphertext and restores atomically with no routing overrides', async t => {
  const lib = await codec, temp = fs.mkdtempSync(path.join(os.tmpdir(), 'styled-roundtrip-'));
  t.after(() => fs.rmSync(temp, {recursive: true, force: true}));
  const bin = path.join(temp, 'bin'); fs.mkdirSync(bin, {mode: 0o700});
  const log = path.join(temp, 'log'), plain = 'FICTIONAL DATABASE ARCHIVE ONLY';
  for (const tool of ['pg_dump', 'psql', 'pg_restore']) {
    const file = path.join(bin, tool);
    fs.writeFileSync(file, `#!${process.execPath}\nconst fs=require('node:fs');\nconst env=process.env;\nif(env.PGHOSTADDR||env.PGSERVICE||env.PGOPTIONS||env.SUPABASE_SERVICE_ROLE_KEY) process.exit(8);\nfs.appendFileSync(${JSON.stringify(log)},${JSON.stringify(tool)}+' '+JSON.stringify(process.argv.slice(2))+'\\n');\n` + (tool === 'pg_dump' ? `process.stdout.write(${JSON.stringify(plain)});` : tool === 'psql' ? "process.stdout.write('0\\n');" : `if(fs.readFileSync(0,'utf8')!==${JSON.stringify(plain)})process.exit(9);`), {mode: 0o700});
  }
  const env = {...configured(), PATH: bin, PGHOSTADDR: 'LIVE-OVERRIDE', PGSERVICE: 'LIVE-SERVICE', PGOPTIONS: 'UNSAFE'};
  const folder = path.join(temp, 'archives');
  const backup = spawnSync(process.execPath, [path.join(root, 'scripts/backup-development.mjs'), folder], {env, encoding: 'utf8'});
  assert.equal(backup.status, 0, backup.stderr);
  assert.equal(fs.statSync(folder).mode & 0o777, 0o700);
  const archive = path.join(folder, fs.readdirSync(folder)[0]);
  assert.equal(fs.statSync(archive).mode & 0o777, 0o600);
  const ciphertext = fs.readFileSync(archive);
  assert.equal(ciphertext.includes(Buffer.from(plain)), false);
  assert.equal(lib.decryptBackup(ciphertext, lib.backupKey(env.BACKUP_ENCRYPTION_KEY)).toString(), plain);
  const restore = spawnSync(process.execPath, [path.join(root, 'scripts/restore-development-backup.mjs'), archive], {env: {...env, ALLOW_LOCAL_RESTORE: 'yes'}, encoding: 'utf8'});
  assert.equal(restore.status, 0, restore.stderr);
  assert.match(fs.readFileSync(log, 'utf8'), /pg_restore.*--single-transaction/);
  assert.doesNotMatch(backup.stdout + backup.stderr + restore.stdout + restore.stderr, /PRIVATE-|FICTIONAL|postgresql:/);
  // Nonempty and corrupt fixture cases must never invoke pg_restore.
  fs.writeFileSync(path.join(bin, 'psql'), `#!${process.execPath}\nprocess.stdout.write('1\\n');`, {mode: 0o700});
  fs.writeFileSync(log, '');
  const nonempty = spawnSync(process.execPath, [path.join(root, 'scripts/restore-development-backup.mjs'), archive], {env: {...env, ALLOW_LOCAL_RESTORE: 'yes'}, encoding: 'utf8'});
  assert.equal(nonempty.status, 1); assert.equal(fs.readFileSync(log, 'utf8'), '');
  fs.writeFileSync(archive, 'corrupt fixture');
  fs.writeFileSync(path.join(bin, 'psql'), `#!${process.execPath}\nrequire('node:fs').appendFileSync(${JSON.stringify(log)},'called');`, {mode: 0o700});
  const corrupt = spawnSync(process.execPath, [path.join(root, 'scripts/restore-development-backup.mjs'), archive], {env: {...env, ALLOW_LOCAL_RESTORE: 'yes'}, encoding: 'utf8'});
  assert.equal(corrupt.status, 1); assert.equal(fs.readFileSync(log, 'utf8'), '');
});
