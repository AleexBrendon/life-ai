const prisma = require("./database/prisma");
const {
    executeAIAction,
} = require("./services/aiActionExecutor.service");

const run = async () => {
    try {
        const userId = 1;

        const action = {
            type: "RESCHEDULE_ROUTINE",

            target: {
                type: "ROUTINE",
                id: 2,
            },

            payload: {
                newStartTime: "18:00",
                newEndTime: "19:00",
            },

            reason:
                "Reagendamento da rotina para evitar conflito.",

            confidence: 0.95,
        };

        console.log(
            "=== RESCHEDULE ROUTINE TEST ===\n"
        );

        console.log(
            "Horário antes da alteração:"
        );

        const before =
            await prisma.routineSchedule.findFirst({
                where: {
                    routineItemId: 2,
                    dayOfWeek: 0,
                },
            });

        console.dir(before, {
            depth: null,
        });

        const result =
            await executeAIAction({
                userId,
                action,
                date: "2026-08-16",
            });

        console.log(
            "\n✅ RESCHEDULE_ROUTINE executado:"
        );

        console.dir(result, {
            depth: null,
        });

        const after =
            await prisma.routineSchedule.findFirst({
                where: {
                    routineItemId: 2,
                    dayOfWeek: 0,
                },
            });

        console.log(
            "\nHorário depois da alteração:"
        );

        console.dir(after, {
            depth: null,
        });

        if (
            after?.startTime !== "18:00" ||
            after?.endTime !== "19:00"
        ) {
            throw new Error(
                "O horário da rotina não foi atualizado corretamente."
            );
        }

        if (
            result.type !==
            "RESCHEDULE_ROUTINE"
        ) {
            throw new Error(
                "Tipo de execução incorreto."
            );
        }

        if (
            result.executed !== true
        ) {
            throw new Error(
                "A ação não foi marcada como executada."
            );
        }

        console.log(
            "\n✅ RESCHEDULE_ROUTINE passou."
        );
    } catch (error) {
        console.error(
            "\n❌ RESCHEDULE_ROUTINE falhou:"
        );

        console.error(
            error?.message || error
        );

        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
};

run();