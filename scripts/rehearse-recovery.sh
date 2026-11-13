#!/usr/bin/env bash
# Run in an isolated CI runner with PostgreSQL server and client tools installed.
set -euo pipefail
umask 077
export PATH="$(pg_config --bindir):$PATH"
work=$(mktemp -d)
cleanup() {
  if [[ -s "$work/cluster/postmaster.pid" ]]; then pg_ctl -D "$work/cluster" -m fast -w stop >/dev/null; fi
  rm -rf -- "$work"
}
trap cleanup EXIT
export PGHOST=127.0.0.1 PGPORT=15439 PGUSER=drill
export PGPASSWORD="$(openssl rand -hex 24)"
printf '%s\n' "$PGPASSWORD" > "$work/password"
initdb -D "$work/cluster" -U drill --pwfile="$work/password" --auth=scram-sha-256 >/dev/null
pg_ctl -D "$work/cluster" -o "-h 127.0.0.1 -p 15439 -k '$work'" -l "$work/postgres.log" -w start >/dev/null
createdb rehearsal_source
createdb styled_restore_rehearsal
image=public/img/items/crescent-moon-demo/empire-90.webp
digest=$(sha256sum "$image" | cut -d' ' -f1)
psql -X -v ON_ERROR_STOP=1 -d rehearsal_source -c "create table listings (id text primary key, image_sha256 text not null); insert into listings values ('empire-90', '$digest');" >/dev/null
pg_dump --format=custom --no-owner --no-acl rehearsal_source > "$work/database"
cp "$image" "$work/media"
export BACKUP_ENCRYPTION_KEY="$(openssl rand -base64 32)"
node --input-type=module - "$work" <<'JS'
import {readFile, writeFile, unlink} from 'node:fs/promises';
import {encryptBackup, decryptBackup, backupKey} from './scripts/backup-codec.mjs';
const dir = process.argv[2];
const key = backupKey(process.env.BACKUP_ENCRYPTION_KEY);
for (const name of ['database', 'media']) {
  const file = dir + '/' + name;
  await writeFile(file + '.enc', encryptBackup(await readFile(file), key));
  await unlink(file);
}
await writeFile(dir + '/restored.webp', decryptBackup(await readFile(dir + '/media.enc'), key));
JS
export ALLOW_LOCAL_RESTORE=yes
export STYLED_LOCAL_RESTORE_URL="postgres://drill:$PGPASSWORD@127.0.0.1:15439/styled_restore_rehearsal"
node scripts/restore-development-backup.mjs "$work/database.enc"
restored=$(psql -XAt -d styled_restore_rehearsal -c "select image_sha256 from listings where id='empire-90'")
[[ "$restored" == "$digest" && "$(sha256sum "$work/restored.webp" | cut -d' ' -f1)" == "$restored" ]]
echo 'Restored sample listing and verified separately archived image bytes.'
