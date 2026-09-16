import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function Signup() {
  const navigate = useNavigate();
  const [shopName, setShopName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (!signUpData.session) {
      // La confirmation par email est activée sur ce projet Supabase
      setLoading(false);
      setError(
        "Compte créé, mais la confirmation par email est activée sur ce projet — désactive-la dans Supabase (Authentication → Sign In / Providers → Email → Confirm email) pour que l'inscription soit immédiate, ou confirme le compte manuellement pour l'instant.",
      );
      return;
    }

    const { error: shopError } = await supabase.from("shops").insert({
      owner_id: signUpData.user.id,
      name: shopName,
      subdomain: slugify(subdomain || shopName),
    });

    setLoading(false);
    if (shopError) {
      setError(shopError.message);
      return;
    }
    setPending(true);
  }

  if (pending) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="max-w-sm bg-surface rounded-card p-6">
          <div className="font-heading font-bold text-lg text-accent mb-2">
            Boutique créée
          </div>
          <p className="text-sm text-muted">
            Ta boutique est en attente de validation par un administrateur.
            Tu pourras te connecter dès qu'elle sera approuvée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface rounded-card p-6 flex flex-col gap-3"
      >
        <div className="font-heading font-bold text-lg text-ink mb-2">
          Créer ma boutique
        </div>
        <input
          type="text" placeholder="Nom de la boutique" required
          value={shopName} onChange={(e) => setShopName(e.target.value)}
          className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="text" placeholder="Sous-domaine (ex : ma-boutique)"
          value={subdomain} onChange={(e) => setSubdomain(e.target.value)}
          className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="email" placeholder="Email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          type="password" placeholder="Mot de passe" required minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="h-11 rounded-lg bg-accent text-accent-ink font-heading font-bold text-sm mt-2 disabled:opacity-40"
        >
          {loading ? "Création..." : "Créer ma boutique"}
        </button>
        <Link to="/dashboard/login" className="text-xs text-muted text-center hover:text-ink">
          Déjà un compte ? Se connecter
        </Link>
      </form>
    </div>
  );
}
