require("dotenv").config();

const {
    buildAIInput,
} = require("./services/aiInput.service");

const {
    generateAIOutput,
} = require("./services/aiOutput.service");

const run = async () => {
    console.log("=== AI OUTPUT CONFLICT TEST ===");

    try {
        const context = {
            user: {
                id: 1,
                name: "Alex",
            },

            profile: null,

            work: {
                jobs: [
                    {
                        id: 1,
                        name: "Trabalho principal",
                        schedules: [
                            {
                                id: 10,
                                dayOfWeek: 2,
                                startTime: "09:00",
                                endTime: "18:00",
                            },
                        ],
                    },
                ],
            },

            routines: [
                {
                    id: 12,
                    name: "Academia",
                    schedules: [
                        {
                            id: 20,
                            dayOfWeek: 2,
                            startTime: "17:00",
                            endTime: "18:00",
                        },
                    ],
                },
            ],

            reminders: [],

            unexpectedEvents: [],

            today: {
                date: "2026-08-18",

                summary: {
                    totalScheduledRoutines: 1,
                    totalRoutineExecutions: 0,
                    totalScheduledReminders: 0,
                    totalReminderExecutions: 0,
                    totalExecutions: 0,
                    completed: 0,
                    pending: 0,
                    missed: 0,
                    skipped: 0,
                    totalWorkSchedules: 1,
                    totalUnexpectedEvents: 0,
                    totalConflicts: 1,
                },

                routines: {
                    scheduled: [
                        {
                            routineId: 12,
                            name: "Academia",
                            startTime: "17:00",
                            endTime: "18:00",
                        },
                    ],
                    executions: [],
                },

                reminders: {
                    scheduled: [],
                    executions: [],
                },

                work: [
                    {
                        jobId: 1,
                        name: "Trabalho principal",
                        startTime: "09:00",
                        endTime: "18:00",
                    },
                ],

                unexpectedEvents: [],

                schedule: [],

                conflicts: [
                    {
                        type: "SCHEDULE_CONFLICT",
                        items: [
                            {
                                type: "WORK",
                                id: 10,
                                title: "Trabalho principal",
                                startTime: "09:00",
                                endTime: "18:00",
                            },
                            {
                                type: "ROUTINE",
                                id: 12,
                                title: "Academia",
                                startTime: "17:00",
                                endTime: "18:00",
                            },
                        ],
                    },
                ],
            },

            conflicts: [
                {
                    type: "SCHEDULE_CONFLICT",
                    items: [
                        {
                            type: "WORK",
                            id: 10,
                            title: "Trabalho principal",
                            startTime: "09:00",
                            endTime: "18:00",
                        },
                        {
                            type: "ROUTINE",
                            id: 12,
                            title: "Academia",
                            startTime: "17:00",
                            endTime: "18:00",
                        },
                    ],
                },
            ],

            constraints: [
                {
                    type: "WORK",
                    source: "WORK_SCHEDULE",
                    sourceId: 10,
                    title: "Trabalho principal",
                    dayOfWeek: 2,
                    startTime: "09:00",
                    endTime: "18:00",
                    priority: "HIGH",
                },
                {
                    type: "ROUTINE",
                    source: "ROUTINE_SCHEDULE",
                    sourceId: 20,
                    title: "Academia",
                    dayOfWeek: 2,
                    startTime: "17:00",
                    endTime: "18:00",
                    priority: "MEDIUM",
                },
            ],

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

        console.log("\n✅ Contexto de conflito criado.");

        const output = await generateAIOutput({
            input,
        });

        console.log("\n✅ AI Output:");
        console.dir(output, {
            depth: null,
        });

        const routineAction =
            output.actions.find(
                (action) =>
                    [
                        "MOVE_ROUTINE",
                        "RESCHEDULE_ROUTINE",
                    ].includes(action.type)
            );

        if (!routineAction) {
            console.error(
                "\n❌ A IA não sugeriu uma ação válida para a rotina."
            );

            process.exit(1);
        }

        if (
            routineAction.data?.routineId !== 12
        ) {
            console.error(
                "\n❌ A IA selecionou uma rotina incorreta."
            );

            process.exit(1);
        }

        console.log(
            `\n✅ Ação de rotina identificada corretamente: ${routineAction.type}`
        );
    } catch (error) {
        console.error(
            "\n❌ Erro no teste:"
        );

        console.error(
            error?.message || error
        );

        process.exit(1);
    }
};

run();