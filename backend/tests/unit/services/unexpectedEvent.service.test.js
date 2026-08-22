import {
    describe,
    it,
    expect,
    beforeEach,
    vi,
} from "vitest";

const conflictPath = require.resolve(
    "../../../src/services/conflict.service"
);

const replanningPath = require.resolve(
    "../../../src/services/replanning.service"
);

const unexpectedEventPath = require.resolve(
    "../../../src/services/unexpectedEvent.service"
);

const findScheduleConflicts =
    vi.fn();

const generateReplanningOptions =
    vi.fn();

require.cache[conflictPath] = {
    id: conflictPath,
    filename: conflictPath,
    loaded: true,
    exports: {
        findScheduleConflicts,
    },
};

require.cache[replanningPath] = {
    id: replanningPath,
    filename: replanningPath,
    loaded: true,
    exports: {
        generateReplanningOptions,
    },
};

delete require.cache[
    unexpectedEventPath
];

const {
    analyzeUnexpectedEventConflicts,
} = require(
    "../../../src/services/unexpectedEvent.service"
);

describe("Unexpected Event Service", () => {
    beforeEach(() => {
        findScheduleConflicts.mockReset();
        generateReplanningOptions.mockReset();
    });

    const event = {
        id: 10,
        userId: 1,
        title: "Imprevisto",
        date: new Date(
            "2026-08-16T00:00:00.000Z"
        ),
        startTime: "10:00",
        endTime: "11:00",
    };

    it("deve retornar ausência de conflito quando não houver conflitos", async () => {
        findScheduleConflicts.mockResolvedValue(
            []
        );

        const result =
            await analyzeUnexpectedEventConflicts({
                userId: 1,
                event,
            });

        expect(result).toEqual({
            hasConflict: false,
            conflicts: [],
            replanningOptions: [],
        });

        expect(
            findScheduleConflicts
        ).toHaveBeenCalledTimes(1);

        expect(
            generateReplanningOptions
        ).not.toHaveBeenCalled();
    });

    it("deve consultar conflitos usando os dados do evento", async () => {
        findScheduleConflicts.mockResolvedValue(
            []
        );

        await analyzeUnexpectedEventConflicts({
            userId: 5,
            event,
        });

        expect(
            findScheduleConflicts
        ).toHaveBeenCalledWith({
            userId: 5,
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            excludeUnexpectedEventId:
                event.id,
        });
    });

    it("deve detectar conflito quando houver resultados", async () => {
        const conflicts = [
            {
                type: "ROUTINE",
                id: 1,
                title: "Rotina",
                startTime: "10:00",
                endTime: "11:00",
            },
        ];

        findScheduleConflicts.mockResolvedValue(
            conflicts
        );

        generateReplanningOptions.mockResolvedValue(
            {
                options: [],
            }
        );

        const result =
            await analyzeUnexpectedEventConflicts({
                userId: 1,
                event,
            });

        expect(result.hasConflict).toBe(
            true
        );

        expect(result.conflicts).toEqual(
            conflicts
        );
    });

    it("deve gerar opções de replanning quando houver conflito", async () => {
        const conflicts = [
            {
                type: "WORK",
                id: 2,
                title: "Trabalho",
                startTime: "10:00",
                endTime: "11:00",
            },
        ];

        const options = [
            {
                type: "MOVE_ROUTINE",
            },
            {
                type: "MOVE_REMINDER",
            },
        ];

        findScheduleConflicts.mockResolvedValue(
            conflicts
        );

        generateReplanningOptions.mockResolvedValue(
            {
                options,
            }
        );

        const result =
            await analyzeUnexpectedEventConflicts({
                userId: 1,
                event,
            });

        expect(
            generateReplanningOptions
        ).toHaveBeenCalledWith({
            userId: 1,
            event,
        });

        expect(
            result.replanningOptions
        ).toEqual(options);
    });

    it("deve preservar todos os conflitos", async () => {
        const conflicts = [
            {
                type: "ROUTINE",
                id: 1,
            },
            {
                type: "WORK",
                id: 2,
            },
            {
                type: "REMINDER",
                id: 3,
            },
        ];

        findScheduleConflicts.mockResolvedValue(
            conflicts
        );

        generateReplanningOptions.mockResolvedValue(
            {
                options: [],
            }
        );

        const result =
            await analyzeUnexpectedEventConflicts({
                userId: 1,
                event,
            });

        expect(result.conflicts).toEqual(
            conflicts
        );
    });

    it("deve propagar erro do serviço de conflitos", async () => {
        findScheduleConflicts.mockRejectedValue(
            new Error("Erro de conflito.")
        );

        await expect(
            analyzeUnexpectedEventConflicts({
                userId: 1,
                event,
            })
        ).rejects.toThrow(
            "Erro de conflito."
        );
    });

    it("deve propagar erro do replanning", async () => {
        findScheduleConflicts.mockResolvedValue([
            {
                type: "ROUTINE",
                id: 1,
            },
        ]);

        generateReplanningOptions.mockRejectedValue(
            new Error("Erro de replanning.")
        );

        await expect(
            analyzeUnexpectedEventConflicts({
                userId: 1,
                event,
            })
        ).rejects.toThrow(
            "Erro de replanning."
        );
    });
});