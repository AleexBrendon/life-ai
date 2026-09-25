import {
    Bell,
    CalendarDays,
    Camera,
    CheckCircle2,
    ChevronRight,
    Circle,
    Clock3,
    Download,
    Globe2,
    Mail,
    Monitor,
    Moon,
    MoreHorizontal,
    Plus,
    Puzzle,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Star,
    Sun,
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
            {data.map(([title, note, value], index) => (
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

                    <em>
                        <i />
                    </em>

                    <p>
                        {note}
                        <b>100%</b>
                    </p>
                </article>
            ))}
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

function Chart({ title }) {
    return (
        <article>
            <h2>{title}</h2>

            <div className="line-chart">
                ﹏﹏﹏﹏﹏﹏
            </div>
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
    return (
        <section className="planner-page">
            <Heading
                title="Insights"
                text="Entenda seus padrões. Decida melhor."
            />

            <MiniStats
                data={[
                    [
                        "Resumo da semana",
                        "das metas avançadas",
                        "78%",
                    ],
                    [
                        "Produtividade",
                        "acima da média",
                        "15%",
                    ],
                    [
                        "Tempo de foco",
                        "média diária",
                        "8h 32m",
                    ],
                    [
                        "Consistência",
                        "dias seguidos",
                        "6",
                    ],
                ]}
            />

            <div className="insight-charts">
                <Chart title="Ritmo de produtividade" />

                <article>
                    <h2>Conclusão por categoria</h2>

                    <div className="donut">
                        35%
                    </div>

                    <p>● Trabalho 35%</p>
                    <p>
                        ● Desenvolvimento 25%
                    </p>
                    <p>● Saúde 20%</p>
                </article>

                <article>
                    <h2>Mapa de foco</h2>

                    <div className="focus-map">
                        {Array.from(
                            { length: 49 },
                            (_, i) => (
                                <i
                                    className={`heat-${i % 6}`}
                                    key={i}
                                />
                            )
                        )}
                    </div>
                </article>
            </div>

            <div className="insight-bottom">
                <article>
                    <h2>
                        Principais insights para você
                    </h2>

                    <div>
                        <Insight
                            title="Seu melhor dia é quarta-feira"
                        />

                        <Insight
                            title="Rotinas matinais aumentam sua conclusão em 18%"
                        />
                    </div>
                </article>

                <article>
                    <h2>Pergunte aos seus dados</h2>

                    <p>
                        Faça perguntas em linguagem natural
                        e receba insights personalizados
                        sobre sua produtividade.
                    </p>

                    <div className="insight-ask">
                        Ex.: Quando sou mais produtivo?

                        <button>
                            <Sparkles />
                            Analisar
                        </button>
                    </div>
                </article>
            </div>
        </section>
    );
}

/* =========================================================
   WORK
========================================================= */

export function Work() {
    const task = [
        "Planejar apresentação",
        "Enviar relatório mensal",
        "Reunião com produto",
    ];

    return (
        <section className="planner-page">
            <Heading
                title="Trabalho"
                text="Organize suas entregas com clareza."
            />

            <MiniStats
                data={[
                    [
                        "A fazer",
                        "tarefas a fazer",
                        "8",
                    ],
                    [
                        "Em andamento",
                        "em andamento",
                        "5",
                    ],
                    [
                        "Concluídas",
                        "concluídas",
                        "12",
                    ],
                    [
                        "Atrasadas",
                        "atrasadas",
                        "2",
                    ],
                ]}
            />

            <div className="work-layout">
                <article className="kanban">
                    {[
                        "A fazer",
                        "Em andamento",
                        "Concluído",
                    ].map((col, i) => (
                        <div
                            className="kanban-col"
                            key={col}
                        >
                            <h2>
                                {col}{" "}
                                <span>
                                    {i
                                        ? i === 1
                                            ? 5
                                            : 12
                                        : 8}
                                </span>
                            </h2>

                            {task.map((x, k) => (
                                <div
                                    className="work-task"
                                    key={k}
                                >
                                    <Circle />

                                    <strong>
                                        {i ? " " : x}
                                    </strong>

                                    {!i && (
                                        <small>
                                            Trabalho ▣{" "}
                                            {k === 0
                                                ? "Hoje"
                                                : "Amanhã"}
                                        </small>
                                    )}
                                </div>
                            ))}

                            <button>
                                <Plus />
                                Nova tarefa
                            </button>
                        </div>
                    ))}
                </article>

                <aside className="work-side">
                    <article>
                        <h2>Prazos próximos</h2>

                        {task.map((x) => (
                            <p key={x}>
                                ↑ {x}
                                <b>Hoje</b>
                            </p>
                        ))}
                    </article>

                    <article>
                        <h2>◴ Sessão de foco</h2>

                        <strong className="focus-time">
                            25:00
                        </strong>

                        <p>
                            Tempo sugerido para foco
                            profundo
                        </p>

                        <button>
                            ▷ Iniciar foco
                        </button>
                    </article>

                    <Chart title="Carga da semana" />
                </aside>
            </div>
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
    const current = [
        "Sua rotina começa em 15 minutos",
        "A meta Crescimento Profissional avançou",
        "Conflito detectado na agenda",
    ];

    const old = [
        "Meta semanal concluída",
        "Resumo semanal disponível",
        "Insight da IA disponível",
    ];

    return (
        <section className="planner-page notifications-page">
            <Heading
                title="Notificações 🔴"
                text=""
            />

            <div className="notification-layout">
                <main>
                    <div className="notification-tabs">
                        <button>
                            Todas 3
                        </button>

                        <button>
                            Não lidas 3
                        </button>

                        <button>
                            Ações necessárias 2
                        </button>
                    </div>

                    <h2>Hoje</h2>

                    {current.map((x, i) => (
                        <Notice
                            key={x}
                            title={x}
                            idx={i}
                        />
                    ))}

                    <h2>Anteriores</h2>

                    {old.map((x, i) => (
                        <Notice
                            key={x}
                            title={x}
                            idx={i + 1}
                        />
                    ))}
                </main>

                <aside className="notification-prefs">
                    <h2>
                        Preferências de notificação
                    </h2>

                    {[
                        "Notificações por e-mail",
                        "Notificações no navegador",
                        "Resumo diário",
                    ].map((x) => (
                        <div key={x}>
                            <Bell />

                            <span>
                                <strong>{x}</strong>

                                <small>
                                    Receber resumos e alertas
                                </small>
                            </span>

                            <i />
                        </div>
                    ))}

                    <button>
                        Gerenciar preferências ›
                    </button>
                </aside>
            </div>
        </section>
    );
}

/* =========================================================
   SETTINGS
========================================================= */

export function Settings() {
    const links = [
        [
            Bell,
            "Preferências de notificações",
            "Gerencie como e quando você deseja receber notificações.",
        ],
        [
            ShieldCheck,
            "Privacidade e dados",
            "Gerencie suas preferências de privacidade e dados.",
        ],
        [
            Puzzle,
            "Integrações",
            "Conecte com outras ferramentas e serviços.",
        ],
    ];

    return (
        <section className="settings-page">
            <h1>Perfil e Configurações</h1>

            <div className="settings-layout">
                <aside className="settings-nav">
                    <button className="active">
                        <UserRound />
                        Perfil
                    </button>

                    <button>
                        <SlidersHorizontal />
                        Preferências
                    </button>

                    <button>
                        <Bell />
                        Notificações
                    </button>

                    <button>
                        <ShieldCheck />
                        Privacidade e dados
                    </button>

                    <button>
                        <Puzzle />
                        Integrações
                    </button>
                </aside>

                <main>
                    <article className="settings-profile">
                        <div className="settings-avatar">
                            H

                            <span>
                                <Camera />
                            </span>
                        </div>

                        <div>
                            <h2>Hudson</h2>

                            <dl>
                                <dt>Nome</dt>
                                <dd>Hudson</dd>

                                <dt>E-mail</dt>
                                <dd>
                                    hudson@email.com
                                </dd>
                            </dl>
                        </div>

                        <button>
                            <Camera />
                            Alterar foto
                        </button>
                    </article>

                    <article className="settings-row">
                        <label>
                            <span>
                                <Globe2 />
                                Idioma
                            </span>

                            <select>
                                <option>
                                    Português (Brasil)
                                </option>
                            </select>
                        </label>

                        <label>
                            <span>
                                <Clock3 />
                                Fuso horário
                            </span>

                            <select>
                                <option>
                                    América/São Paulo
                                </option>
                            </select>
                        </label>
                    </article>

                    <article className="settings-theme">
                        <span>
                            <Sun />
                            Tema
                        </span>

                        <div>
                            <button className="selected">
                                <Sun />
                                Claro
                            </button>

                            <button>
                                <Moon />
                                Escuro
                            </button>

                            <button>
                                <Monitor />
                                Sistema
                            </button>
                        </div>
                    </article>

                    <article className="settings-work">
                        <span>
                            <Clock3 />
                            Horário de trabalho
                        </span>

                        <div className="settings-times">
                            <label>
                                Início do expediente

                                <select>
                                    <option>
                                        08:00
                                    </option>
                                </select>
                            </label>

                            <label>
                                Fim do expediente

                                <select>
                                    <option>
                                        18:00
                                    </option>
                                </select>
                            </label>
                        </div>

                        <div className="settings-days">
                            <b>Dias de trabalho</b>

                            {[
                                "Seg",
                                "Ter",
                                "Qua",
                                "Qui",
                                "Sex",
                                "Sáb",
                                "Dom",
                            ].map((day, index) => (
                                <button
                                    className={
                                        index < 5
                                            ? "selected"
                                            : ""
                                    }
                                    key={day}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </article>

                    {links.map(
                        ([
                            Icon,
                            title,
                            description,
                        ]) => (
                            <article
                                className="settings-link"
                                key={title}
                            >
                                <Icon />

                                <div>
                                    <strong>
                                        {title}
                                    </strong>

                                    <span>
                                        {description}
                                    </span>
                                </div>

                                <ChevronRight />
                            </article>
                        )
                    )}

                    <article className="danger">
                        <strong>
                            Zona de perigo
                        </strong>

                        <div>
                            <button>
                                <Download />
                                Exportar meus dados
                            </button>

                            <button>
                                <Trash2 />
                                Excluir conta
                            </button>
                        </div>
                    </article>

                    <button className="settings-save">
                        Salvar alterações
                    </button>
                </main>
            </div>
        </section>
    );
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