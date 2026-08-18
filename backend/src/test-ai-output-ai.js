require("dotenv").config();

const {
    buildAIInput,
} = require("./services/aiInput.service");

const {
    generateAIOutput,
} = require("./services/aiOutput.service");

const run = async () => {
    console.log("=== AI OUTPUT AI TEST ===");

    try {
        /*
         * Contexto mínimo artificial apenas para testar
         * a camada de geração da IA.
         */

        const context = {
            user: {
                id: 1,
                name: "Alex",
            },

            profile: null,

            work: {
                jobs: [],
            },

            routines: [],

            reminders: [],

            unexpectedEvents: [],

            today: {
                date: "2026-08-18",

                summary: {
                    totalScheduledRoutines: 0,
                    totalRoutineExecutions: 0,

                    totalScheduledReminders: 0,
                    totalReminderExecutions: 0,

                    totalExecutions: 0,

                    completed: 0,
                    pending: 0,
                    missed: 0,
                    skipped: 0,

                    totalWorkSchedules: 0,
                    totalUnexpectedEvents: 0,

                    totalConflicts: 0,
                },

                routines: {
                    scheduled: [],
                    executions: [],
                },

                reminders: {
                    scheduled: [],
                    executions: [],
                },

                work: [],

                unexpectedEvents: [],

                schedule: [],

                conflicts: [],
            },

            conflicts: [],

            constraints: [],

            history: {
                period: {
                    startDate: new Date(
                        "2026-08-11T00:00:00.000Z"
                    ),

                    endDate: new Date(
                        "2026-08-18T00:00:00.000Z"
                    ),
                },

                routines: [],

                reminders: [],
            },
        };

        const input = buildAIInput({
            context,
        });

        console.log("\n✅ AI Input criado.");

        const output = await generateAIOutput({
            input,
        });

        console.log("\n✅ AI Output recebido:");
        console.dir(output, {
            depth: null,
        });
    } catch (error) {
        console.error(
            "\n❌ Erro no AI Output:"
        );

        console.error(
            error?.message || error
        );
    }
};

run();