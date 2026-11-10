import {spawnSync} from 'node:child_process';
import {writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {backupKey, devDatabase, pgEnvironment, encryptBackup, privateBackupFolder} from './backup-codec.mjs';
// Secrets stay in the child environment, never in arguments or output.
try {
  if (process.argv.length !== 3) throw Error();
  const key = backupKey(process.env.BACKUP_ENCRYPTION_KEY), database = devDatabase(process.env.STYLED_DEV_DATABASE_URL);
  const folder = await privateBackupFolder(process.argv[2]);
  await mkdir(folder, {recursive: true, mode: 0o700});
  await privateBackupFolder(folder);
  const result = spawnSync('pg_dump', ['--no-password', '--format=custom', '--no-owner', '--no-acl'], {env: pgEnvironment(database), maxBuffer: 256 * 1024 * 1024, timeout: 120000});
  if (result.error || result.status !== 0 || !result.stdout?.length) throw Error();
  const file = resolve(folder, `styled-development-${new Date().toISOString().replaceAll(':', '-')}.dump.enc`);
  await writeFile(file, encryptBackup(result.stdout, key), {mode: 0o600, flag: 'wx'});
  console.log('Encrypted development database archive saved in the selected private folder.');
  console.log('Storage file bytes are excluded. This is not a verified backup until an isolated restore and data/media checks succeed.');
} catch {
  console.error('Backup failed. Check the development-only URL, encryption key, private outside-repository folder, pg_dump and TLS configuration. No backup success is recorded.');
  process.exitCode = 1;
}
