require('dotenv').config();
const { validateEnvironment } = require('./config/environment');
const { port } = validateEnvironment();
const app = require('./app');
const prisma = require('./database/prisma');
const redis = require('./database/redis');
const timers = [];
const server = app.listen(port, () => {
  console.log('LifeAI API rodando na porta ' + port);
  timers.push(require('./services/hydrationReminder.service').startHydrationReminders());
  timers.push(require('./services/upcomingNotification.service').startUpcomingNotifications());
  timers.push(require('./services/routinePlanner.service').startCheckinNotifications());
});
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  timers.forEach(clearInterval);
  const deadline = setTimeout(() => process.exit(1), 15000);

  try {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await prisma.$disconnect();
    await redis.quit();
    clearTimeout(deadline);
  } catch (error) {
    console.error('Falha no encerramento:', error.code || error.name);
    redis.disconnect();
    process.exitCode = 1;
  }
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
