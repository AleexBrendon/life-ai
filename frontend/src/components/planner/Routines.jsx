import { useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Dumbbell,
    Droplets,
    Flame,
    Grid3x3,
    List,
    Plus,
    Repeat2,
    Star,
    X,
} from "lucide-react";

import { lifeApi } from "../../lib/api";

const typeConfig = {
    "Atividade física": {
        icon: Dumbbell,
        tone: "green",
    },
    "Desenvolvimento pessoal": {
        icon: BookOpen,
        tone: "purple",
    },
    Organização: {
        icon: CalendarDays,
        tone: "orange",
    },
    Saúde: {
        icon: Droplets,
        tone: "blue",
    },
};

const filters = [
    { key: "all", label: "Todas" },
    { key: "today", label: "Hoje" },
    { key: "active", label: "Em andamento" },
    { key: "completed", label: "Concluídas" },
];

function getRoutineConfig(type) {
    return (
        typeConfig[type] || {
            icon: Star,
            tone: "purple",
        }
    );
}

function Routines() {
    const [routines, setRoutines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [activeFilter, setActiveFilter] = useState("all");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState("");
    const [completionRate, setCompletionRate] = useState(0);

    const [viewMode, setViewMode] = useState("grid");

    const [form, setForm] = useState({
        name: "",
        type: "",
    });


    const [schedules, setSchedules] = useState([
        {
            id: 1,
            dayOfWeek: "",
            startTime: "",
            endTime: "",
        },
    ]);

    const [nextScheduleId, setNextScheduleId] = useState(2);

    useEffect(() => {
        loadRoutines();
    }, []);

    async function loadRoutines() {
        try {
            setLoading(true);
            setError("");

            const response = await lifeApi.routines();

            const loadedRoutines = response.data || [];

            setRoutines(loadedRoutines);

            const activeCount = loadedRoutines.filter(
                (routine) => routine.isActive,
            ).length;

            const rate =
                loadedRoutines.length > 0
                    ? Math.round((activeCount / loadedRoutines.length) * 100)
                    : 0;

            setCompletionRate(rate);

        } catch (requestError) {
            console.error("Erro ao carregar rotinas:", requestError);
            setError("Não foi possível carregar suas rotinas.");
        } finally {
            setLoading(false);
        }
    }


    function openCreateModal() {
        setForm({
            name: "",
            type: "",
        });

        setSchedules([
            {
                id: 1,
                dayOfWeek: "",
                startTime: "",
                endTime: "",
            },
        ]);

        setNextScheduleId(2);
        setFormError("");
        setIsModalOpen(true);
    }


    function closeCreateModal() {
        if (creating) {
            return;
        }

        setIsModalOpen(false);
        setFormError("");
    }

    function handleFormChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }


    function addSchedule() {
        setSchedules((current) => [
            ...current,
            {
                id: nextScheduleId,
                dayOfWeek: "",
                startTime: "",
                endTime: "",
            },
        ]);

        setNextScheduleId((current) => current + 1);
    }

    function removeSchedule(scheduleId) {
        setSchedules((current) =>
            current.filter((schedule) => schedule.id !== scheduleId),
        );
    }

    function handleScheduleChange(scheduleId, field, value) {
        setSchedules((current) =>
            current.map((schedule) =>
                schedule.id === scheduleId
                    ? { ...schedule, [field]: value }
                    : schedule,
            ),
        );
    }


    async function handleCreateRoutine(event) {
        event.preventDefault();

        const name = form.name.trim();
        const type = form.type.trim();

        if (!name) {
            setFormError("Informe o nome da rotina.");
            return;
        }

        if (!type) {
            setFormError("Informe o tipo da rotina.");
            return;
        }

        if (schedules.length === 0) {
            setFormError("Adicione pelo menos um horário.");
            return;
        }

        for (const schedule of schedules) {
            if (
                schedule.dayOfWeek === "" ||
                !schedule.startTime ||
                !schedule.endTime
            ) {
                setFormError("Preencha o dia e os horários de cada programação.");
                return;
            }

            if (schedule.startTime >= schedule.endTime) {
                setFormError(
                    "O horário inicial deve ser anterior ao horário final.",
                );
                return;
            }
        }

        for (let i = 0; i < schedules.length; i += 1) {
            for (let j = i + 1; j < schedules.length; j += 1) {
                const first = schedules[i];
                const second = schedules[j];

                const sameDay = first.dayOfWeek === second.dayOfWeek;
                const overlaps =
                    first.startTime < second.endTime &&
                    first.endTime > second.startTime;

                if (sameDay && overlaps) {
                    setFormError(
                        "Existem horários sobrepostos no mesmo dia.",
                    );
                    return;
                }
            }
        }

        let createdRoutine = null;

        try {
            setCreating(true);
            setFormError("");

            const response = await lifeApi.createRoutine({
                name,
                type,
            });

            createdRoutine = response.data;

            if (!createdRoutine?.id) {
                throw new Error(
                    "A API não retornou o identificador da rotina criada.",
                );
            }

            for (const schedule of schedules) {
                await lifeApi.createRoutineSchedule(createdRoutine.id, {
                    dayOfWeek: Number(schedule.dayOfWeek),
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                });
            }

            setIsModalOpen(false);

            setForm({
                name: "",
                type: "",
            });

            setSchedules([
                {
                    id: 1,
                    dayOfWeek: "",
                    startTime: "",
                    endTime: "",
                },
            ]);

            await loadRoutines();
        } catch (requestError) {
            console.error("Erro ao criar rotina e horários:", requestError);

            let cleanupFailed = false;

            if (createdRoutine?.id) {
                try {
                    await lifeApi.deleteRoutine(createdRoutine.id);
                } catch (cleanupError) {
                    cleanupFailed = true;
                    console.error(
                        "Não foi possível desfazer a criação da rotina:",
                        cleanupError,
                    );
                }
            }

            const apiMessage =
                requestError.response?.data?.message ||
                requestError.message;

            setFormError(
                cleanupFailed
                    ? "Não foi possível salvar todos os horários e a rotina pode ter ficado cadastrada parcialmente. Atualize a lista e confira os dados."
                    : apiMessage ||
                    "Não foi possível criar a rotina e salvar seus horários.",
            );
        } finally {
            setCreating(false);
        }
    }

    const filteredRoutines = useMemo(() => {
        switch (activeFilter) {
            case "today":

                return routines.filter((routine) => routine.isActive);

            case "active":
                return routines.filter((routine) => routine.isActive);

            case "completed":

                return [];

            case "all":
            default:
                return routines;
        }
    }, [activeFilter, routines]);

    const activeRoutines = routines.filter(
        (routine) => routine.isActive,
    ).length;

    return (
        <>
            <section className="planner-page">
                <div className="planner-heading">
                    <div>
                        <h1>Rotinas</h1>
                        <p>Construa constância, um dia de cada vez.</p>
                    </div>

                    <button
                        type="button"
                        className="planner-primary"
                        onClick={openCreateModal}
                    >
                        <Plus />
                        Nova rotina
                    </button>
                </div>

                <article className="routines-summary">
                    <div>
                        <strong>Resumo semanal</strong>
                        <span>Esta semana</span>
                    </div>

                    <Stat
                        icon={CheckCircle2}
                        num="0"
                        label="concluídas"
                        tone="purple"
                    />

                    <Stat
                        icon={Repeat2}
                        num={String(activeRoutines)}
                        label="em andamento"
                        tone="orange"
                    />

                    <Stat
                        icon={Star}
                        num="0"
                        label="concluídas"
                        tone="green"
                    />

                    <div className="routine-rate">
                        <i>{completionRate}%</i>
                        <span>taxa de conclusão</span>
                    </div>

                </article>

                <div className="planner-filter">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            type="button"
                            className={activeFilter === filter.key ? "active" : ""}
                            onClick={() => setActiveFilter(filter.key)}
                        >
                            {filter.label}
                        </button>
                    ))}

                    <div className="routine-view-toggle">
                        <button
                            type="button"
                            className={viewMode === "grid" ? "active" : ""}
                            onClick={() => setViewMode("grid")}
                            aria-label="Visualização em grade"
                            title="Visualização em grade"
                        >
                            <Grid3x3 />
                        </button>

                        <button
                            type="button"
                            className={viewMode === "list" ? "active" : ""}
                            onClick={() => setViewMode("list")}
                            aria-label="Visualização em lista"
                            title="Visualização em lista"
                        >
                            <List />
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="routine-grid">
                        <p>Carregando suas rotinas...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="routine-grid">
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && filteredRoutines.length === 0 && (
                    <div className="routine-grid">
                        <p>
                            {activeFilter === "completed"
                                ? "Você ainda não possui rotinas concluídas."
                                : "Nenhuma rotina encontrada."}
                        </p>
                    </div>
                )}

                {!loading && !error && filteredRoutines.length > 0 && (
                    <div className={`routine-grid ${viewMode === "list" ? "list-view" : ""}`}>
                        {filteredRoutines.map((routine) => {
                            const config = getRoutineConfig(routine.type);
                            const Icon = config.icon;

                            return (
                                <article
                                    className={`routine-card ${config.tone}`}
                                    key={routine.id}
                                >
                                    <div className="routine-card-top">
                                        <i>
                                            <Icon />
                                        </i>

                                        <div>
                                            <h2>{routine.name}</h2>
                                            <p>{routine.type}</p>
                                        </div>

                                        <b>
                                            {routine.isActive
                                                ? "Em andamento"
                                                : "Inativa"}
                                        </b>
                                    </div>

                                    <div className="routine-data">
                                        <div>
                                            <span>Sequência atual</span>
                                            <strong>
                                                <Flame />
                                                0 dias
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Frequência</span>
                                            <strong>Não definida</strong>
                                        </div>

                                        <div>
                                            <span>Próxima</span>
                                            <strong>Não definida</strong>
                                        </div>
                                    </div>

                                    <div className="routine-progress">
                                        <i style={{ width: "0%" }} />
                                        <span>0%</span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {isModalOpen && (
                <div
                    className="routine-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeCreateModal();
                        }
                    }}
                >
                    <div
                        className="routine-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="new-routine-title"
                    >
                        <div className="routine-modal-header">
                            <div>
                                <h2 id="new-routine-title">Nova rotina</h2>
                                <p>
                                    Crie uma rotina para acompanhar sua constância.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="routine-modal-close"
                                onClick={closeCreateModal}
                                disabled={creating}
                                aria-label="Fechar"
                            >
                                <X />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRoutine}>
                            <div className="routine-modal-body">
                                <label>
                                    <span>Nome da rotina</span>

                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleFormChange}
                                        placeholder="Ex.: Treino da manhã"
                                        maxLength={100}
                                        autoFocus
                                        disabled={creating}
                                    />
                                </label>

                                <label>
                                    <span>Tipo</span>

                                    <input
                                        type="text"
                                        name="type"
                                        value={form.type}
                                        onChange={handleFormChange}
                                        placeholder="Ex.: Atividade física"
                                        maxLength={50}
                                        disabled={creating}
                                    />
                                </label>


                                <div className="routine-schedules">
                                    <div className="routine-schedules-heading">
                                        <div>
                                            <strong>Programação semanal</strong>
                                            <p>Escolha os dias e horários da rotina.</p>
                                        </div>

                                        <button
                                            type="button"
                                            className="routine-modal-secondary"
                                            onClick={addSchedule}
                                            disabled={creating}
                                        >
                                            <Plus size={16} />
                                            Adicionar horário
                                        </button>
                                    </div>

                                    {schedules.map((schedule, index) => (
                                        <div className="routine-schedule-row" key={schedule.id}>
                                            <label>
                                                <span>Dia da semana</span>

                                                <select
                                                    value={schedule.dayOfWeek}
                                                    onChange={(event) =>
                                                        handleScheduleChange(
                                                            schedule.id,
                                                            "dayOfWeek",
                                                            event.target.value,
                                                        )
                                                    }
                                                    disabled={creating}
                                                >
                                                    <option value="">Selecione</option>
                                                    <option value="0">Domingo</option>
                                                    <option value="1">Segunda-feira</option>
                                                    <option value="2">Terça-feira</option>
                                                    <option value="3">Quarta-feira</option>
                                                    <option value="4">Quinta-feira</option>
                                                    <option value="5">Sexta-feira</option>
                                                    <option value="6">Sábado</option>
                                                </select>
                                            </label>

                                            <label>
                                                <span>Início</span>

                                                <input
                                                    type="time"
                                                    value={schedule.startTime}
                                                    onChange={(event) =>
                                                        handleScheduleChange(
                                                            schedule.id,
                                                            "startTime",
                                                            event.target.value,
                                                        )
                                                    }
                                                    disabled={creating}
                                                />
                                            </label>

                                            <label>
                                                <span>Término</span>

                                                <input
                                                    type="time"
                                                    value={schedule.endTime}
                                                    onChange={(event) =>
                                                        handleScheduleChange(
                                                            schedule.id,
                                                            "endTime",
                                                            event.target.value,
                                                        )
                                                    }
                                                    disabled={creating}
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                className="routine-schedule-remove"
                                                onClick={() => removeSchedule(schedule.id)}
                                                disabled={creating || schedules.length === 1}
                                                aria-label={`Remover horário ${index + 1}`}
                                                title="Remover horário"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {formError && (
                                    <p className="routine-modal-error">
                                        {formError}
                                    </p>
                                )}
                            </div>

                            <div className="routine-modal-footer">
                                <button
                                    type="button"
                                    className="routine-modal-secondary"
                                    onClick={closeCreateModal}
                                    disabled={creating}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="planner-primary"
                                    disabled={creating}
                                >
                                    {creating ? "Criando..." : "Criar rotina"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

function Stat({ icon: Icon, num, label, tone }) {
    return (
        <div className={`routine-stat ${tone}`}>
            <i>
                <Icon />
            </i>

            <strong>
                {num}
                <span>{label}</span>
            </strong>
        </div>
    );
}

export default Routines;