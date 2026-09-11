/**
 * Worker cod-algerie-api
 *
 * Rôle : tout ce qui a besoin d'un secret (identifiants transporteur) passe
 * par ici. Le reste (lire une boutique, lire des produits, créer une
 * commande) se fait directement depuis le frontend vers Supabase, protégé
 * par les policies RLS déjà en place.
 *
 * Utilise le client officiel "dzship" (npm) plutôt que des appels HTTP
 * écrits à la main — gestion d'erreurs typée et limites intégrées.
 *
 * Routes :
 *   POST /api/rate    → calcule le frais de livraison réel pour une commande
 *   POST /api/ship     → crée le colis chez le transporteur (confirmation vendeur)
 *   GET  /api/track     → suit un colis par son numéro
 */
import dzship, { DzshipError } from "dzship";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function supabaseRest(env: Env, path: string): Promise<any> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase REST error (${res.status}) on ${path}`);
  }
  return res.json();
}

/** Construit le client dzship pour une boutique donnée, à partir de ses
 * identifiants transporteur stockés dans Supabase. */
async function clientForShop(env: Env, shopId: string) {
  const shops = await supabaseRest(
    env,
    `shops?id=eq.${shopId}&select=origin_wilaya_code`,
  );
  if (!shops.length || !shops[0].origin_wilaya_code) {
    throw json({ error: "Boutique introuvable ou wilaya d'origine non configurée" }, 404);
  }
  const fromWilaya = shops[0].origin_wilaya_code;

  const creds = await supabaseRest(
    env,
    `shop_courier_credentials?shop_id=eq.${shopId}&select=courier,api_id,api_token`,
  );
  if (!creds.length) {
    throw json({ error: "Aucun transporteur connecté pour cette boutique" }, 404);
  }
  const { courier, api_id, api_token } = creds[0];

  return dzship({
    courier,
    credentials: { apiId: api_id, apiToken: api_token },
    options: { fromWilaya },
  });
}

/** Traduit une DzshipError en réponse HTTP claire pour le frontend. */
function dzshipErrorResponse(err: unknown): Response {
  if (err instanceof Response) return err; // déjà une réponse (ex: boutique introuvable)
  if (err instanceof DzshipError) {
    const status = err.code === "rate_limited" ? 429 : err.status || 502;
    return json({ error: err.message, code: err.code, fields: err.fields }, status);
  }
  return json({ error: (err as Error).message ?? "Erreur inconnue" }, 500);
}

interface RateRequestBody {
  shop_id: string;
  wilaya_code: number;
  delivery_mode: "home" | "stopdesk";
}

async function handleRate(request: Request, env: Env): Promise<Response> {
  const body: RateRequestBody = await request.json();
  const { shop_id, wilaya_code, delivery_mode } = body;
  if (!shop_id || !wilaya_code || !delivery_mode) {
    return json({ error: "shop_id, wilaya_code et delivery_mode sont requis" }, 400);
  }

  const client = await clientForShop(env, shop_id);
  const quote = await client.rates({ toWilaya: wilaya_code, deliveryType: delivery_mode });

  return json({
    deliveryFee: quote.deliveryFee,
    returnFee: quote.returnFee,
    currency: quote.currency ?? "DZD",
  });
}

interface ShipRequestBody {
  shop_id: string;
  recipient: { fullName: string; phone: string; wilayaCode: number; communeName: string };
  deliveryType: "home" | "stopdesk";
  productList: string;
  codAmount: number;
}

async function handleShip(request: Request, env: Env): Promise<Response> {
  const body: ShipRequestBody = await request.json();
  const { shop_id, ...order } = body;
  if (!shop_id) return json({ error: "shop_id est requis" }, 400);

  const client = await clientForShop(env, shop_id);
  const { trackingNumber } = await client.createOrder(order);

  return json({ trackingNumber });
}

async function handleTrack(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const shopId = url.searchParams.get("shop_id");
  const trackingNumber = url.searchParams.get("tracking_number");
  if (!shopId || !trackingNumber) {
    return json({ error: "shop_id et tracking_number sont requis" }, 400);
  }

  const client = await clientForShop(env, shopId);
  const { status, events } = await client.track(trackingNumber);

  return json({ status, events });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/rate" && request.method === "POST") {
        return await handleRate(request, env);
      }
      if (url.pathname === "/api/ship" && request.method === "POST") {
        return await handleShip(request, env);
      }
      if (url.pathname === "/api/track" && request.method === "GET") {
        return await handleTrack(request, env);
      }
    } catch (err) {
      return dzshipErrorResponse(err);
    }

    return json({ error: "Not found" }, 404);
  },
};
