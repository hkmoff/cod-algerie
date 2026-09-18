import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { resetToAdminTheme } from "../lib/themes";

const CATEGORIES = [
  { value: "vetement", label: "Vêtement" },
  { value: "cosmetique", label: "Cosmétique" },
  { value: "gadget", label: "Gadget / Électronique" },
  { value: "maison", label: "Maison" },
  { value: "autre", label: "Autre" },
];

const EMPTY_FORM = {
  id: null,
  name: "",
  description: "",
  price: "",
  compare_at_price: "",
  stock: "",
  status: "active",
  category: "autre",
  images: [],
  variants: [],
};

export default function Products() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      navigate("/dashboard/login");
      return;
    }

    const { data: shopData } = await supabase
      .from("shops")
      .select("id, name, status")
      .eq("owner_id", sessionData.session.user.id)
      .maybeSingle();

    if (!shopData) {
      setLoading(false);
      return;
    }
    setShop(shopData);

    if (shopData.status !== "active") {
      setLoading(false);
      return;
    }

    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, price, stock, status, images, category")
      .eq("shop_id", shopData.id)
      .order("created_at", { ascending: false });

    setProducts(productsData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    resetToAdminTheme();
    loadData();
  }, []);

  async function openNewForm() {
    setForm(EMPTY_FORM);
  }

  async function openEditForm(p) {
    const { data: variantsData } = await supabase
      .from("product_variants")
      .select("id, name, stock")
      .eq("product_id", p.id)
      .order("name");

    setForm({
      ...p,
      price: String(p.price),
      stock: String(p.stock),
      compare_at_price: "",
      description: p.description ?? "",
      variants: (variantsData ?? []).map((v) => ({ ...v, stock: String(v.stock) })),
    });
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !shop) return;

    setUploading(true);
    const path = `${shop.id}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    setUploading(false);

    if (error) return;
    const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, images: [...f.images, publicUrl.publicUrl] }));
  }

  function removeImage(url) {
    setForm((f) => ({ ...f, images: f.images.filter((img) => img !== url) }));
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { id: null, name: "", stock: "" }] }));
  }

  function updateVariant(index, field, value) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[index] = { ...variants[index], [field]: value };
      return { ...f, variants };
    });
  }

  function removeVariant(index) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      shop_id: shop.id,
      name: form.name,
      description: form.description,
      price: Number(form.price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      stock: Number(form.stock) || 0,
      status: form.status,
      category: form.category,
      images: form.images,
    };

    let productId = form.id;

    if (productId) {
      await supabase.from("products").update(payload).eq("id", productId);
      await supabase.from("product_variants").delete().eq("product_id", productId);
    } else {
      const { data: created } = await supabase.from("products").insert(payload).select("id").single();
      productId = created?.id;
    }

    const validVariants = form.variants.filter((v) => v.name.trim());
    if (productId && validVariants.length) {
      await supabase.from("product_variants").insert(
        validVariants.map((v) => ({
          product_id: productId,
          name: v.name,
          stock: Number(v.stock) || 0,
        })),
      );
    }

    setSaving(false);
    setForm(null);
    loadData();
  }

  async function handleDelete(id) {
    await supabase.from("products").delete().eq("id", id);
    loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/dashboard/login");
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

  if (shop.status !== "active") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="max-w-sm bg-surface rounded-card p-6">
          <div className="font-heading font-bold text-lg text-ink mb-2">
            {shop.status === "pending" ? "En attente de validation" : "Boutique suspendue"}
          </div>
          <p className="text-sm text-muted">
            {shop.status === "pending"
              ? "Un administrateur doit approuver ta boutique avant que tu puisses gérer tes produits."
              : "Contacte l'administrateur de la plateforme pour plus d'informations."}
          </p>
        </div>
        <button onClick={handleLogout} className="text-xs text-muted hover:text-ink">
          Déconnexion
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span className="font-heading font-bold text-ink">
          {shop.name}
        </span>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-xs text-muted hover:text-ink">Commandes</Link>
          <Link to="/dashboard/products" className="text-xs text-accent font-semibold">Produits</Link>
          <Link to="/dashboard/settings" className="text-xs text-muted hover:text-ink">Thème</Link>
        </div>
      </div>

      {!form && (
        <>
          <button
            onClick={openNewForm}
            className="mb-4 h-10 px-4 rounded-lg bg-accent text-accent-ink font-heading font-bold text-sm"
          >
            + Ajouter un produit
          </button>

          <div className="bg-surface rounded-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs border-b border-white/10">
                  <th className="p-3 font-normal">Produit</th>
                  <th className="p-3 font-normal">Catégorie</th>
                  <th className="p-3 font-normal">Prix</th>
                  <th className="p-3 font-normal">Stock</th>
                  <th className="p-3 font-normal">Statut</th>
                  <th className="p-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="p-3 text-ink flex items-center gap-2">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-canvas" />
                      )}
                      {p.name}
                    </td>
                    <td className="p-3 text-muted">
                      {CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category}
                    </td>
                    <td className="p-3 text-ink">{p.price} DA</td>
                    <td className="p-3 text-muted">{p.stock}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${p.status === "active" ? "bg-green-500/15 text-green-400" : "bg-white/5 text-muted"}`}>
                        {p.status === "active" ? "actif" : "brouillon"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openEditForm(p)}
                        className="text-xs px-2 py-1 rounded bg-white/5 text-muted hover:bg-white/10 mr-1"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted text-sm">
                      Aucun produit pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {form && (
        <form onSubmit={handleSave} className="bg-surface rounded-card p-5 flex flex-col gap-3 max-w-md">
          <div className="font-heading font-bold text-sm text-ink mb-1">
            {form.id ? "Modifier le produit" : "Nouveau produit"}
          </div>

          <input
            type="text" placeholder="Nom du produit" required
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />

          <select
            value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <textarea
            placeholder="Description" rows={3}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg bg-canvas border border-white/10 px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" placeholder="Prix (DA)" required
              value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              type="number" placeholder="Prix barré (optionnel)"
              value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
              className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" placeholder="Stock global" required
              value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <select
              value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-11 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="active">Actif</option>
              <option value="draft">Brouillon</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-muted mb-2">
              Variantes (tailles, couleurs...) — laisse vide si non applicable
            </div>
            <div className="flex flex-col gap-2">
              {form.variants.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text" placeholder="Ex : S, M, L"
                    value={v.name} onChange={(e) => updateVariant(i, "name", e.target.value)}
                    className="flex-1 h-10 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <input
                    type="number" placeholder="Stock"
                    value={v.stock} onChange={(e) => updateVariant(i, "stock", e.target.value)}
                    className="w-24 h-10 rounded-lg bg-canvas border border-white/10 px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button type="button" onClick={() => removeVariant(i)} className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 text-sm">×</button>
                </div>
              ))}
            </div>
            <button
              type="button" onClick={addVariant}
              className="mt-2 text-xs px-3 py-2 rounded-lg bg-white/5 text-muted hover:bg-white/10"
            >
              + Ajouter une variante
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {form.images.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="w-16 h-16 rounded object-cover" />
                <button type="button" onClick={() => removeImage(url)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs">×</button>
              </div>
            ))}
          </div>
          <label className="text-xs text-muted">
            {uploading ? "Envoi de la photo..." : "Ajouter une photo"}
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="block mt-1 text-xs" />
          </label>

          <div className="flex gap-2 mt-2">
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-lg bg-accent text-accent-ink font-heading font-bold text-sm disabled:opacity-40">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="h-11 px-4 rounded-lg bg-white/5 text-muted text-sm">
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
