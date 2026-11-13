const { readFileSync } = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente.');
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '30s'");
    const sql = readFileSync(path.resolve(__dirname, '../prisma/checks/integrity.sql'), 'utf8');
    const { rows } = await client.query(sql);
    console.table(rows);
    const invalid = rows.some(row => row.invalid_rows > 0);
    console.log(invalid
      ? 'Há dados incompatíveis. Revise os registros antes de aplicar a migração; nenhuma correção foi executada.'
      : 'Nenhuma incompatibilidade encontrada para as novas restrições.');
    process.exitCode = invalid ? 1 : 0;
  } finally {
    // A rollback also closes an aborted transaction after a failed query.
    if (connected) await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
}

main().catch(error => {
  // Do not log connection strings, SQL parameters or database error details.
  console.error('Não foi possível verificar o banco:', error.code || 'configuração/conexão indisponível');
  process.exitCode = 1;
});
