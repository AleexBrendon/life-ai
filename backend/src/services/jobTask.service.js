const prisma = require("../database/prisma");

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const RANK_PRIORITY = ["HIGH", "MEDIUM", "LOW"];
const STATUS_LABEL = { TODO: "A fazer", IN_PROGRESS: "Em andamento", COMPLETED: "Concluído" };

function fail(message, status = 409) {
  throw Object.assign(new Error(message), { status });
}

const byBoardOrder = (a, b) =>
  (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) || a.position - b.position || a.id - b.id;

function trackedSeconds(logs, now = new Date()) {
  return logs.reduce((sum, log) => sum + Math.max(0, Math.floor(((log.endedAt || now) - log.startedAt) / 1000)), 0);
}

function serialize(task, now = new Date()) {
  const { timeLogs = [], events = [], ...rest } = task;
  const running = timeLogs.find((log) => !log.endedAt);
  return {
    ...rest,
    status: rest.status === "DONE" ? "COMPLETED" : rest.status,
    dueDate: rest.dueDate ? rest.dueDate.toISOString().slice(0, 10) : null,
    trackedSeconds: trackedSeconds(timeLogs, now),
    runningSince: running ? running.startedAt.toISOString() : null,
    events: events.map(({ id, type, fromStatus, toStatus, reason, createdAt }) => ({ id, type, fromStatus, toStatus, reason, createdAt })),
  };
}

const include = { timeLogs: true, events: { orderBy: { createdAt: "desc" }, take: 30 } };

async function ownedJob(userId, jobId, db = prisma) {
  if (!Number.isInteger(jobId) || jobId <= 0) fail("Trabalho não encontrado.", 404);
  const job = await db.job.findFirst({ where: { id: jobId, userId }, select: { id: true } });
  if (!job) fail("Trabalho não encontrado.", 404);
  return job;
}

async function ownedTask(userId, jobId, taskId, db = prisma) {
  await ownedJob(userId, jobId, db);
  if (!Number.isInteger(taskId) || taskId <= 0) fail("ID da tarefa inválido.", 400);
  const task = await db.jobTask.findFirst({ where: { id: taskId, jobId }, include: { timeLogs: true } });
  if (!task) fail("Tarefa não encontrada.", 404);
  return { ...task, status: task.status === "DONE" ? "COMPLETED" : task.status };
}

async function reload(taskId, db = prisma) {
  return serialize(await db.jobTask.findUnique({ where: { id: taskId }, include }));
}

async function nextPosition(jobId, status, db) {
  const last = await db.jobTask.aggregate({ where: { jobId, status }, _max: { position: true } });
  return (last._max.position ?? -1) + 1;
}

function fieldsFrom(data) {
  const values = { ...data };
  if (values.dueDate !== undefined) values.dueDate = values.dueDate ? new Date(`${values.dueDate}T00:00:00.000Z`) : null;
  return values;
}

async function listTasks(userId, jobId) {
  await ownedJob(userId, jobId);
  const tasks = await prisma.jobTask.findMany({ where: { jobId }, include });
  const now = new Date();
  return tasks.sort(byBoardOrder).map((task) => serialize(task, now));
}

async function createTask(userId, jobId, data) {
  await ownedJob(userId, jobId);
  return prisma.$transaction(async (tx) => {
    const status = data.status || "TODO";
    const task = await tx.jobTask.create({
      data: { ...fieldsFrom(data), jobId, status, position: await nextPosition(jobId, status, tx), ...(status === "COMPLETED" ? { completedAt: new Date() } : {}) },
    });
    await tx.jobTaskEvent.create({ data: { taskId: task.id, userId, type: "CREATE", toStatus: status } });
    if (status === "IN_PROGRESS") await tx.jobTaskTimeLog.create({ data: { taskId: task.id, userId, startedAt: new Date() } });
    return reload(task.id, tx);
  });
}

async function updateTask(userId, jobId, taskId, data) {
  await ownedTask(userId, jobId, taskId);
  await prisma.jobTask.update({ where: { id: taskId }, data: fieldsFrom(data) });
  return reload(taskId);
}

async function closeRunning(tx, task, now) {
  const running = task.timeLogs.find((log) => !log.endedAt);
  if (running) await tx.jobTaskTimeLog.update({ where: { id: running.id }, data: { endedAt: now } });
  return Boolean(running);
}

