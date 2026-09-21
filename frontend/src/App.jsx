import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./lib/supabase";
import OrderForm from "./components/OrderForm";
import { applyTheme } from "./lib/themes";

const DEMO_SHOP_ID = import.meta.env.VITE_DEMO_SHOP_ID;

const CATEGORY_LABELS = {
  vetement: "Vêtement",
  cosmetique: "Cosmétique",
  gadget: "Gadget / Électronique",
  maison: "Maison",
  autre: "Boutique",
};

export default function App() {
  const { subdomain } = useParams();
  const [shop, setShop] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("shops")
        .select("id, name, logo_url, theme, accent_color")
        .eq("status", "active");

      query = subdomain ? query.eq("subdomain", subdomain) : query.eq("id", DEMO_SHOP_ID);

      const { data: shopData } = await query.maybeSingle();

      if (!shopData) {
        setLoading(false);
        return;
      }

      applyTheme(shopData.theme, shopData.accent_color);

      const { data: productData } = await supabase
        .from("products")
        .select("id, name, description, price, compare_at_price, images, category")
        .eq("shop_id", shopData.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      setShop(shopData);
      setProduct(productData ?? null);
      setLoading(false);
    }
    load();
  }, [subdomain]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Chargement...</div>;
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <div className="font-heading font-bold text-lg text-ink mb-2">
            Boutique introuvable
          </div>
          <p className="text-muted text-sm">
            Cette boutique n'existe pas ou n'est pas encore active.
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <div className="font-heading font-bold text-lg text-ink mb-2">
            {shop.name}
          </div>
          <p className="text-muted text-sm">
            Aucun produit disponible pour le moment.
          </p>
        </div>
      </div>
    );
  }

  const images = product.images?.length ? product.images.slice(0, 3) : [];
  const mainImage = images[activeImage] ?? images[0];

  return (
    <div className="min-h-screen flex justify-center py-8 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4 px-1 animate-fade-in-up">
          <span className="font-heading font-bold text-ink flex items-center gap-2">
            {shop.logo_url && (
              <img src={shop.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
            )}
            {shop.name}
          </span>
          <span className="text-xs text-muted bg-surface px-3 py-1 rounded-full">
            58 wilayas
          </span>
        </div>

        <div className="bg-surface rounded-card overflow-hidden mb-4 animate-fade-in-up">
          <div className="h-80 bg-canvas overflow-hidden">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 ease-out hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-muted text-sm">Photo produit</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 px-4 pt-4">
              {images.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setActiveImage(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden transition-all duration-200 ${
                    i === activeImage
                      ? "ring-2 ring-accent opacity-100"
                      : "ring-1 ring-white/10 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-5">
            <div className="text-[11px] uppercase tracking-widest text-accent font-heading font-bold mb-2">
              {CATEGORY_LABELS[product.category] ?? "Boutique"}
            </div>
            <h1 className="font-heading font-bold text-2xl tracking-tight text-ink mb-2">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-sm text-muted mb-4 leading-relaxed">{product.description}</p>
            )}
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-3xl text-accent tracking-tight">
                {product.price} DA
              </span>
              {product.compare_at_price && (
                <span className="text-sm text-muted line-through">
                  {product.compare_at_price} DA
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="animate-fade-in-up [animation-delay:100ms]">
          <OrderForm shopId={shop.id} product={product} />
        </div>
      </div>
    </div>
  );
}
