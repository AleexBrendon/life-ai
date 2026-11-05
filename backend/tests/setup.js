const dotenv = require('dotenv');
const path = require('path');
const development = dotenv.config({ path: path.resolve('.env'), quiet: true, processEnv: {} }).parsed || {};
const rootDevelopment = dotenv.config({ path: path.resolve('../.env'), quiet: true, processEnv: {} }).parsed || {};
const testing = dotenv.config({ path: path.resolve('.env.test'), quiet: true, processEnv: {} }).parsed || {};
function databaseIdentity(value) {
  try { const url = new URL(value); return url.hostname + ':' + (url.port || '5432') + url.pathname; }
  catch { return null; }
}
const target = databaseIdentity(testing.DATABASE_URL);
if (!target || !/test/i.test(new URL(testing.DATABASE_URL).pathname) || [development.DATABASE_URL, rootDevelopment.DATABASE_URL].some(value => target === databaseIdentity(value))) {
  throw new Error('Os testes exigem DATABASE_URL em .env.test apontando para um banco de testes separado.');
}
Object.assign(process.env, testing, { NODE_ENV: 'test' });
