import { afterAll, beforeEach, describe, expect, it } from "vitest";

const request = require("../helpers/request");
const { cleanupDatabase, prisma } = require("../helpers/cleanup");

describe("E2E — fluxo completo do LifeAI", () => {
    const date = "2026-08-23"; 
    const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
        await prisma.$disconnect();
    });

    it("permite ao usuário organizar, acompanhar e concluir seu dia", async () => {
        const email = `e2e-flow-${Date.now()}@example.com`;
        const password = "Test@123456";

        const register = await request.post("/api/auth/register").send({
            name: "Usuário E2E", email, password,
        });
        expect(register.status).toBe(201);
        expect(register.body.data.user.email).toBe(email);

        const login = await request.post("/api/auth/login").send({ email, password });
        expect(login.status).toBe(200);
        const headers = authHeader(login.body.data.token);

        const me = await request.get("/api/auth/me").set(headers);
        expect(me.status).toBe(200);
        expect(me.body.data.user.id).toBe(register.body.data.user.id);

        const profile = await request.put("/api/users/me").set(headers).send({
            name: "Usuário E2E Atualizado", timezone: "America/Sao_Paulo",
            occupation: "Desenvolvedor", hasChildren: false,
        });
        expect(profile.status).toBe(200);
        expect(profile.body.data.user).toMatchObject({
            name: "Usuário E2E Atualizado",
            profile: expect.objectContaining({ occupation: "Desenvolvedor" }),
        });

        const jobResponse = await request.post("/api/jobs").set(headers).send({
            name: "LifeAI", company: "LifeAI Ltda.", position: "Developer",
            workType: "CLT", location: "Remoto",
        });
        expect(jobResponse.status).toBe(201);
        const job = jobResponse.body.data;

        const workScheduleResponse = await request.post(`/api/jobs/${job.id}/schedules`).set(headers).send({
            dayOfWeek: 0, startTime: "09:00", endTime: "18:00", breakStart: "12:00", breakEnd: "13:00",
        });
        expect(workScheduleResponse.status).toBe(201);
        const workSchedule = workScheduleResponse.body.data;

        const updatedWorkSchedule = await request.put(`/api/jobs/${job.id}/schedules/${workSchedule.id}`).set(headers).send({
            dayOfWeek: 0, startTime: "09:00", endTime: "17:00", breakStart: "12:00", breakEnd: "13:00",
        });
        expect(updatedWorkSchedule.status).toBe(200);
        expect(updatedWorkSchedule.body.data.endTime).toBe("17:00");

        const [jobs, schedules] = await Promise.all([
            request.get("/api/jobs").set(headers),
            request.get(`/api/jobs/${job.id}/schedules`).set(headers),
        ]);
        expect(jobs.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: job.id })]));
        expect(schedules.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: workSchedule.id })]));

        const routineResponse = await request.post("/api/routines").set(headers).send({
            name: "Estudar arquitetura", type: "STUDY",
        });
        expect(routineResponse.status).toBe(201);
        const routine = routineResponse.body.data;

        const routineUpdate = await request.put(`/api/routines/${routine.id}`).set(headers).send({
            name: "Estudar arquitetura de software", type: "STUDY", isActive: true,
        });
        expect(routineUpdate.status).toBe(200);

        const routineScheduleResponse = await request.post(`/api/routines/${routine.id}/schedules`).set(headers).send({
            dayOfWeek: 0, startTime: "07:00", endTime: "08:00",
        });
        expect(routineScheduleResponse.status).toBe(201);
        const routineSchedule = routineScheduleResponse.body.data;

        const routineSchedules = await request.get(`/api/routines/${routine.id}/schedules`).set(headers);
        expect(routineSchedules.body.data).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: routineSchedule.id }),
        ]));

        const executionResponse = await request.post("/api/routine-executions").set(headers).send({
            routineItemId: routine.id, routineScheduleId: routineSchedule.id, date,
        });
        expect(executionResponse.status).toBe(201);
        const execution = executionResponse.body.data;

        const completedRoutine = await request.patch(`/api/routine-executions/${execution.id}/complete`).set(headers);
        expect(completedRoutine.status).toBe(200);
        expect(completedRoutine.body.data.status).toBe("COMPLETED");

        const routineExecutions = await request.get("/api/routine-executions").set(headers);
        expect(routineExecutions.body.data).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: execution.id, status: "COMPLETED" }),
        ]));

        const reminderResponse = await request.post("/api/reminders").set(headers).send({
            title: "Beber água", description: "Manter-se hidratado", reminderTime: "08:30", recurrence: "DAILY",
        });
        expect(reminderResponse.status).toBe(201);
        const reminder = reminderResponse.body.data;

        const updatedReminder = await request.put(`/api/reminders/${reminder.id}`).set(headers).send({
            title: "Beber água regularmente", reminderTime: "08:45", recurrence: "DAILY",
        });
        expect(updatedReminder.status).toBe(200);

        const reminderExecutionResponse = await request.post("/api/reminder-executions").set(headers).send({
            reminderId: reminder.id, date,
        });
        expect(reminderExecutionResponse.status).toBe(201);
        const reminderExecution = reminderExecutionResponse.body.data;

        const completedReminderExecution = await request.patch(`/api/reminder-executions/${reminderExecution.id}/complete`).set(headers);
        expect(completedReminderExecution.status).toBe(200);
        expect(completedReminderExecution.body.data.status).toBe("COMPLETED");

        const [reminders, reminderExecutions] = await Promise.all([
            request.get("/api/reminders").set(headers),
            request.get("/api/reminder-executions").set(headers),
        ]);
        expect(reminders.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: reminder.id })]));
        expect(reminderExecutions.body.data).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: reminderExecution.id, status: "COMPLETED" }),
        ]));

        const eventResponse = await request.post("/api/unexpected-events").set(headers).send({
            title: "Reunião urgente", description: "Alinhamento com cliente", date,
            startTime: "10:00", endTime: "11:00", priority: "HIGH",
        });
        expect(eventResponse.status).toBe(201);
        const event = eventResponse.body.data.event;
        expect(eventResponse.body.data.conflictAnalysis.hasConflict).toBe(true);

        const replanning = await request.post(`/api/unexpected-events/${event.id}/replan`).set(headers).send({
            option: { type: "PRESERVE_JOB" },
        });
        expect(replanning.status).toBe(200);
        expect(replanning.body.data.type).toBe("PRESERVE_JOB");

        const resolvedEvent = await request.put(`/api/unexpected-events/${event.id}`).set(headers).send({ status: "RESOLVED" });
        expect(resolvedEvent.status).toBe(200);
        expect(resolvedEvent.body.data.status).toBe("RESOLVED");

        const [calendar, dashboard] = await Promise.all([
            request.get(`/api/calendar?date=${date}`).set(headers),
            request.get(`/api/dashboard?date=${date}`).set(headers),
        ]);
        expect(calendar.status).toBe(200);
        expect(calendar.body.data.items.map((item) => item.type)).toEqual(
            expect.arrayContaining(["ROUTINE", "REMINDER", "WORK", "UNEXPECTED_EVENT"])
        );
        expect(dashboard.status).toBe(200);
        expect(dashboard.body.data.date).toBe(date);

        const notificationResponse = await request.post("/api/notifications").set(headers).send({
            title: "Plano atualizado", message: "O imprevisto foi registrado.", type: "UNEXPECTED_EVENT",
            priority: "HIGH", entityType: "UnexpectedEvent", entityId: event.id,
        });
        expect(notificationResponse.status).toBe(201);
        const notification = notificationResponse.body.data;

        const updatedNotification = await request.put(`/api/notifications/${notification.id}`).set(headers).send({
            title: "Imprevisto resolvido",
        });
        expect(updatedNotification.status).toBe(200);

        const readNotification = await request.patch(`/api/notifications/${notification.id}/read`).set(headers);
        expect(readNotification.status).toBe(200);
        expect(readNotification.body.data.isRead).toBe(true);

        const notifications = await request.get("/api/notifications?onlyUnread=true").set(headers);
        expect(notifications.status).toBe(200);
        expect(notifications.body.data).not.toEqual(expect.arrayContaining([
            expect.objectContaining({ id: notification.id }),
        ]));

        for (const path of [
            `/api/notifications/${notification.id}`,
            `/api/unexpected-events/${event.id}`,
            `/api/reminders/${reminder.id}`,
            `/api/routines/${routine.id}`,
            `/api/jobs/${job.id}`,
        ]) {
            const response = await request.delete(path).set(headers);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        }

        const logout = await request.post("/api/auth/logout").set(headers);
        expect(logout.status).toBe(200);
        expect(logout.body.success).toBe(true);
    });
});
