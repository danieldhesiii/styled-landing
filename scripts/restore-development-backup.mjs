import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {backupKey, localRestoreDatabase, pgEnvironment, decryptBackup} from './backup-codec.mjs';
try {
  if (process.argv.length !== 3 || process.env.ALLOW_LOCAL_RESTORE !== 'yes') throw Error();
  const database = localRestoreDatabase(process.env.STYLED_LOCAL_RESTORE_URL), env = pgEnvironment(database);
  // Authenticate the archive before touching the target.
  const archive = decryptBackup(await readFile(process.argv[2]), backupKey(process.env.BACKUP_ENCRYPTION_KEY));
  const empty = spawnSync('psql', ['--no-password', '-X', '-A', '-t', '-c', "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p','v','m','S','f') and n.nspname not like 'pg_%' and n.nspname<>'information_schema'"], {env, timeout: 10000, maxBuffer: 1024 * 1024});
  if (empty.error || empty.status !== 0 || empty.stdout.toString().trim() !== '0') throw Error();
  const result = spawnSync('pg_restore', ['--no-password', '--single-transaction', '--exit-on-error', '--no-owner', '--no-acl', '--dbname', env.PGDATABASE], {env, input: archive, timeout: 120000, maxBuffer: 4 * 1024 * 1024});
  if (result.error || result.status !== 0) throw Error();
  console.log('Archive restored into the isolated local database. Verify row counts, schema, roles/extensions and separately restored Storage files before recording backup evidence.');
} catch {
  console.error('Local restore refused or failed. Check the authenticated archive, key, explicit consent, empty local styled_restore_* target and PostgreSQL tools. No verified restore is recorded.');
  process.exitCode = 1;
}
