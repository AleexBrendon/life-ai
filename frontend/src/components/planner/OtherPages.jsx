import {
    Bell,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Circle,
    Clock3,
    Mail,
    MoreHorizontal,
    Plus,
    Puzzle,
    ShieldCheck,
    SlidersHorizontal,
    Star,
    Target,
    Trash2,
    UserRound,
    X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { lifeApi } from "../../lib/api";

const tones = ["green", "purple", "orange", "blue"];

function Heading({ title, text, action }) {
    return (
        <div className="planner-heading">
            <div>
                <h1>{title}</h1>
                <p>{text}</p>
            </div>

            {action}
        </div>
    );
}


function MiniStats({ data }) {
    return (
        <div className="other-stats">
            {data.map(([title, note, value, percentage = 0], index) => {
                const progress = Math.max(
                    0,
                    Math.min(100, Number(percentage) || 0)
                );

                return (
                    <article
                        className={tones[index % tones.length]}
                        key={title}
                    >
                        <h2>
                            {title}
                            <ChevronRight />
                        </h2>

                        <div>
                            <i>
                                <Target />
                            </i>

                            <strong>
                                {value}
                                <span>{note}</span>
                            </strong>
                        </div>

                        <em
                            role="progressbar"
                            aria-label={`Progresso: ${title}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progress}
                        >
                            <i
                                style={{
                                    width: `${progress}%`,
                                    transition: "width 0.3s ease",
                                }}
                            />
                        </em>

                        <p>
                            {note}
                            <b>{progress}%</b>
                        </p>
                    </article>
                );
            })}
        </div>
    );
}

/* =========================================================
   REMINDERS
========================================================= */

function formatTime(value) {
    if (!value) return "--:--";

    if (typeof value === "string" && /^\d{2}:\d{2}/.test(value)) {
        return value.slice(0, 5);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 5);
    }

    return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getReminderDay(reminder) {
    if (reminder.date) {
        const date = new Date(reminder.date);

        if (!Number.isNaN(date.getTime())) {
            const today = new Date();

            const todayStart = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
            );

            const reminderStart = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            );

            const difference =
                (reminderStart - todayStart) / (1000 * 60 * 60 * 24);

            if (difference === 0) return "Hoje";
            if (difference === 1) return "Amanhã";

            return date.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
            });
        }
    }

    if (reminder.recurrence === "DAILY") {
        return "Hoje";
    }

    if (reminder.recurrence === "WEEKLY") {
        return "Esta semana";
    }

    return "Próximos";
}

function isCompleted(reminder) {
    return (
        reminder.isCompleted === true ||
        reminder.status === "COMPLETED"
    );
}

function isActive(reminder) {
    return reminder.isActive !== false;
}

function isPostponed(reminder) {
    return reminder.isActive === false && !isCompleted(reminder);
}

function getReminderLabel(reminder) {
    if (reminder.recurrence === "DAILY") {
        return "Diário";
    }

    if (reminder.recurrence === "WEEKLY") {
        return "Recorrente";
    }

    if (reminder.recurrence === "NONE") {
        return "Único";
    }

    return null;
}

export function Reminders() {
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [form, setForm] = useState({
        title: "",
        description: "",
        reminderTime: "",
        date: "",
        dayOfWeek: "",
        recurrence: "NONE",
    });

    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const [reminders, setReminders] = useState([]);
    const [activeTab, setActiveTab] = useState("upcoming");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedReminder, setSelectedReminder] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const loadReminders = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await lifeApi.reminders();

            const loadedReminders = response?.data || [];

            setReminders(
                Array.isArray(loadedReminders)
                    ? loadedReminders
                    : []
            );
        } catch (err) {
            console.error("Erro ao carregar lembretes:", err);

            setError(
                err?.response?.data?.message ||
                "Não foi possível carregar seus lembretes."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReminders();
    }, []);

    const upcoming = useMemo(() => {
        return reminders
            .filter((reminder) => {
                return (
                    isActive(reminder) &&
                    !isCompleted(reminder)
                );
            })
            .sort((a, b) => {
                const timeA = a.reminderTime || "";
                const timeB = b.reminderTime || "";

                return timeA.localeCompare(timeB);
            });
    }, [reminders]);

    const postponed = useMemo(() => {
        return reminders.filter((reminder) => {
            return isPostponed(reminder);
        });
    }, [reminders]);

    const completed = useMemo(() => {
        return reminders.filter((reminder) => {
            return isCompleted(reminder);
        });
    }, [reminders]);

    const visibleReminders = useMemo(() => {
        if (activeTab === "postponed") {
            return postponed;
        }

        if (activeTab === "completed") {
            return completed;
        }

        return upcoming;
    }, [
        activeTab,
        upcoming,
        postponed,
        completed,
    ]);

    const groupedReminders = useMemo(() => {
        const groups = new Map();

        visibleReminders.forEach((reminder) => {
            const day = getReminderDay(reminder);

            if (!groups.has(day)) {
                groups.set(day, []);
            }

            groups.get(day).push(reminder);
        });

        return Array.from(groups.entries());
    }, [visibleReminders]);

    const stats = useMemo(() => {
        return [
            [
                "Próximos",
                upcoming.length === 1
                    ? "lembrete"
                    : "lembretes",
                String(upcoming.length),
            ],
            [
                "Adiadas",
                postponed.length === 1
                    ? "lembrete"
                    : "lembretes",
                String(postponed.length),
            ],
            [
                "Concluídos",
                completed.length === 1
                    ? "lembrete"
                    : "lembretes",
                String(completed.length),
            ],
            [
                "Ativos",
                "lembretes ativos",
                String(
                    reminders.filter((reminder) =>
                        isActive(reminder)
                    ).length
                ),
            ],
        ];
    }, [
        reminders,
        upcoming.length,
        postponed.length,
        completed.length,
    ]);

    const handleComplete = async (reminder) => {
        try {
            setActionLoading(true);

            await lifeApi.completeReminder(reminder.id);

            setReminders((current) =>
                current.map((item) =>
                    item.id === reminder.id
                        ? {
                            ...item,
                            isCompleted: true,
                        }
                        : item
                )
            );

            setSelectedReminder(null);
        } catch (err) {
            console.error(
                "Erro ao concluir lembrete:",
                err
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleActivate = async (reminder) => {
        try {
            setActionLoading(true);

            await lifeApi.activateReminder(reminder.id);

            setReminders((current) =>
                current.map((item) =>
                    item.id === reminder.id
                        ? {
                            ...item,
                            isActive: true,
                        }
                        : item
                )
            );

            setSelectedReminder(null);
        } catch (err) {
            console.error(
                "Erro ao ativar lembrete:",
                err
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeactivate = async (reminder) => {
        try {
            setActionLoading(true);

            await lifeApi.deactivateReminder(reminder.id);

            setReminders((current) =>
                current.map((item) =>
                    item.id === reminder.id
                        ? {
                            ...item,
                            isActive: false,
                        }
                        : item
                )
            );

            setSelectedReminder(null);
        } catch (err) {
            console.error(
                "Erro ao adiar lembrete:",
                err
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (reminder) => {
        try {
            setActionLoading(true);

            await lifeApi.deleteReminder(reminder.id);

            setReminders((current) =>
                current.filter(
                    (item) => item.id !== reminder.id
                )
            );

            setSelectedReminder(null);
        } catch (err) {
            console.error(
                "Erro ao excluir lembrete:",
                err
            );
        } finally {
            setActionLoading(false);
        }
    };

    const resetCreateForm = () => {
        setForm({
            title: "",
            description: "",
            reminderTime: "",
            date: "",
            dayOfWeek: "",
            recurrence: "NONE",
        });

        setCreateError("");
    };

    const openCreateModal = () => {
        resetCreateForm();
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        if (creating) return;

        setShowCreateModal(false);
        resetCreateForm();
    };

    const handleCreateChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleCreateReminder = async (event) => {
        event.preventDefault();

        if (!form.title.trim()) {
            setCreateError(
                "Informe o título do lembrete."
            );
            return;
        }

        if (!form.reminderTime) {
            setCreateError(
                "Informe o horário do lembrete."
            );
            return;
        }

        if (
            form.recurrence === "WEEKLY" &&
            !form.dayOfWeek
        ) {
            setCreateError(
                "Informe o dia da semana."
            );
            return;
        }

        if (
            form.recurrence === "NONE" &&
            !form.date
        ) {
            setCreateError(
                "Informe a data do lembrete."
            );
            return;
        }

        try {
            setCreating(true);
            setCreateError("");

            const payload = {
                title: form.title.trim(),
                description:
                    form.description.trim() || undefined,
                reminderTime: form.reminderTime,
                recurrence: form.recurrence,
                date:
                    form.recurrence === "NONE"
                        ? form.date
                        : undefined,
                dayOfWeek:
                    form.recurrence === "WEEKLY"
                        ? Number(form.dayOfWeek)
                        : undefined,
            };

            const response =
                await lifeApi.createReminder(payload);

            const createdReminder = response?.data;

            if (createdReminder) {
                setReminders((current) => [
                    ...current,
                    createdReminder,
                ]);
            } else {
                await loadReminders();
            }

            setShowCreateModal(false);
            resetCreateForm();
        } catch (err) {
            console.error(
                "Erro ao criar lembrete:",
                err
            );

            setCreateError(
                err?.response?.data?.message ||
                "Não foi possível criar o lembrete."
            );
        } finally {
            setCreating(false);
        }
    };

    return (
        <section className="planner-page">
            <Heading
                title="Lembretes"
                text="Não deixe o importante passar."
                action={
                    <button
                        className="primary-button"
                        type="button"
                        onClick={openCreateModal}
                    >
                        <Plus />
                        Novo lembrete
                    </button>
                }
            />

            <MiniStats data={stats} />

            <article className="reminder-list">
                <div className="reminder-tabs">
                    <button
                        type="button"
                        className={
                            activeTab === "upcoming"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveTab("upcoming")
                        }
                    >
                        Próximos
                        <span>{upcoming.length}</span>
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "postponed"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveTab("postponed")
                        }
                    >
                        Adiados
                        <span>{postponed.length}</span>
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "completed"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setActiveTab("completed")
                        }
                    >
                        Concluídos
                        <span>{completed.length}</span>
                    </button>

                    <button
                        type="button"
                        onClick={openCreateModal}
                    >
                        <Plus />
                        Criar lembrete
                    </button>
                </div>

                {loading && (
                    <div className="empty-state">
                        <p>
                            Carregando seus lembretes...
                        </p>
                    </div>
                )}

                {!loading && error && (
                    <div className="empty-state">
                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={loadReminders}
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {!loading &&
                    !error &&
                    visibleReminders.length === 0 && (
                        <div className="empty-state">
                            <Bell />

                            <strong>
                                {activeTab === "upcoming"
                                    ? "Nenhum lembrete próximo"
                                    : activeTab === "postponed"
                                        ? "Nenhum lembrete adiado"
                                        : "Nenhum lembrete concluído"}
                            </strong>

                            <p>
                                Seus lembretes aparecerão aqui
                                quando houver informações
                                cadastradas.
                            </p>

                            {activeTab === "upcoming" && (
                                <button
                                    type="button"
                                    onClick={openCreateModal}
                                >
                                    <Plus />
                                    Criar lembrete
                                </button>
                            )}
                        </div>
                    )}

                {!loading &&
                    !error &&
                    groupedReminders.map(
                        ([day, items]) => (
                            <div
                                className="reminder-group"
                                key={day}
                            >
                                <h2>{day}</h2>

                                {items.map((reminder) => {
                                    const recurring =
                                        getReminderLabel(
                                            reminder
                                        );

                                    const completed =
                                        isCompleted(reminder);

                                    return (
                                        <div
                                            className={`reminder-row ${completed
                                                ? "completed"
                                                : ""
                                                }`}
                                            key={reminder.id}
                                        >
                                            <b>
                                                {formatTime(
                                                    reminder.reminderTime
                                                )}
                                            </b>

                                            {completed ? (
                                                <CheckCircle2 />
                                            ) : (
                                                <Circle />
                                            )}

                                            <strong>
                                                {reminder.title}
                                            </strong>

                                            {recurring && (
                                                <em>
                                                    {recurring}
                                                </em>
                                            )}

                                            {reminder.description && (
                                                <span className="reminder-description">
                                                    {
                                                        reminder.description
                                                    }
                                                </span>
                                            )}

                                            <Mail />
                                            <Bell />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedReminder(
                                                        reminder
                                                    )
                                                }
                                                aria-label="Mais opções"
                                            >
                                                <MoreHorizontal />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
            </article>

            {selectedReminder && (
                <div
                    className="modal-overlay"
                    onClick={() => {
                        if (!actionLoading) {
                            setSelectedReminder(null);
                        }
                    }}
                >
                    <div
                        className="modal-card"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="modal-header">
                            <div>
                                <h2>
                                    {selectedReminder.title}
                                </h2>

                                <p>
                                    {formatTime(
                                        selectedReminder.reminderTime
                                    )}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedReminder(null)
                                }
                                disabled={actionLoading}
                            >
                                <X />
                            </button>
                        </div>

                        {selectedReminder.description && (
                            <p className="modal-description">
                                {
                                    selectedReminder.description
                                }
                            </p>
                        )}

                        <div className="modal-actions">
                            {!isCompleted(
                                selectedReminder
                            ) &&
                                isActive(
                                    selectedReminder
                                ) && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleComplete(
                                                selectedReminder
                                            )
                                        }
                                        disabled={actionLoading}
                                    >
                                        <CheckCircle2 />
                                        Concluir
                                    </button>
                                )}

                            {isActive(
                                selectedReminder
                            ) &&
                                !isCompleted(
                                    selectedReminder
                                ) && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDeactivate(
                                                selectedReminder
                                            )
                                        }
                                        disabled={actionLoading}
                                    >
                                        Adiar
                                    </button>
                                )}

                            {!isActive(
                                selectedReminder
                            ) &&
                                !isCompleted(
                                    selectedReminder
                                ) && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleActivate(
                                                selectedReminder
                                            )
                                        }
                                        disabled={actionLoading}
                                    >
                                        Ativar novamente
                                    </button>
                                )}

                            <button
                                type="button"
                                className="danger"
                                onClick={() =>
                                    handleDelete(
                                        selectedReminder
                                    )
                                }
                                disabled={actionLoading}
                            >
                                <Trash2 />
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div
                    className="modal-overlay"
                    onClick={closeCreateModal}
                >
                    <div
                        className="modal-card reminder-create-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="modal-header">
                            <div>
                                <h2>Novo lembrete</h2>

                                <p>
                                    Crie um lembrete para não
                                    esquecer o que importa.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeCreateModal}
                                disabled={creating}
                            >
                                <X />
                            </button>
                        </div>

                        <form
                            className="reminder-create-form"
                            onSubmit={handleCreateReminder}
                        >
                            <label>
                                <span>Título</span>

                                <input
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={
                                        handleCreateChange
                                    }
                                    placeholder="Ex.: Revisar meta trimestral"
                                    maxLength={120}
                                    autoFocus
                                />
                            </label>

                            <label>
                                <span>Descrição</span>

                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={
                                        handleCreateChange
                                    }
                                    placeholder="Adicione uma descrição opcional..."
                                    rows={3}
                                    maxLength={500}
                                />
                            </label>

                            <div className="reminder-form-grid">
                                <label>
                                    <span>
                                        <Clock3 />
                                        Horário
                                    </span>

                                    <input
                                        type="time"
                                        name="reminderTime"
                                        value={
                                            form.reminderTime
                                        }
                                        onChange={
                                            handleCreateChange
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        <CalendarDays />
                                        Data
                                    </span>

                                    <input
                                        type="date"
                                        name="date"
                                        value={form.date}
                                        onChange={
                                            handleCreateChange
                                        }
                                        disabled={
                                            form.recurrence !==
                                            "NONE"
                                        }
                                    />
                                </label>
                            </div>

                            <label>
                                <span>Recorrência</span>

                                <select
                                    name="recurrence"
                                    value={
                                        form.recurrence
                                    }
                                    onChange={
                                        handleCreateChange
                                    }
                                >
                                    <option value="NONE">
                                        Não repetir
                                    </option>

                                    <option value="DAILY">
                                        Todos os dias
                                    </option>

                                    <option value="WEEKLY">
                                        Toda semana
                                    </option>
                                </select>
                            </label>

                            {form.recurrence ===
                                "WEEKLY" && (
                                    <label>
                                        <span>
                                            Dia da semana
                                        </span>

                                        <select
                                            name="dayOfWeek"
                                            value={
                                                form.dayOfWeek
                                            }
                                            onChange={
                                                handleCreateChange
                                            }
                                        >
                                            <option value="">
                                                Selecione...
                                            </option>
                                            <option value="0">
                                                Domingo
                                            </option>
                                            <option value="1">
                                                Segunda-feira
                                            </option>
                                            <option value="2">
                                                Terça-feira
                                            </option>
                                            <option value="3">
                                                Quarta-feira
                                            </option>
                                            <option value="4">
                                                Quinta-feira
                                            </option>
                                            <option value="5">
                                                Sexta-feira
                                            </option>
                                            <option value="6">
                                                Sábado
                                            </option>
                                        </select>
                                    </label>
                                )}

                            {form.recurrence !== "NONE" && (
                                <div className="reminder-form-info">
                                    <Bell />

                                    <span>
                                        Esse lembrete será
                                        recorrente. A execução
                                        de cada dia será
                                        controlada
                                        separadamente.
                                    </span>
                                </div>
                            )}

                            {createError && (
                                <div className="reminder-form-error">
                                    {createError}
                                </div>
                            )}

                            <div className="reminder-create-actions">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    disabled={creating}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="primary"
                                    disabled={creating}
                                >
                                    {creating ? (
                                        "Criando..."
                                    ) : (
                                        <>
                                            <Plus />
                                            Criar lembrete
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

/* =========================================================
   SHARED COMPONENTS — RECUPERADOS
========================================================= */


function Chart({ title, jobs = [] }) {
    console.log(
        "STATUS RECEBIDOS PELO GRÁFICO:",
        jobs.map((job) => ({
            id: job.id,
            title: job.title,
            status: job.status,
        }))
    );

    const allJobs = Array.isArray(jobs) ? jobs : [];

    const completed = allJobs.filter(
        (job) => job.status === "COMPLETED"
    ).length;

    const inProgress = allJobs.filter(
        (job) => job.status === "IN_PROGRESS"
    ).length;

    const pending = allJobs.filter(
        (job) => job.status === "TODO"
    ).length;

    const total = allJobs.length;

    const progress = total > 0
        ? Math.round((completed / total) * 100)
        : 0;

    return (
        <article className="daily-progress-chart">
            <h2>{title}</h2>

            <div className="daily-progress-chart__summary">
                <div>
                    <strong>{progress}%</strong>
                    <span>das tarefas concluídas</span>
                </div>

                <span>
                    {completed} de {total} tarefas
                </span>
            </div>

            <div
                className="daily-progress-chart__track"
                role="progressbar"
                aria-label="Progresso das tarefas"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
            >
                <div
                    className="daily-progress-chart__fill"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="daily-progress-chart__legend">
                <div>
                    <span className="daily-progress-chart__dot pending" />
                    <span>A fazer</span>
                    <strong>{pending}</strong>
                </div>

                <div>
                    <span className="daily-progress-chart__dot in-progress" />
                    <span>Em andamento</span>
                    <strong>{inProgress}</strong>
                </div>

                <div>
                    <span className="daily-progress-chart__dot completed" />
                    <span>Concluídas</span>
                    <strong>{completed}</strong>
                </div>
            </div>

            {total === 0 && (
                <p className="daily-progress-chart__empty">
                    Nenhuma tarefa encontrada.
                </p>
            )}
        </article>
    );
}

function Insight({ title }) {
    return (
        <div className="insight-card">
            <Star />

            <strong>{title}</strong>

            <p>
                Você conclui mais tarefas e tem mais foco
                nas quartas-feiras.
            </p>

            <small>
                Evidência 6 semanas de dados
            </small>
        </div>
    );
}

/* =========================================================
   INSIGHTS
========================================================= */

export function Insights() {
    const [dashboard, setDashboard] = useState(null);
    const [today, setToday] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;
        Promise.all([lifeApi.dashboard(), lifeApi.today()])
            .then(([dashboardResponse, todayResponse]) => {
                if (!mounted) return;
                setDashboard(dashboardResponse?.data || dashboardResponse || null);
                setToday(todayResponse?.data || todayResponse || null);
            })
            .catch((err) => {
                console.error("Erro ao carregar insights:", err);
                if (mounted) setError(err?.response?.data?.message || "Não foi possível carregar seus dados.");
            })
            .finally(() => mounted && setLoading(false));
        return () => { mounted = false; };
    }, []);


    const metrics = useMemo(() => {
        const allJobs = Array.isArray(jobs) ? jobs : [];

        const completed = allJobs.filter(
            (job) => job.status === "COMPLETED"
        ).length;

        const inProgress = allJobs.filter(
            (job) => job.status === "IN_PROGRESS"
        ).length;

        const pending = allJobs.filter(
            (job) => job.status === "TODO"
        ).length;

        const total = allJobs.length;

        const completion = total
            ? Math.round((completed / total) * 100)
            : 0;

        return [
            ["Resumo do dia", "tarefas concluídas", String(completed)],
            ["Progresso", "taxa de conclusão", `${completion}%`],
            ["Pendentes", "tarefas a fazer", String(pending)],
            ["Total", "tarefas acompanhadas", String(total)],
        ];
    }, [jobs]);


    return (
        <section className="planner-page">
            <Heading title="Insights" text="Entenda seus padrões. Decida melhor." />
            {loading ? <div className="empty-state"><p>Carregando seus dados...</p></div> :
                error ? <div className="empty-state"><p>{error}</p></div> : <>
                    <MiniStats data={metrics} />
                    <div className="insight-charts">
                        <Chart title="Resumo da produtividade" />
                        <article><h2>Distribuição do dia</h2><div className="donut">{metrics[1][2]}</div>
                            <p>● Concluídos {metrics[0][2]}</p><p>● Pendentes {metrics[2][2]}</p></article>
                        <article><h2>Dados disponíveis</h2><div className="focus-map">
                            {Array.from({ length: 49 }, (_, i) => <i className={`heat-${i % 6}`} key={i} />)}
                        </div></article>
                    </div>
                    <div className="insight-bottom">
                        <article><h2>Resumo baseado nos seus dados</h2><div>
                            <Insight title={`Você concluiu ${metrics[0][2]} item(ns)`} />
                            <Insight title={`${metrics[2][2]} item(ns) ainda estão pendentes`} />
                        </div></article>
                        <article><h2>Dados do dia</h2><p>Indicadores carregados diretamente da sua agenda e do seu dashboard.</p></article>
                    </div>
                </>}
        </section>
    );
}

function unwrapApiPayload(response) {
    return response?.data?.data ??
        response?.data ??
        response;
}

function getApiErrorMessage(error, fallback) {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        fallback
    );
}


const JOB_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"];

export function Work() {
    const [jobs, setJobs] = useState([]);
    const [today, setToday] = useState(null);
    const [calendar, setCalendar] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const [draggedJobId, setDraggedJobId] = useState(null);
    const [dragOverStatus, setDragOverStatus] = useState(null);

    const [movingJobIds, setMovingJobIds] = useState([]);

    const [editingJob, setEditingJob] = useState(null);
    const [updatingJob, setUpdatingJob] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingJob, setDeletingJob] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const [form, setForm] = useState({
        name: "",
        company: "",
        position: "",
        workType: "",
        location: "",
    });

    const loadWork = async () => {
        try {
            setLoading(true);
            setError("");

            // Usa a data local para evitar diferenças de fuso horário.
            const now = new Date();
            const date = [
                now.getFullYear(),
                String(now.getMonth() + 1).padStart(2, "0"),
                String(now.getDate()).padStart(2, "0"),
            ].join("-");

            const [jobsResponse, todayResponse, calendarResponse] =
                await Promise.all([
                    lifeApi.jobs(),
                    lifeApi.today(),
                    lifeApi.calendar(date),
                ]);

            const loadedJobs = unwrapApiPayload(jobsResponse);
            const todayData = unwrapApiPayload(todayResponse);
            const calendarData = unwrapApiPayload(calendarResponse);

            if (!Array.isArray(loadedJobs)) {
                throw new Error(
                    "A API retornou um formato inválido para os trabalhos."
                );
            }

            setJobs(
                loadedJobs.map((job) => ({
                    ...job,
                    status: JOB_STATUSES.includes(job.status)
                        ? job.status
                        : "TODO",
                }))
            );

            setToday(todayData ?? null);
            setCalendar(calendarData ?? null);
        } catch (err) {
            console.error("Erro ao carregar trabalho:", err);

            setError(
                getApiErrorMessage(
                    err,
                    "Não foi possível carregar seus dados de trabalho."
                )
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWork();
    }, []);


    const tasks = useMemo(() => {
        const source = today || {};
        const cal = calendar || {};

        const found = [
            cal.items,
            cal.events,
            source.tasks,
            source.items,
            source.activities,
            source.schedule,
        ].find(Array.isArray);

        const calendarTasks = Array.isArray(found)
            ? found.map((item, index) => ({
                id: `activity-${item.id ?? index}`,
                title:
                    item.title ||
                    item.name ||
                    item.description ||
                    `Atividade ${index + 1}`,
                completed:
                    item.isCompleted === true ||
                    item.completed === true ||
                    ["COMPLETED", "DONE"].includes(
                        String(item.status || "").toUpperCase()
                    ),
                status: item.status || null,
                time:
                    item.startTime ||
                    item.reminderTime ||
                    item.time ||
                    "",
                type: "activity",
            }))
            : [];

        const jobTasks = jobs.map((job) => ({
            id: `job-${job.id}`,
            title: job.name,
            completed: job.status === "COMPLETED",
            status: job.status || "TODO",
            time: "",
            type: "job",
        }));

        return [...jobTasks, ...calendarTasks];
    }, [jobs, today, calendar]);


    const completed = tasks.filter(
        (task) => task.completed
    );

    const pending = tasks.filter(
        (task) => !task.completed
    );

    const jobColumns = {
        TODO: jobs.filter(
            (job) =>
                (job.status || "TODO") === "TODO"
        ),

        IN_PROGRESS: jobs.filter(
            (job) =>
                job.status === "IN_PROGRESS"
        ),

        COMPLETED: jobs.filter(
            (job) =>
                job.status === "COMPLETED"
        ),
    };


    const totalJobs = jobs.length;

    const getPercentage = (count) =>
        totalJobs > 0
            ? Math.round((count / totalJobs) * 100)
            : 0;

    const stats = [
        [
            "Trabalhos",
            "cadastrados",
            String(totalJobs),
            totalJobs > 0 ? 100 : 0,
        ],
        [
            "A fazer",
            "trabalhos pendentes",
            String(jobColumns.TODO.length),
            getPercentage(jobColumns.TODO.length),
        ],
        [
            "Em andamento",
            "trabalhos em andamento",
            String(jobColumns.IN_PROGRESS.length),
            getPercentage(jobColumns.IN_PROGRESS.length),
        ],
        [
            "Concluídos",
            "trabalhos concluídos",
            String(jobColumns.COMPLETED.length),
            getPercentage(jobColumns.COMPLETED.length),
        ],
    ];


    const resetCreateForm = () => {
        setForm({
            name: "",
            company: "",
            position: "",
            workType: "",
            location: "",
        });

        setCreateError("");
    };

    const openCreateModal = () => {
        setEditingJob(null);
        resetCreateForm();
        setShowCreateModal(true);
    };

    const openEditModal = (job) => {
        setEditingJob(job);

        setForm({
            name: job.name ?? "",
            company: job.company ?? "",
            position: job.position ?? "",
            workType: job.workType ?? "",
            location: job.location ?? "",
        });

        setCreateError("");
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        if (creating) {
            return;
        }

        setShowCreateModal(false);
        setEditingJob(null);
        resetCreateForm();
    };

    const handleCreateChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleCreateJob = async (event) => {
        event.preventDefault();

        if (!form.name.trim()) {
            setCreateError("Informe o nome do trabalho.");
            return;
        }

        try {
            setCreating(true);
            setCreateError("");

            const payload = {
                name: form.name.trim(),
                company: form.company.trim() || undefined,
                position: form.position.trim() || undefined,
                workType: form.workType.trim() || undefined,
                location: form.location.trim() || undefined,
                isActive: true,
                status: "TODO",
            };

            const response = await lifeApi.createJob(payload);
            const createdJob = unwrapApiPayload(response);

            if (
                createdJob &&
                typeof createdJob === "object" &&
                createdJob.id != null
            ) {
                setJobs((current) => [
                    ...current,
                    {
                        ...createdJob,
                        status: JOB_STATUSES.includes(createdJob.status)
                            ? createdJob.status
                            : "TODO",
                    },
                ]);
            } else {
                await loadWork();
            }

            setShowCreateModal(false);
            resetCreateForm();
        } catch (err) {
            console.error("Erro ao criar trabalho:", err);

            setCreateError(
                getApiErrorMessage(
                    err,
                    "Não foi possível criar o trabalho."
                )
            );
        } finally {
            setCreating(false);
        }
    };


    const handleUpdateJob = async (event) => {
        event.preventDefault();

        if (!editingJob) return;

        if (!form.name.trim()) {
            setCreateError("Informe o nome do trabalho.");
            return;
        }

        try {
            setUpdatingJob(true);
            setCreateError("");

            const payload = {
                name: form.name.trim(),
                company: form.company.trim(),
                position: form.position.trim(),
                workType: form.workType.trim(),
                location: form.location.trim(),
            };

            const response = await lifeApi.updateJob(
                editingJob.id,
                payload
            );

            const result = unwrapApiPayload(response);

            const updatedJob =
                result?.id != null
                    ? result
                    : result?.data?.id != null
                        ? result.data
                        : null;

            if (!updatedJob) {
                throw new Error(
                    "O trabalho foi enviado, mas não foi possível confirmar os dados atualizados."
                );
            }

            setJobs((current) =>
                current.map((job) =>
                    String(job.id) === String(editingJob.id)
                        ? { ...job, ...updatedJob }
                        : job
                )
            );

            setShowCreateModal(false);
            setEditingJob(null);
            resetCreateForm();
        } catch (error) {
            console.error("Erro ao atualizar trabalho:", error);

            setCreateError(
                getApiErrorMessage(
                    error,
                    "Não foi possível atualizar o trabalho."
                )
            );
        } finally {
            setUpdatingJob(false);
        }
    };


    const openDeleteConfirm = () => {
        setDeleteError("");
        setShowCreateModal(false);
        setShowDeleteConfirm(true);
    };

    const handleDeleteJob = async () => {
        if (!editingJob) return;

        try {
            setDeletingJob(true);
            setDeleteError("");

            await lifeApi.deleteJob(editingJob.id);

            setJobs((current) =>
                current.filter(
                    (job) =>
                        String(job.id) !== String(editingJob.id)
                )
            );

            setShowDeleteConfirm(false);
            setEditingJob(null);
            resetCreateForm();
        } catch (error) {
            console.error("Erro ao excluir trabalho:", error);

            setDeleteError(
                getApiErrorMessage(
                    error,
                    "Não foi possível excluir o trabalho."
                )
            );
        } finally {
            setDeletingJob(false);
        }
    };

    const moveJob = async (jobId, newStatus) => {
        if (!JOB_STATUSES.includes(newStatus)) {
            setError("A coluna de destino é inválida.");
            return;
        }

        const currentJob = jobs.find(
            (job) => String(job.id) === String(jobId)
        );

        if (!currentJob) {
            setError("Não foi possível encontrar esse trabalho.");
            return;
        }

        const currentStatus = currentJob.status || "TODO";

        if (
            currentStatus === newStatus ||
            movingJobIds.some((id) => String(id) === String(jobId))
        ) {
            return;
        }

        try {
            setError("");

            setMovingJobIds((current) => [...current, jobId]);

            // Aguarda a confirmação do backend antes de mover o cartão.
            const response = await lifeApi.updateJob(jobId, {
                status: newStatus,
            });

            const updatedJob = unwrapApiPayload(response);

            if (
                updatedJob?.status &&
                !JOB_STATUSES.includes(updatedJob.status)
            ) {
                throw new Error(
                    "O servidor retornou um status de trabalho inválido."
                );
            }

            const confirmedStatus =
                updatedJob?.status || newStatus;

            setJobs((current) =>
                current.map((job) =>
                    String(job.id) === String(jobId)
                        ? {
                            ...job,
                            ...(updatedJob &&
                                typeof updatedJob === "object"
                                ? updatedJob
                                : {}),
                            status: confirmedStatus,
                        }
                        : job
                )
            );
        } catch (err) {
            console.error(
                "Erro ao atualizar status do trabalho:",
                err
            );

            setError(
                getApiErrorMessage(
                    err,
                    "Não foi possível mover o trabalho. A alteração não foi aplicada."
                )
            );
        } finally {
            setMovingJobIds((current) =>
                current.filter(
                    (id) => String(id) !== String(jobId)
                )
            );

            setDraggedJobId(null);
            setDragOverStatus(null);
        }
    };


    const handleDragStart = (event, jobId) => {
        if (movingJobIds.some((id) => String(id) === String(jobId))) {
            event.preventDefault();
            return;
        }

        setDraggedJobId(jobId);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(jobId));
    };

    const handleDragEnd = () => {
        setDraggedJobId(null);
        setDragOverStatus(null);
    };

    const handleDragOver = (event, status) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDragOverStatus(status);
    };

    const handleDragLeave = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragOverStatus(null);
        }
    };

    const handleDrop = async (event, status) => {
        event.preventDefault();
        setDragOverStatus(null);

        const rawJobId = event.dataTransfer.getData("text/plain");
        const jobId = Number(rawJobId);

        if (!rawJobId || !Number.isSafeInteger(jobId) || jobId <= 0) {
            setDraggedJobId(null);
            return;
        }

        await moveJob(jobId, status);
    };

    return (
        <section className="planner-page">
            <Heading
                title="Trabalho"
                text="Organize suas entregas com clareza."
                action={
                    <button
                        className="primary-button"
                        type="button"
                        onClick={
                            openCreateModal
                        }
                    >
                        <Plus />
                        Novo trabalho
                    </button>
                }
            />

            {loading ? (
                <div className="empty-state">
                    <p>
                        Carregando sua agenda...
                    </p>
                </div>
            ) : error ? (
                <div className="empty-state">
                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={loadWork}
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : (
                <>
                    <MiniStats
                        data={stats}
                    />

                    {jobs.length > 0 && (
                        <article className="work-jobs-list">
                            <div className="planner-section-heading">
                                <div>
                                    <h2>
                                        Meus trabalhos
                                    </h2>

                                    <p>
                                        Trabalhos cadastrados
                                        na sua agenda.
                                    </p>
                                </div>
                            </div>

                            <div className="work-job-cards">
                                {jobs.map(
                                    (job) => (

                                        <div
                                            className="work-job-card"
                                            key={job.id}
                                            role="button"
                                            tabIndex={0}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => openEditModal(job)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    openEditModal(job);
                                                }
                                            }}
                                        >
                                            <div>
                                                <strong>
                                                    {
                                                        job.name
                                                    }
                                                </strong>

                                                {job.company && (
                                                    <span>
                                                        {
                                                            job.company
                                                        }
                                                    </span>
                                                )}

                                                {job.position && (
                                                    <small>
                                                        {
                                                            job.position
                                                        }
                                                    </small>
                                                )}
                                            </div>

                                            <b>
                                                {job.isActive ===
                                                    false
                                                    ? "Inativo"
                                                    : "Ativo"}
                                            </b>
                                        </div>
                                    )
                                )}
                            </div>
                        </article>
                    )}

                    <div className="work-layout">
                        <article className="kanban">
                            {[
                                [
                                    "A fazer",
                                    "TODO",
                                ],
                                [
                                    "Em andamento",
                                    "IN_PROGRESS",
                                ],
                                [
                                    "Concluído",
                                    "COMPLETED",
                                ],
                            ].map(
                                ([
                                    column,
                                    status,
                                ]) => {
                                    const columnJobs =
                                        jobColumns[
                                        status
                                        ];

                                    return (
                                        <div
                                            className={`kanban-col ${dragOverStatus ===
                                                status
                                                ? "drag-over"
                                                : ""
                                                }`}
                                            key={
                                                status
                                            }
                                            onDragOver={(
                                                event
                                            ) =>
                                                handleDragOver(
                                                    event,
                                                    status
                                                )
                                            }
                                            onDragLeave={
                                                handleDragLeave
                                            }
                                            onDrop={(
                                                event
                                            ) =>
                                                handleDrop(
                                                    event,
                                                    status
                                                )
                                            }
                                        >
                                            <h2>
                                                {
                                                    column
                                                }

                                                <span>
                                                    {
                                                        columnJobs.length
                                                    }
                                                </span>
                                            </h2>

                                            {columnJobs.map(
                                                (
                                                    job
                                                ) => {
                                                    const currentStatus =
                                                        job.status ||
                                                        "TODO";
                                                    const isMoving = movingJobIds.some(
                                                        (id) => String(id) === String(job.id)
                                                    );
                                                    return (

                                                        <div
                                                            className={`work-task ${String(draggedJobId) === String(job.id) ? "dragging" : ""
                                                                } ${isMoving ? "moving" : ""}`}
                                                            key={job.id}
                                                            draggable={!isMoving}
                                                            aria-busy={isMoving}
                                                            title={
                                                                isMoving
                                                                    ? "Salvando alteração..."
                                                                    : "Arraste para mudar o status"
                                                            }
                                                            onDragStart={(event) => handleDragStart(event, job.id)}
                                                            onDragEnd={handleDragEnd}
                                                        >
                                                            {currentStatus ===
                                                                "COMPLETED" ? (
                                                                <CheckCircle2 />
                                                            ) : (
                                                                <Circle />
                                                            )}

                                                            <div>
                                                                <strong>
                                                                    {
                                                                        job.name
                                                                    }
                                                                </strong>

                                                                {job.company && (
                                                                    <small>
                                                                        {
                                                                            job.company
                                                                        }
                                                                    </small>
                                                                )}

                                                                {job.position && (
                                                                    <small>
                                                                        {
                                                                            job.position
                                                                        }
                                                                    </small>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )}

                                            {!columnJobs.length && (
                                                <div className="empty-state">
                                                    <p>
                                                        {dragOverStatus ===
                                                            status
                                                            ? "Solte o trabalho aqui."
                                                            : "Nenhum trabalho aqui."}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </article>

                        <aside className="work-side">
                            <article>
                                <h2>
                                    Atividades do dia
                                </h2>

                                {!tasks.length ? (
                                    <p>
                                        Nenhuma atividade
                                        encontrada.
                                    </p>
                                ) : (
                                    tasks
                                        .slice(
                                            0,
                                            5
                                        )
                                        .map(
                                            (
                                                task
                                            ) => (
                                                <p
                                                    key={
                                                        task.id
                                                    }
                                                >
                                                    {task.completed
                                                        ? "✓"
                                                        : "↑"}{" "}
                                                    {
                                                        task.title
                                                    }

                                                    {task.time && (
                                                        <b>
                                                            {
                                                                task.time
                                                            }
                                                        </b>
                                                    )}
                                                </p>
                                            )
                                        )
                                )}
                            </article>


                            <Chart
                                title="Progresso das tarefas"
                                jobs={jobs}
                            />

                        </aside>
                    </div>
                </>
            )}

            {showCreateModal && (
                <div
                    className="modal-overlay"
                    onClick={
                        closeCreateModal
                    }
                >
                    <div
                        className="modal-card reminder-create-modal"
                        onClick={(
                            event
                        ) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="modal-header">
                            <div>
                                <h2>{editingJob ? "Editar trabalho" : "Novo trabalho"}</h2>

                                <p>
                                    {editingJob
                                        ? "Atualize os dados deste trabalho."
                                        : "Cadastre um trabalho para organizar sua agenda."}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeCreateModal
                                }
                                disabled={creating || updatingJob}
                            >
                                <X />
                            </button>
                        </div>

                        <form
                            className="reminder-create-form"
                            onSubmit={editingJob ? handleUpdateJob : handleCreateJob}
                        >
                            <label>
                                <span>
                                    Nome do trabalho
                                </span>

                                <input
                                    type="text"
                                    name="name"
                                    value={
                                        form.name
                                    }
                                    onChange={
                                        handleCreateChange
                                    }
                                    placeholder="Ex.: Trabalho principal"
                                    maxLength={
                                        100
                                    }
                                    autoFocus
                                />
                            </label>

                            <div className="reminder-form-grid">
                                <label>
                                    <span>
                                        Empresa
                                    </span>

                                    <input
                                        type="text"
                                        name="company"
                                        value={
                                            form.company
                                        }
                                        onChange={
                                            handleCreateChange
                                        }
                                        placeholder="Ex.: Minha Empresa"
                                        maxLength={
                                            100
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        Cargo
                                    </span>

                                    <input
                                        type="text"
                                        name="position"
                                        value={
                                            form.position
                                        }
                                        onChange={
                                            handleCreateChange
                                        }
                                        placeholder="Ex.: Desenvolvedor"
                                        maxLength={
                                            100
                                        }
                                    />
                                </label>
                            </div>

                            <div className="reminder-form-grid">
                                <label>
                                    <span>
                                        Tipo de trabalho
                                    </span>

                                    <input
                                        type="text"
                                        name="workType"
                                        value={
                                            form.workType
                                        }
                                        onChange={
                                            handleCreateChange
                                        }
                                        placeholder="Ex.: CLT, Freelancer"
                                        maxLength={
                                            50
                                        }
                                    />
                                </label>

                                <label>
                                    <span>
                                        Local
                                    </span>

                                    <input
                                        type="text"
                                        name="location"
                                        value={
                                            form.location
                                        }
                                        onChange={
                                            handleCreateChange
                                        }
                                        placeholder="Ex.: Remoto"
                                        maxLength={
                                            200
                                        }
                                    />
                                </label>
                            </div>

                            {createError && (
                                <div className="reminder-form-error">
                                    {
                                        createError
                                    }
                                </div>
                            )}


                            <div className="reminder-create-actions">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    disabled={creating || updatingJob}
                                >
                                    Cancelar
                                </button>

                                {editingJob && (
                                    <button
                                        type="button"
                                        onClick={openDeleteConfirm}
                                        disabled={creating || updatingJob}
                                    >
                                        Excluir trabalho
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    className="primary"
                                    disabled={creating || updatingJob}
                                >
                                    {editingJob
                                        ? updatingJob
                                            ? "Salvando..."
                                            : "Editar trabalho"
                                        : creating
                                            ? "Criando..."
                                            : "Criar trabalho"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}


            {showDeleteConfirm && (
                <div
                    className="modal-overlay"
                    onClick={() => {
                        if (deletingJob) return;

                        setShowDeleteConfirm(false);
                        setShowCreateModal(true);
                    }}
                >
                    <div
                        className="modal-card reminder-create-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div>
                                <h2>Excluir trabalho?</h2>
                                <p>
                                    Tem certeza de que deseja excluir
                                    {" "}
                                    <strong>{editingJob?.name}</strong>?
                                    Essa ação não poderá ser desfeita.
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={deletingJob}
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setShowCreateModal(true);
                                }}
                            >
                                <X />
                            </button>
                        </div>

                        {deleteError && (
                            <div className="reminder-form-error">
                                {deleteError}
                            </div>
                        )}

                        <div className="reminder-create-actions">
                            <button
                                type="button"
                                disabled={deletingJob}
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setShowCreateModal(true);
                                }}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                disabled={deletingJob}
                                onClick={handleDeleteJob}
                            >
                                {deletingJob
                                    ? "Excluindo..."
                                    : "Confirmar exclusão"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </section>
    );
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function Notice({ title, idx }) {
    return (
        <article className="notice">
            <i className={tones[idx % 4]}>
                {idx === 2 ? (
                    <Target />
                ) : (
                    <Bell />
                )}
            </i>

            <span>
                <strong>{title}</strong>

                <p>
                    Você concluiu tarefas e recebeu uma
                    atualização importante.
                </p>

                <small>08:15</small>
            </span>

            <MoreHorizontal />
        </article>
    );
}

export function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [activeTab, setActiveTab] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const response = await lifeApi.notifications();
            const data = response?.data || response || [];
            setNotifications(Array.isArray(data) ? data : data.notifications || data.items || []);
        } catch (err) {
            console.error("Erro ao carregar notificações:", err);
            setError(err?.response?.data?.message || "Não foi possível carregar suas notificações.");
        } finally { setLoading(false); }
    };

    useEffect(() => { loadNotifications(); }, []);

    const unread = notifications.filter((item) => item.isRead === false || item.read === false || item.status === "UNREAD");
    const visible = activeTab === "unread" ? unread : notifications;

    return <section className="planner-page notifications-page">
        <Heading title="Notificações" text="Acompanhe o que acontece na sua agenda." />
        <div className="notification-layout"><main>
            <div className="notification-tabs">
                <button className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")} type="button">Todas {notifications.length}</button>
                <button className={activeTab === "unread" ? "active" : ""} onClick={() => setActiveTab("unread")} type="button">Não lidas {unread.length}</button>
            </div>
            {loading && <div className="empty-state"><p>Carregando notificações...</p></div>}
            {!loading && error && <div className="empty-state"><p>{error}</p><button type="button" onClick={loadNotifications}>Tentar novamente</button></div>}
            {!loading && !error && !visible.length && <div className="empty-state"><Bell /><strong>Nenhuma notificação</strong><p>Você está em dia.</p></div>}
            {!loading && !error && visible.map((notification, index) =>
                <Notice key={notification.id ?? index} title={notification.title || notification.message || "Nova notificação"} idx={index} />
            )}
        </main>
            <aside className="notification-prefs"><h2>Resumo</h2><div><Bell /><span><strong>{unread.length}</strong><small>notificações não lidas</small></span></div></aside>
        </div>
    </section>;
}

/* =========================================================
   SETTINGS
========================================================= */

export function Settings() {
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({ name: "", email: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const loadProfile = async () => {
        try {
            setLoading(true);
            const response = await lifeApi.profile();
            const data = response?.data || response || {};
            setProfile(data);
            setForm({ name: data.name || data.fullName || "", email: data.email || "" });
        } catch (err) {
            console.error("Erro ao carregar perfil:", err);
            setError(err?.response?.data?.message || "Não foi possível carregar seu perfil.");
        } finally { setLoading(false); }
    };

    useEffect(() => { loadProfile(); }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
        setMessage("");
    };

    const handleSave = async (event) => {
        event.preventDefault();
        try {
            setSaving(true); setMessage(""); setError("");
            const response = await lifeApi.updateProfile({ name: form.name.trim() });
            const updated = response?.data || response || {};
            setProfile((current) => ({ ...(current || {}), ...updated, name: updated.name || form.name }));
            setMessage("Perfil atualizado com sucesso.");
        } catch (err) {
            console.error("Erro ao salvar perfil:", err);
            setError(err?.response?.data?.message || "Não foi possível salvar as alterações.");
        } finally { setSaving(false); }
    };

    return <section className="settings-page"><h1>Perfil e Configurações</h1>
        {loading ? <div className="empty-state"><p>Carregando suas configurações...</p></div> :
            error && !profile ? <div className="empty-state"><p>{error}</p><button type="button" onClick={loadProfile}>Tentar novamente</button></div> :
                <div className="settings-layout">
                    <aside className="settings-nav">
                        <button className="active" type="button"><UserRound />Perfil</button>
                        <button type="button"><SlidersHorizontal />Preferências</button>
                        <button type="button"><Bell />Notificações</button>
                        <button type="button"><ShieldCheck />Privacidade e dados</button>
                        <button type="button"><Puzzle />Integrações</button>
                    </aside>
                    <main><form onSubmit={handleSave}>
                        <article className="settings-profile">
                            <div className="settings-avatar">{(form.name || "U").charAt(0).toUpperCase()}</div>
                            <div><h2>{form.name || "Usuário"}</h2><dl><dt>Nome</dt><dd>{form.name || "Não informado"}</dd><dt>E-mail</dt><dd>{form.email || "Não informado"}</dd></dl></div>
                        </article>
                        <article className="settings-row">
                            <label><span><UserRound />Nome</span><input name="name" value={form.name} onChange={handleChange} placeholder="Seu nome" /></label>
                            <label><span><Mail />E-mail</span><input value={form.email} disabled readOnly /></label>
                        </article>
                        {error && <div className="reminder-form-error">{error}</div>}
                        {message && <div className="reminder-form-info"><CheckCircle2 /><span>{message}</span></div>}
                        <button className="settings-save" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button>
                    </form></main>
                </div>}
    </section>;
}

/* =========================================================
   INCIDENTS
========================================================= */

export function Incidents() {
    const cases = [
        "Cliente pediu revisão urgente",
        "Consulta médica remarcada",
        "Entrega de fornecedor atrasada",
    ];

    return (
        <section className="planner-page">
            <Heading
                title="Imprevistos"
                text="Registre, avalie e ajuste sem perder o foco."
            />

            <MiniStats
                data={[
                    [
                        "Hoje",
                        "novos imprevistos",
                        "3",
                    ],
                    [
                        "Esta semana",
                        "imprevistos registrados",
                        "8",
                    ],
                    [
                        "Tempo perdido (semana)",
                        "estimado",
                        "4h 30m",
                    ],
                    [
                        "Replanejados",
                        "itens ajustados",
                        "5",
                    ],
                ]}
            />

            <div className="incident-top">
                <article>
                    <h2>
                        ϟ Registrar imprevisto
                    </h2>

                    <label>
                        O que aconteceu?

                        <textarea
                            placeholder="Descreva o imprevisto de forma objetiva..."
                        />
                    </label>

                    <div>
                        <button>
                            ● Médio ⌄
                        </button>

                        <button>
                            ● Média ⌄
                        </button>

                        <button>
                            ◷ 30 min ⌄
                        </button>

                        <button>
                            Registrar imprevisto
                        </button>
                    </div>
                </article>

                <article>
                    <Chart title="Impacto na semana" />
                </article>
            </div>

            <article className="incident-queue">
                <h2>Fila de análise</h2>

                {cases.map((x, i) => (
                    <div key={x}>
                        <i className={tones[i]}>
                            <Target />
                        </i>

                        <span>
                            <strong>{x}</strong>

                            <small>
                                Solicitação de mudanças no
                                material enviado.
                            </small>
                        </span>

                        <b>
                            ● {i ? "Médio" : "Alto"}
                        </b>

                        <b>
                            ◷ {60 - i * 15} min
                        </b>

                        <button>
                            Resolver agora
                        </button>

                        <button>
                            Replanejar
                        </button>

                        <MoreHorizontal />
                    </div>
                ))}
            </article>
        </section>
    );
}