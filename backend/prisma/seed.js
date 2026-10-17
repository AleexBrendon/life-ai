require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../src/database/prisma");

const email = "demo@lifeai.com";
const password = "LifeAI123!";
const dateLabel = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const today = new Date(`${dateLabel}T00:00:00.000Z`);
const dateAt = offset => new Date(today.getTime() + offset * 86400000);

async function seed() {
  if (process.env.NODE_ENV === "production") throw new Error("Seed de demonstração permitido apenas em desenvolvimento.");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !(await bcrypt.compare(password, existing.passwordHash))) {
    throw new Error("O e-mail de demonstração já pertence a outra conta. Nenhum dado foi alterado.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async tx => {
    const user = await tx.user.upsert({ where: { email }, update: {}, create: { name: "Alex Demo", email, passwordHash } });
    const userId = user.id;
    const ensure = async (model, where, data) => (await tx[model].findFirst({ where })) || tx[model].create({ data });
    await tx.profile.upsert({ where: { userId }, update: {}, create: { userId, occupation: "Desenvolvedor", timezone: "America/Sao_Paulo" } });

    const routines = [
      ["Caminhada da manhã", "Atividade física", "07:00", "07:40"],
      ["Leitura e café", "Desenvolvimento pessoal", "08:00", "08:30"],
      ["Estudar React", "Desenvolvimento pessoal", "18:30", "19:30"],
      ["Organizar o próximo dia", "Organização", "21:00", "21:20"],
    ];
    for (const [index, [name, type, startTime, endTime]] of routines.entries()) {
      const routine = await ensure("routineItem", { userId, name }, { userId, name, type });
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const schedule = await ensure("routineSchedule", { routineItemId: routine.id, dayOfWeek, startTime }, { routineItemId: routine.id, dayOfWeek, startTime, endTime });
        for (let offset = -6; offset <= 6; offset++) {
          const date = dateAt(offset);
          if (date.getUTCDay() !== dayOfWeek) continue;
          const completed = offset < 0 || (offset === 0 && index < 2);
          await tx.routineExecution.upsert({
            where: { userId_routineScheduleId_date: { userId, routineScheduleId: schedule.id, date } }, update: {},
            create: { userId, routineItemId: routine.id, routineScheduleId: schedule.id, date, startTime, endTime, status: completed ? "COMPLETED" : "PENDING", completedAt: completed ? new Date(`${date.toISOString().slice(0, 10)}T${endTime}:00-03:00`) : null },
          });
        }
      }
    }
    const job = await ensure("job", { userId, name: "Projeto LifeAI" }, { userId, name: "Projeto LifeAI", company: "Studio Demo", position: "Desenvolvedor Full Stack", workType: "REMOTE", status: "IN_PROGRESS" });
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      await ensure("workSchedule", { jobId: job.id, dayOfWeek }, { jobId: job.id, dayOfWeek, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00" });
    }
    for (const [title, status] of [["Revisar integração da API", "COMPLETED"], ["Ajustar telas do aplicativo", "IN_PROGRESS"], ["Preparar apresentação", "TODO"]]) {
      await ensure("jobTask", { jobId: job.id, title }, { jobId: job.id, title, status });
    }
    for (const [title, reminderTime] of [["Beber água", "10:30"], ["Pausa para alongar", "15:00"], ["Revisar as prioridades", "20:30"]]) {
      const reminder = await ensure("reminder", { userId, title }, { userId, title, reminderTime, recurrence: "DAILY" });
      await tx.reminderExecution.upsert({ where: { userId_reminderId_date: { userId, reminderId: reminder.id, date: today } }, update: {}, create: { userId, reminderId: reminder.id, date: today, status: "PENDING" } });
    }
    for (const [title, startTime, endTime, priority] of [["Aprender React com prática", "17:30", "18:00", "HIGH"], ["Ler um livro por mês", "20:00", "20:30", "MEDIUM"], ["Manter uma rotina saudável", "06:30", "07:00", "LOW"]]) {
      const goal = await ensure("goal", { userId, title }, { userId, title, description: "Objetivo de demonstração para explorar o planejamento.", targetDate: dateAt(60), weeklyFrequency: 3, sessionMinutes: 30, priority });
      for (const offset of [0, 2, 4]) {
        const date = dateAt(offset);
        await tx.goalPlanSession.upsert({ where: { goalId_date_startTime: { goalId: goal.id, date, startTime } }, update: {}, create: { goalId: goal.id, date, startTime, endTime } });
      }
    }
    await ensure("unexpectedEvent", { userId, title: "Retirar encomenda", date: today }, { userId, title: "Retirar encomenda", description: "Exemplo de compromisso inesperado.", date: today, startTime: "17:00", endTime: "17:20", priority: "MEDIUM", status: "PENDING" });
    for (const [title, message, type] of [["Bem-vindo ao LifeAI", "Sua conta de demonstração está pronta. Explore sua agenda e planejamento.", "SYSTEM"], ["Sua rotina está em dia", "Duas atividades de hoje já foram concluídas. Continue no seu ritmo.", "ROUTINE"], ["Hora de uma pausa", "Reserve alguns minutos para alongar e cuidar de você.", "REMINDER"]]) {
      await ensure("notification", { userId, title }, { userId, title, message, type, priority: "MEDIUM" });
    }
  }, { timeout: 60000 });
  console.log(`Seed concluído para ${dateLabel}.\nLogin: ${email}\nSenha: ${password}\nOs dados existentes foram preservados.`);
}
seed().catch(error => { console.error("Falha no seed:", error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());

