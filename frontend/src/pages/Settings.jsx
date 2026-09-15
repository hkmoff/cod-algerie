import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { THEME_PRESETS, resetToAdminTheme } from "../lib/themes";

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shop, setShop] = useState(null);
  const [theme, setTheme] = useState("dark-premium");
  const [accentColor, setAccentColor] = useState("#D4FF3D");
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    resetToAdminTheme(); // le back-office reste toujours neutre, même en réglant le thème du site
    loadData();
  }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      navigate("/dashboard/login");
      return;
    }

    const { data: shopData } = await supabase
      .from("shops")
      .select("id, name, theme, accent_color, logo_url")
      .eq("owner_id", sessionData.session.user.id)
      .maybeSingle();

    if (shopData) {
      setShop(shopData);
      setTheme(shopData.theme || "dark-premium");
      setAccentColor(shopData.accent_color || THEME_PRESETS[shopData.theme]?.defaultAccent || "#D4FF3D");
      setLogoUrl(shopData.logo_url);
    }
    setLoading(false);
  }

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file || !shop) return;

    setUploading(true);
    const path = `${shop.id}/branding/logo-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    setUploading(false);
    if (error) return;

    const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
    setLogoUrl(publicUrl.publicUrl);
  }

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("shops")
      .update({ theme, accent_color: accentColor, logo_url: logoUrl })
      .eq("id", shop.id);
    setSaving(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Chargement...</div>;
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center text-muted text-sm">
        Aucune boutique associée à ce compte.
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <span className="font-heading font-bold text-ink">
          {shop.name}
          <span className="text-accent">.</span>
        </span>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-xs text-muted hover:text-ink">Commandes</Link>
          <Link to="/dashboard/products" className="text-xs text-muted hover:text-ink">Produits</Link>
          <Link to="/dashboard/settings" className="text-xs text-accent font-semibold">Thème</Link>
        </div>
      </div>

      <div className="bg-surface rounded-card p-5 flex flex-col gap-5">
        <div>
          <div className="text-sm font-heading font-bold text-ink mb-3">Thème de la page produit</div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTheme(key);
                  if (!shop.accent_color) setAccentColor(preset.defaultAccent);
                }}
                className={`text-left rounded-lg p-3 border-2 ${theme === key ? "border-accent" : "border-white/10"}`}
                style={{ background: preset.canvas }}
              >
                <div className="w-full h-8 rounded mb-2" style={{ background: preset.defaultAccent }} />
                <div className="text-xs" style={{ color: preset.ink }}>{preset.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-heading font-bold text-ink mb-2">Couleur d'accent</div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-11 h-11 rounded-lg bg-canvas border border-white/10 cursor-pointer"
            />
            <span className="text-sm text-muted">{accentColor}</span>
          </div>
        </div>

        <div>
          <div className="text-sm font-heading font-bold text-ink mb-2">Logo</div>
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="" className="w-12 h-12 rounded object-cover" />}
            <label className="text-xs text-muted">
              {uploading ? "Envoi..." : "Choisir une image"}
              <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="block mt-1 text-xs" />
            </label>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="h-11 rounded-lg bg-accent text-accent-ink font-heading font-bold text-sm disabled:opacity-40"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
