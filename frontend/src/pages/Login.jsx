import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface rounded-card p-6 flex flex-col gap-3"
      >
        <div className="font-heading font-bold text-lg text-ink mb-2">
          Espace vendeur
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-lg bg-accent text-accent-ink font-heading font-bold text-sm mt-2 disabled:opacity-40"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        <Link to="/dashboard/signup" className="text-xs text-muted text-center hover:text-ink">
          Pas encore de boutique ? Inscris-toi
        </Link>
      </form>
    </div>
  );
}
