// PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD supply the connection.
// Never pass credentials on the command line or commit them to this repository.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
if (process.env.QUALIFY_SECURITY_DB_ACK !== 'rollback-fixtures') {
  console.error('Set QUALIFY_SECURITY_DB_ACK=rollback-fixtures and PG* connection variables. Read tests/security/README.md first.');
  process.exit(1);
}
const result = spawnSync('psql', [
  '--no-psqlrc', '--set', 'ON_ERROR_STOP=1',
  '--file', fileURLToPath(new URL('./two-institution.sql', import.meta.url)),
], { stdio: 'inherit', env: process.env });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
