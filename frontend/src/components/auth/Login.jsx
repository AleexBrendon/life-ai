import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Leaf,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";

import { authApi } from "../../lib/api";

function Login({ onAuthenticated }) {
  const [isRegistering, setIsRegistering] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchMode(registering) {
    setIsRegistering(registering);
    setError("");
    setSuccess("");
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }

  function getValidationError() {
    if (isRegistering) {
      if (!name.trim()) {
        return "Informe seu nome.";
      }

      if (name.trim().length < 2) {
        return "O nome deve ter pelo menos 2 caracteres.";
      }

      if (!email.trim()) {
        return "Informe seu e-mail.";
      }

      if (!password) {
        return "Informe sua senha.";
      }

      if (password.length < 8) {
        return "A senha deve ter pelo menos 8 caracteres.";
      }

      if (password.length > 72) {
        return "A senha deve ter no máximo 72 caracteres.";
      }

      if (password !== confirmPassword) {
        return "As senhas não coincidem.";
      }

      return "";
    }

    if (!email.trim()) {
      return "Informe seu e-mail.";
    }

    if (!password) {
      return "Informe sua senha.";
    }

    return "";
  }

  async function submit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = getValidationError();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      if (isRegistering) {
        await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        setSuccess(
          "Conta criada com sucesso! Agora entre com seu e-mail e senha.",
        );

        setIsRegistering(false);
        setName("");
        setPassword("");
        setConfirmPassword("");
      } else {
        const response = await authApi.login({
          email: email.trim(),
          password,
        });

        localStorage.setItem("lifeai_token", response.data.token);
        onAuthenticated(response.data.user);
      }
    } catch (requestError) {
      const responseData = requestError.response?.data;

      if (responseData?.errors?.length) {
        setError(responseData.errors[0].message);
      } else {
        setError(
          responseData?.message ||
          (isRegistering
            ? "Não foi possível criar sua conta. Tente novamente."
            : "Não foi possível entrar. Verifique seus dados e tente novamente."),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-showcase-content">
          <div className="login-brand">
            <span className="login-brand-icon">
              <Leaf size={20} />
            </span>

            <span>LifeAI</span>
          </div>

          <div className="login-showcase-copy">
            <span className="login-eyebrow">
              <Sparkles size={15} />
              Seu planejamento, mais inteligente
            </span>

            <h1>
              Organize seu dia.
              <br />
              <span>Viva melhor.</span>
            </h1>

            <p>
              O LifeAI transforma seus objetivos, rotinas e compromissos em um
              planejamento pessoal mais simples e inteligente.
            </p>
          </div>

          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-icon">
                <CalendarDays size={18} />
              </span>

              <div>
                <strong>Planeje seu dia</strong>
                <span>
                  Tenha clareza sobre o que realmente importa.
                </span>
              </div>
            </div>

            <div className="login-feature">
              <span className="login-feature-icon">
                <CheckCircle2 size={18} />
              </span>

              <div>
                <strong>Alcance seus objetivos</strong>
                <span>
                  Transforme metas em ações concretas.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-showcase-decoration">
          <div className="login-orbit login-orbit-one" />
          <div className="login-orbit login-orbit-two" />

          <div className="login-orbit-center">
            <Leaf size={30} />
          </div>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-wrapper">
          <div className="login-mobile-brand">
            <span className="login-brand-icon">
              <Leaf size={18} />
            </span>

            <span>LifeAI</span>
          </div>

          <div className="login-header">
            <span className="login-header-icon">
              {isRegistering ? (
                <UserRound size={20} />
              ) : (
                <LockKeyhole size={20} />
              )}
            </span>

            <h2>
              {isRegistering
                ? "Crie sua conta"
                : "Bem-vindo de volta"}
            </h2>

            <p>
              {isRegistering
                ? "Comece agora a organizar sua vida com o LifeAI."
                : "Entre na sua conta para continuar seu planejamento."}
            </p>
          </div>

          <form className="login-form" onSubmit={submit}>
            {isRegistering && (
              <label className="login-field">
                <span>Nome</span>

                <div className="login-input-wrapper">
                  <UserRound size={18} />

                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Seu nome"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </div>
              </label>
            )}

            <label className="login-field">
              <span>E-mail</span>

              <div className="login-input-wrapper">
                <Mail size={18} />

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span>Senha</span>

              <div className="login-input-wrapper">
                <LockKeyhole size={18} />

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    isRegistering
                      ? "Mínimo de 8 caracteres"
                      : "Sua senha"
                  }
                  autoComplete={
                    isRegistering
                      ? "new-password"
                      : "current-password"
                  }
                  maxLength={72}
                  required
                />
              </div>
            </label>

            {isRegistering && (
              <label className="login-field">
                <span>Confirmar senha</span>

                <div className="login-input-wrapper">
                  <LockKeyhole size={18} />

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Digite sua senha novamente"
                    autoComplete="new-password"
                    maxLength={72}
                    required
                  />
                </div>
              </label>
            )}

            {error && (
              <div className="login-error">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="login-success">
                <CheckCircle2 size={17} />
                <span>{success}</span>
              </div>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={submitting}
            >
              <span>
                {submitting
                  ? isRegistering
                    ? "Criando conta..."
                    : "Entrando..."
                  : isRegistering
                    ? "Criar conta"
                    : "Entrar"}
              </span>

              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="login-switch">
            <span>
              {isRegistering
                ? "Já possui uma conta?"
                : "Ainda não tem uma conta?"}
            </span>

            <button
              type="button"
              onClick={() => switchMode(!isRegistering)}
            >
              {isRegistering ? "Entrar" : "Criar conta"}
            </button>
          </div>

          <p className="login-footer">
            Seu planejamento pessoal começa aqui.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;