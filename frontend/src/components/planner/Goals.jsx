import {
    BookOpen,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Eye,
    Landmark,
    Pencil,
    Plus,
    Star,
    Target,
    Trash2,
    X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import { lifeApi } from "../../lib/api";

function getGoalIcon(goal) {
    const type = String(goal.type || goal.category || "").toLowerCase();

    if (
        type.includes("finance") ||
        type.includes("dinheiro") ||
        type.includes("financeira")
    ) {
        return Landmark;
    }

    if (
        type.includes("leitura") ||
        type.includes("livro") ||
        type.includes("estudo")
    ) {
        return BookOpen;
    }

    if (
        type.includes("corrida") ||
        type.includes("atividade") ||
        type.includes("fitness") ||
        type.includes("esporte")
    ) {
        return Target;
    }

    return Star;
}

function getGoalTone(goal) {
    const type = String(goal.type || goal.category || "").toLowerCase();

    if (
        type.includes("corrida") ||
        type.includes("atividade") ||
        type.includes("fitness") ||
        type.includes("esporte")
    ) {
        return "orange";
    }

    if (
        type.includes("leitura") ||
        type.includes("livro") ||
        type.includes("estudo")
    ) {
        return "purple";
    }

    return "green";
}

function getGoalProgress(goal) {
    const value =
        goal.progress ??
        goal.progressPercentage ??
        goal.percentage ??
        goal.pct ??
        0;

    const progress = Number(value);

    if (Number.isNaN(progress)) {
        return 0;
    }

    return Math.min(100, Math.max(0, Math.round(progress)));
}

function formatDate(date) {
    if (!date) {
        return "Sem prazo";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return date;
    }

    return parsedDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getDaysRemaining(date) {
    if (!date) {
        return "Sem prazo definido";
    }

    const targetDate = new Date(date);

    if (Number.isNaN(targetDate.getTime())) {
        return "Sem prazo definido";
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const difference = targetDate.getTime() - today.getTime();
    const days = Math.ceil(difference / (1000 * 60 * 60 * 24));

    if (days < 0) {
        return "Prazo encerrado";
    }

    if (days === 0) {
        return "Termina hoje";
    }

    if (days === 1) {
        return "1 dia restante";
    }

    return `${days} dias restantes`;
}

function normalizeGoal(goal) {
    return {
        ...goal,
        name: goal.name || goal.title || "Meta sem nome",
        desc:
            goal.description ||
            goal.desc ||
            "Acompanhe seu progresso para alcançar esta meta.",
        pct: getGoalProgress(goal),
        date: formatDate(goal.deadline || goal.targetDate || goal.dueDate),
        days: getDaysRemaining(
            goal.deadline || goal.targetDate || goal.dueDate,
        ),
        milestone:
            goal.milestone ||
            goal.nextMilestone ||
            "Continue avançando em direção à meta",
        icon: getGoalIcon(goal),
        tone: getGoalTone(goal),
    };
}

function Goals() {
    const [selectedQuarter, setSelectedQuarter] = useState("3º trimestre de 2026");
    const [isQuarterOpen, setIsQuarterOpen] = useState(false);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [goalForm, setGoalForm] = useState({
        title: "",
        description: "",
        targetDate: "",
        weeklyFrequency: 3,
        sessionMinutes: 60,
        priority: "MEDIUM",
    });

    useEffect(() => {
        loadGoals();
    }, []);

    async function loadGoals() {
        try {
            setLoading(true);
            setError("");

            const response = await lifeApi.goals();

            console.log("RESPOSTA /goals:", response);

            const loadedGoals = Array.isArray(response.data)
                ? response.data
                : [];

            setGoals(loadedGoals.map(normalizeGoal));
        } catch (requestError) {
            console.error("Erro ao carregar metas:", requestError);
            setError("Não foi possível carregar suas metas.");
        } finally {
            setLoading(false);
        }
    }

    const filteredGoals = useMemo(() => {
        switch (activeFilter) {
            case "active":
                return goals.filter((goal) => {
                    const status = String(goal.status || "").toUpperCase();

                    return (
                        status === "ACTIVE" ||
                        status === "IN_PROGRESS" ||
                        status === "EM_ANDAMENTO" ||
                        (!status && goal.pct < 100)
                    );
                });

            case "onTrack":
                return goals.filter((goal) => {
                    const status = String(goal.status || "").toUpperCase();

                    return (
                        status !== "AT_RISK" &&
                        status !== "RISK" &&
                        status !== "EM_RISCO" &&
                        status !== "COMPLETED" &&
                        status !== "DONE" &&
                        status !== "CONCLUIDA" &&
                        status !== "CONCLUÍDA" &&
                        goal.pct < 100
                    );
                });

            case "risk":
                return goals.filter((goal) => {
                    const status = String(goal.status || "").toUpperCase();

                    return (
                        status === "AT_RISK" ||
                        status === "RISK" ||
                        status === "EM_RISCO"
                    );
                });

            case "completed":
                return goals.filter((goal) => {
                    const status = String(goal.status || "").toUpperCase();

                    return (
                        status === "COMPLETED" ||
                        status === "DONE" ||
                        status === "CONCLUIDA" ||
                        status === "CONCLUÍDA" ||
                        goal.pct >= 100
                    );
                });

            case "all":
            default:
                return goals;
        }
    }, [activeFilter, goals]);

    const totalGoals = goals.length;

    const completedGoals = goals.filter((goal) => {
        const status = String(goal.status || "").toUpperCase();

        return (
            status === "COMPLETED" ||
            status === "DONE" ||
            status === "CONCLUIDA" ||
            status === "CONCLUÍDA" ||
            goal.pct >= 100
        );
    }).length;

    const activeGoals = goals.filter((goal) => {
        const status = String(goal.status || "").toUpperCase();

        return (
            status === "ACTIVE" ||
            status === "IN_PROGRESS" ||
            status === "EM_ANDAMENTO" ||
            (!status && goal.pct < 100)
        );
    }).length;

    const goalsAtRisk = goals.filter((goal) => {
        const status = String(goal.status || "").toUpperCase();

        return (
            status === "AT_RISK" ||
            status === "RISK" ||
            status === "EM_RISCO"
        );
    }).length;

    const onTrackGoals = Math.max(
        0,
        activeGoals - goalsAtRisk,
    );

    const totalProgress =
        totalGoals > 0
            ? Math.round(
                goals.reduce((sum, goal) => sum + goal.pct, 0) /
                totalGoals,
            )
            : 0;

    function handleGoalFormChange(event) {
        const { name, value } = event.target;

        setGoalForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function resetGoalForm() {
        setGoalForm({
            title: "",
            description: "",
            targetDate: "",
            weeklyFrequency: 3,
            sessionMinutes: 60,
            priority: "MEDIUM",
        });
    }

    function openCreateModal() {
        resetGoalForm();
        setSelectedGoal(null);
        setModalMode("create");
        setIsModalOpen(true);
        setOpenMenuId(null);
    }

    function openEditModal(goal) {
        setSelectedGoal(goal);

        setGoalForm({
            title: goal.title || goal.name || "",
            description: goal.description || "",
            targetDate: goal.targetDate
                ? String(goal.targetDate).slice(0, 10)
                : "",
            weeklyFrequency: goal.weeklyFrequency || 3,
            sessionMinutes: goal.sessionMinutes || 60,
            priority: goal.priority || "MEDIUM",
        });

        setModalMode("edit");
        setIsModalOpen(true);
        setOpenMenuId(null);
    }

    async function openViewModal(goal) {
        try {
            setError("");
            setActionLoading(true);
            setOpenMenuId(null);

            const response = await lifeApi.goal(goal.id);

            setSelectedGoal(response.data);
            setIsViewOpen(true);
        } catch (requestError) {
            console.error("Erro ao visualizar meta:", requestError);

            setError(
                requestError.response?.data?.message ||
                "Não foi possível carregar a meta.",
            );
        } finally {
            setActionLoading(false);
        }
    }

    function openDeleteModal(goal) {
        setSelectedGoal(goal);
        setIsDeleteOpen(true);
        setOpenMenuId(null);
    }

    function closeViewModal() {
        setIsViewOpen(false);
        setSelectedGoal(null);
    }

    function closeDeleteModal() {
        setIsDeleteOpen(false);
        setSelectedGoal(null);
    }

    function closeGoalModal() {
        setIsModalOpen(false);
        setSelectedGoal(null);
        setModalMode("create");
        resetGoalForm();
    }

    async function handleSaveGoal(event) {
        event.preventDefault();

        try {
            setError("");
            setActionLoading(true);

            const payload = {
                title: goalForm.title,
                description: goalForm.description || undefined,
                targetDate: goalForm.targetDate || undefined,
                weeklyFrequency: Number(goalForm.weeklyFrequency),
                sessionMinutes: Number(goalForm.sessionMinutes),
                priority: goalForm.priority,
            };

            if (modalMode === "edit") {
                await lifeApi.updateGoal(selectedGoal.id, payload);
            } else {
                await lifeApi.createGoal(payload);
            }

            closeGoalModal();

            await loadGoals();
        } catch (requestError) {
            console.error("Erro ao salvar meta:", requestError);

            setError(
                requestError.response?.data?.message ||
                "Não foi possível salvar a meta.",
            );
        } finally {
            setActionLoading(false);
        }
    }

    async function handleDeleteGoal() {
        if (!selectedGoal?.id) {
            return;
        }

        try {
            setError("");
            setActionLoading(true);

            await lifeApi.deleteGoal(selectedGoal.id);

            closeDeleteModal();

            await loadGoals();
        } catch (requestError) {
            console.error("Erro ao excluir meta:", requestError);

            setError(
                requestError.response?.data?.message ||
                "Não foi possível excluir a meta.",
            );
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <section className="planner-page">
            <div className="planner-heading">
                <div>
                    <h1>Metas</h1>
                    <p>Transforme intenção em progresso.</p>
                </div>

                <div className="planner-actions">
                    <div className="planner-period-wrapper">
                        <button
                            type="button"
                            className="planner-period-button"
                            onClick={() => setIsQuarterOpen((current) => !current)}
                        >
                            <CalendarDays />
                            <span>{selectedQuarter}</span>
                        </button>

                        {isQuarterOpen && (
                            <div className="planner-period-menu">
                                {[
                                    "1º trimestre de 2026",
                                    "2º trimestre de 2026",
                                    "3º trimestre de 2026",
                                    "4º trimestre de 2026",
                                ].map((quarter) => (
                                    <button
                                        key={quarter}
                                        type="button"
                                        className={
                                            selectedQuarter === quarter ? "active" : ""
                                        }
                                        onClick={() => {
                                            setSelectedQuarter(quarter);
                                            setIsQuarterOpen(false);
                                        }}
                                    >
                                        {quarter}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="planner-primary"
                        onClick={openCreateModal}
                    >
                        <Plus />
                        <span>Nova meta</span>
                    </button>
                </div>
            </div>

            <div className="planner-tabs">
                <button
                    type="button"
                    className={activeFilter === "all" ? "active" : ""}
                    onClick={() => setActiveFilter("all")}
                >
                    Todas
                </button>

                <button
                    type="button"
                    className={activeFilter === "active" ? "active" : ""}
                    onClick={() => setActiveFilter("active")}
                >
                    Em andamento
                </button>

                <button
                    type="button"
                    className={activeFilter === "completed" ? "active" : ""}
                    onClick={() => setActiveFilter("completed")}
                >
                    Concluídas
                </button>
            </div>

            <div className="goal-stat-grid">
                <GoalStat
                    title="Total de metas"
                    value={totalGoals}
                    text="metas em andamento"
                    tone="orange"
                    icon={Target}
                    filter="all"
                    activeFilter={activeFilter}
                    onFilter={setActiveFilter}
                />

                <GoalStat
                    title="No caminho certo"
                    value={onTrackGoals}
                    text="metas"
                    tone="green"
                    icon={Star}
                    filter="onTrack"
                    activeFilter={activeFilter}
                    onFilter={setActiveFilter}
                />

                <GoalStat
                    title="Em risco"
                    value={goalsAtRisk}
                    text="metas"
                    tone="orange"
                    icon={Target}
                    filter="risk"
                    activeFilter={activeFilter}
                    onFilter={setActiveFilter}
                />

                <GoalStat
                    title="Concluídas"
                    value={completedGoals}
                    text="metas"
                    tone="purple"
                    icon={CheckCircle2}
                    filter="completed"
                    activeFilter={activeFilter}
                    onFilter={setActiveFilter}
                />
            </div>

            <div className="goals-list-heading">
                <h2>Suas metas</h2>
                <span>
                    Progresso médio: {totalProgress}%
                </span>
            </div>

            {loading && (
                <div className="goals-list">
                    <p>Carregando suas metas...</p>
                </div>
            )}

            {!loading && error && (
                <div className="goals-list">
                    <p>{error}</p>
                </div>
            )}

            {!loading &&
                !error &&
                filteredGoals.length === 0 && (
                    <div className="goals-list">
                        <p>
                            {activeFilter === "completed"
                                ? "Você ainda não possui metas concluídas."
                                : "Nenhuma meta encontrada."}
                        </p>
                    </div>
                )}

            {!loading &&
                !error &&
                filteredGoals.length > 0 && (
                    <div className="goals-list">
                        {filteredGoals.map((goal) => {
                            const Icon = goal.icon;

                            return (
                                <article
                                    className={`goal-row ${goal.tone}`}
                                    key={goal.id || goal.name}
                                >
                                    <i>
                                        <Icon />
                                    </i>

                                    <div className="goal-name">
                                        <h2>{goal.name}</h2>

                                        <p>{goal.desc}</p>

                                        {goal.name.includes("Profissional") && (
                                            <span>☆ Meta em destaque</span>
                                        )}
                                    </div>

                                    <div>
                                        <span>Progresso</span>

                                        <strong>{goal.pct}%</strong>

                                        <em>
                                            <i
                                                style={{
                                                    width: `${goal.pct}%`,
                                                }}
                                            />
                                        </em>
                                    </div>

                                    <div>
                                        <span>Prazo</span>

                                        <strong>
                                            <CalendarDays />
                                            {goal.date}
                                        </strong>

                                        <p>{goal.days}</p>
                                    </div>

                                    <div>
                                        <span>Próximo marco</span>

                                        <strong>
                                            <CheckCircle2 />
                                            {goal.milestone}
                                        </strong>
                                    </div>

                                    <div className="goal-actions">
                                        <button
                                            type="button"
                                            className="goal-action-trigger"
                                            onClick={() =>
                                                setOpenMenuId((current) =>
                                                    current === goal.id ? null : goal.id,
                                                )
                                            }
                                            aria-label={`Ações da meta ${goal.name}`}
                                        >
                                            <ChevronRight />
                                        </button>

                                        {openMenuId === goal.id && (
                                            <div className="goal-action-menu">
                                                <button
                                                    type="button"
                                                    onClick={() => openViewModal(goal)}
                                                >
                                                    <Eye />
                                                    Visualizar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(goal)}
                                                >
                                                    <Pencil />
                                                    Editar
                                                </button>

                                                <button
                                                    type="button"
                                                    className="danger"
                                                    onClick={() => openDeleteModal(goal)}
                                                >
                                                    <Trash2 />
                                                    Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

            {isViewOpen && selectedGoal && (
                <div
                    className="goal-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeViewModal();
                        }
                    }}
                >
                    <div
                        className="goal-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="goal-view-title"
                    >
                        <div className="goal-modal-header">
                            <div>
                                <h2 id="goal-view-title">
                                    {selectedGoal.title || selectedGoal.name}
                                </h2>

                                <p>
                                    Detalhes da sua meta.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="goal-modal-close"
                                onClick={closeViewModal}
                                aria-label="Fechar"
                            >
                                <X />
                            </button>
                        </div>

                        <div className="goal-view-content">
                            <div className="goal-view-item">
                                <span>Descrição</span>
                                <strong>
                                    {selectedGoal.description ||
                                        "Sem descrição definida."}
                                </strong>
                            </div>

                            <div className="goal-view-grid">
                                <div className="goal-view-item">
                                    <span>Prazo</span>
                                    <strong>
                                        {formatDate(selectedGoal.targetDate)}
                                    </strong>
                                </div>

                                <div className="goal-view-item">
                                    <span>Status</span>
                                    <strong>
                                        {selectedGoal.status || "ACTIVE"}
                                    </strong>
                                </div>

                                <div className="goal-view-item">
                                    <span>Prioridade</span>
                                    <strong>
                                        {selectedGoal.priority || "MEDIUM"}
                                    </strong>
                                </div>

                                <div className="goal-view-item">
                                    <span>Frequência</span>
                                    <strong>
                                        {selectedGoal.weeklyFrequency || 0}x por semana
                                    </strong>
                                </div>

                                <div className="goal-view-item">
                                    <span>Duração</span>
                                    <strong>
                                        {selectedGoal.sessionMinutes || 0} minutos
                                    </strong>
                                </div>

                                <div className="goal-view-item">
                                    <span>Progresso</span>
                                    <strong>
                                        {getGoalProgress(selectedGoal)}%
                                    </strong>
                                </div>
                            </div>

                            {selectedGoal.sessions?.length > 0 && (
                                <div className="goal-view-item">
                                    <span>Sessões planejadas</span>
                                    <strong>
                                        {selectedGoal.sessions.length}
                                    </strong>
                                </div>
                            )}
                        </div>

                        <div className="goal-modal-footer">
                            <button
                                type="button"
                                className="goal-modal-cancel"
                                onClick={closeViewModal}
                            >
                                Fechar
                            </button>

                            <button
                                type="button"
                                className="goal-modal-submit"
                                onClick={() => {
                                    closeViewModal();
                                    openEditModal(selectedGoal);
                                }}
                            >
                                <Pencil />
                                Editar meta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteOpen && selectedGoal && (
                <div
                    className="goal-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeDeleteModal();
                        }
                    }}
                >
                    <div
                        className="goal-modal goal-delete-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="goal-delete-title"
                    >
                        <div className="goal-modal-header">
                            <div>
                                <h2 id="goal-delete-title">
                                    Excluir meta
                                </h2>

                                <p>
                                    Essa ação não poderá ser desfeita.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="goal-modal-close"
                                onClick={closeDeleteModal}
                                aria-label="Fechar"
                            >
                                <X />
                            </button>
                        </div>

                        <div className="goal-delete-content">
                            <p>
                                Tem certeza que deseja excluir a meta{" "}
                                <strong>
                                    "{selectedGoal.name || selectedGoal.title}"
                                </strong>
                                ?
                            </p>

                            {selectedGoal.sessions?.length > 0 && (
                                <p>
                                    As sessões planejadas dessa meta também serão
                                    removidas.
                                </p>
                            )}
                        </div>

                        <div className="goal-modal-footer">
                            <button
                                type="button"
                                className="goal-modal-cancel"
                                onClick={closeDeleteModal}
                                disabled={actionLoading}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="goal-delete-submit"
                                onClick={handleDeleteGoal}
                                disabled={actionLoading}
                            >
                                <Trash2 />
                                {actionLoading ? "Excluindo..." : "Excluir meta"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div
                    className="goal-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeGoalModal();
                        }
                    }}
                >
                    <div
                        className="goal-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="goal-modal-title"
                    >
                        <div className="goal-modal-header">
                            <div>
                                <h2 id="goal-modal-title">
                                    {modalMode === "edit" ? "Editar meta" : "Nova meta"}
                                </h2>
                                <p>
                                    {modalMode === "edit"
                                        ? "Atualize os dados da sua meta."
                                        : "Defina uma meta e acompanhe seu progresso."}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="goal-modal-close"
                                onClick={closeGoalModal}
                                aria-label="Fechar"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSaveGoal}>
                            <div className="goal-form-field">
                                <label htmlFor="goal-title">
                                    Nome da meta
                                </label>

                                <input
                                    id="goal-title"
                                    name="title"
                                    type="text"
                                    value={goalForm.title}
                                    onChange={handleGoalFormChange}
                                    placeholder="Ex.: Aprender inglês"
                                    maxLength={150}
                                    required
                                />
                            </div>

                            <div className="goal-form-field">
                                <label htmlFor="goal-description">
                                    Descrição
                                </label>

                                <textarea
                                    id="goal-description"
                                    name="description"
                                    value={goalForm.description}
                                    onChange={handleGoalFormChange}
                                    placeholder="Descreva o que você deseja alcançar..."
                                    maxLength={1000}
                                    rows={4}
                                />
                            </div>

                            <div className="goal-form-grid">
                                <div className="goal-form-field">
                                    <label htmlFor="goal-target-date">
                                        Prazo
                                    </label>

                                    <input
                                        id="goal-target-date"
                                        name="targetDate"
                                        type="date"
                                        value={goalForm.targetDate}
                                        onChange={handleGoalFormChange}
                                    />
                                </div>

                                <div className="goal-form-field">
                                    <label htmlFor="goal-priority">
                                        Prioridade
                                    </label>

                                    <select
                                        id="goal-priority"
                                        name="priority"
                                        value={goalForm.priority}
                                        onChange={handleGoalFormChange}
                                    >
                                        <option value="LOW">Baixa</option>
                                        <option value="MEDIUM">Média</option>
                                        <option value="HIGH">Alta</option>
                                    </select>
                                </div>
                            </div>

                            <div className="goal-form-grid">
                                <div className="goal-form-field">
                                    <label htmlFor="goal-frequency">
                                        Frequência semanal
                                    </label>

                                    <select
                                        id="goal-frequency"
                                        name="weeklyFrequency"
                                        value={goalForm.weeklyFrequency}
                                        onChange={handleGoalFormChange}
                                    >
                                        <option value="1">1 vez por semana</option>
                                        <option value="2">2 vezes por semana</option>
                                        <option value="3">3 vezes por semana</option>
                                        <option value="4">4 vezes por semana</option>
                                        <option value="5">5 vezes por semana</option>
                                        <option value="6">6 vezes por semana</option>
                                        <option value="7">7 vezes por semana</option>
                                    </select>
                                </div>

                                <div className="goal-form-field">
                                    <label htmlFor="goal-session">
                                        Duração por sessão
                                    </label>

                                    <select
                                        id="goal-session"
                                        name="sessionMinutes"
                                        value={goalForm.sessionMinutes}
                                        onChange={handleGoalFormChange}
                                    >
                                        <option value="15">15 minutos</option>
                                        <option value="30">30 minutos</option>
                                        <option value="45">45 minutos</option>
                                        <option value="60">1 hora</option>
                                        <option value="90">1h30</option>
                                        <option value="120">2 horas</option>
                                        <option value="180">3 horas</option>
                                        <option value="240">4 horas</option>
                                    </select>
                                </div>
                            </div>

                            <div className="goal-modal-footer">
                                <button
                                    type="button"
                                    className="goal-modal-cancel"
                                    onClick={closeGoalModal}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="goal-modal-submit"
                                >
                                    {modalMode === "edit" ? (
                                        <>
                                            <Pencil />
                                            Salvar alterações
                                        </>
                                    ) : (
                                        <>
                                            <Plus />
                                            Criar meta
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

function GoalStat({
    title,
    value,
    text,
    tone,
    icon: Icon,
    filter,
    activeFilter,
    onFilter,
}) {
    const isActive = activeFilter === filter;

    return (
        <article
            className={`goal-stat ${tone} ${isActive ? "active" : ""}`}
        >
            <h2>
                {title}

                <button
                    type="button"
                    className="goal-stat-filter"
                    onClick={() =>
                        onFilter((current) =>
                            current === filter ? "all" : filter
                        )
                    }
                    aria-label={`Filtrar por ${title}`}
                    title={`Filtrar por ${title}`}
                >
                    <ChevronRight />
                </button>
            </h2>

            <div>
                <i>
                    <Icon />
                </i>

                <strong>
                    {value}
                    <span>{text}</span>
                </strong>
            </div>

            <em>
                <i
                    style={{
                        width: `${Math.min(100, Number(value) * 25)}%`,
                    }}
                />
            </em>

            <p>
                {value} de {value} metas
                <b> {value > 0 ? "100%" : "0%"}</b>
            </p>
        </article>
    );
}

export default Goals;