async function startTask(userId, jobId, taskId) {
  return prisma.$transaction(async (tx) => {
    const task = await ownedTask(userId, jobId, taskId, tx);
    if (task.status === "COMPLETED") fail("A tarefa está concluída. Mova para Em andamento e informe o motivo para retomar.");
    if (task.timeLogs.some((log) => !log.endedAt)) fail("O tempo desta tarefa já está contando.");
    const now = new Date();
    await tx.jobTaskTimeLog.create({ data: { taskId, userId, startedAt: now } });
    if (task.status === "TODO") {
      await tx.jobTask.update({ where: { id: taskId }, data: { status: "IN_PROGRESS", position: await nextPosition(jobId, "IN_PROGRESS", tx) } });
      await tx.jobTaskEvent.create({ data: { taskId, userId, type: "START", fromStatus: "TODO", toStatus: "IN_PROGRESS" } });
    } else await tx.jobTaskEvent.create({ data: { taskId, userId, type: "RESUME" } });
    return reload(taskId, tx);
  }, { isolationLevel: "Serializable" });
}

async function pauseTask(userId, jobId, taskId) {
  return prisma.$transaction(async (tx) => {
    const task = await ownedTask(userId, jobId, taskId, tx);
    if (!(await closeRunning(tx, task, new Date()))) fail("O tempo desta tarefa já está pausado.");
    await tx.jobTaskEvent.create({ data: { taskId, userId, type: "PAUSE" } });
    return reload(taskId, tx);
  }, { isolationLevel: "Serializable" });
}

// Every column change needs a reason, except starting a task from "A fazer".
async function moveTask(userId, jobId, taskId, { status, reason }) {
  return prisma.$transaction(async (tx) => {
    const task = await ownedTask(userId, jobId, taskId, tx);
    if (task.status === status) fail("A tarefa já está nesta coluna.", 400);
    const starting = task.status === "TODO" && status === "IN_PROGRESS";
    if (!starting && (!reason || reason.length < 3)) fail(`Informe o motivo para mover de ${STATUS_LABEL[task.status]} para ${STATUS_LABEL[status]}.`, 400);
    const now = new Date();
    if (task.status === "IN_PROGRESS") await closeRunning(tx, task, now);
    await tx.jobTask.update({
      where: { id: taskId },
      data: { status, position: await nextPosition(jobId, status, tx), completedAt: status === "COMPLETED" ? now : null },
    });
    if (status === "IN_PROGRESS") await tx.jobTaskTimeLog.create({ data: { taskId, userId, startedAt: now } });
    await tx.jobTaskEvent.create({ data: { taskId, userId, type: starting ? "START" : "MOVE", fromStatus: task.status, toStatus: status, reason: reason || null } });
    return reload(taskId, tx);
  }, { isolationLevel: "Serializable" });
}

// Dropping a task between two others keeps the column sorted by priority: its priority is
// clamped between the neighbours' priorities, so it only changes when it has to.
async function reorderTask(userId, jobId, taskId, { beforeId }) {
  return prisma.$transaction(async (tx) => {
    const task = await ownedTask(userId, jobId, taskId, tx);
    const column = (await tx.jobTask.findMany({ where: { jobId, status: { in: task.status === "COMPLETED" ? ["COMPLETED", "DONE"] : [task.status] } } })).sort(byBoardOrder).filter((row) => row.id !== taskId);
    const index = beforeId === null ? column.length : column.findIndex((row) => row.id === beforeId);
    if (index < 0) fail("A tarefa de referência não está nesta coluna.", 400);
    const previous = column[index - 1], next = column[index];
    const low = previous ? PRIORITY_RANK[previous.priority] ?? 1 : 0, high = next ? PRIORITY_RANK[next.priority] ?? 1 : 2;
    const priority = RANK_PRIORITY[Math.min(high, Math.max(low, PRIORITY_RANK[task.priority] ?? 1))];
    const ordered = [...column.slice(0, index), { ...task, priority }, ...column.slice(index)];
    for (const [position, row] of ordered.entries()) {
      if (row.id === taskId) await tx.jobTask.update({ where: { id: taskId }, data: { position, priority } });
      else if (row.position !== position) await tx.jobTask.update({ where: { id: row.id }, data: { position } });
    }
    if (priority !== task.priority) await tx.jobTaskEvent.create({ data: { taskId, userId, type: "PRIORITY", reason: `Prioridade alterada para ${{ HIGH: "alta", MEDIUM: "média", LOW: "baixa" }[priority]} ao reordenar.` } });
    return reload(taskId, tx);
  });
}

async function deleteTask(userId, jobId, taskId) {
  await ownedTask(userId, jobId, taskId);
  await prisma.jobTask.delete({ where: { id: taskId } });
}

module.exports = { PRIORITY_RANK, byBoardOrder, trackedSeconds, serialize, listTasks, createTask, updateTask, startTask, pauseTask, moveTask, reorderTask, deleteTask };
