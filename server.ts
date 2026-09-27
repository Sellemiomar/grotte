import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config({ override: true });

// Helper to normalize Supabase URL if supplied as a bare project ID
function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = url.includes('.supabase.co') ? `https://${url}` : `https://${url}.supabase.co`;
  }
  return url.replace(/\/+$/, '');
}

if (process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL);
}
if (process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL);
}

// Initialize Sentry for server monitoring if DSN is configured
const serverSentryDsn = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;
if (serverSentryDsn) {
  Sentry.init({
    dsn: serverSentryDsn,
    tracesSampleRate: 0.2,
    environment: process.env.NODE_ENV || 'production',
  });
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Trust the reverse proxy layer (Nginx / Cloud Run) for accurate IP resolution
app.set('trust proxy', 1);

app.use(express.json());

// Dedicated rate limiter specifically for the AI investigation endpoint (max 20 calls/hr)
const aiInvestigateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  message: {
    error: 'Too Many Requests',
    message: 'Limite de requêtes atteinte pour l\'analyse IA (max 20 par heure).',
  },
});

// General sliding window rate limiter for other API endpoints (generous ceiling for DB operations)
const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  message: {
    error: 'Too Many Requests',
    message: 'Trop de requêtes vers le serveur. Veuillez patienter quelques secondes.',
  },
});

app.use('/api', generalApiLimiter);

// Secure Server-Side Proxy for Supabase
// Keeps secret API keys protected on the server and avoids "Forbidden use of secret API key in browser"
app.use('/api/supabase', async (req, res) => {
  const targetBaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const apiKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!targetBaseUrl || !apiKey) {
    res.status(503).json({
      error: 'Supabase configuration missing on server',
      message: 'Les identifiants Supabase ne sont pas configurés sur le serveur.',
    });
    return;
  }

  let normalizedUrl = (targetBaseUrl || '').trim();
  if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = normalizedUrl.includes('.supabase.co') ? `https://${normalizedUrl}` : `https://${normalizedUrl}.supabase.co`;
  }
  normalizedUrl = normalizedUrl.replace(/\/+$/, '');

  const targetUrl = `${normalizedUrl}${req.url}`;

  // Clean server headers: Supabase receives requests from a protected Node.js environment
  const forwardHeaders: Record<string, string> = {
    'apikey': apiKey,
  };

  const incomingAuth = req.headers['authorization'];
  if (incomingAuth && typeof incomingAuth === 'string' && incomingAuth.startsWith('Bearer ey')) {
    // If a valid Supabase Auth user JWT token is passed, preserve it for user-scoped RLS policies
    forwardHeaders['authorization'] = incomingAuth;
  } else {
    // Otherwise authenticate with the server-side API key
    forwardHeaders['authorization'] = `Bearer ${apiKey}`;
  }

  if (req.headers['content-type']) {
    forwardHeaders['content-type'] = req.headers['content-type'] as string;
  }
  if (req.headers['prefer']) {
    forwardHeaders['prefer'] = req.headers['prefer'] as string;
  }
  if (req.headers['range']) {
    forwardHeaders['range'] = req.headers['range'] as string;
  }
  if (req.headers['accept']) {
    forwardHeaders['accept'] = req.headers['accept'] as string;
  }

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    res.status(response.status);

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);

    const contentRange = response.headers.get('content-range');
    if (contentRange) res.setHeader('content-range', contentRange);

    const preferenceApplied = response.headers.get('preference-applied');
    if (preferenceApplied) res.setHeader('preference-applied', preferenceApplied);

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const responseData = await response.text();
    res.send(responseData);
  } catch (err: unknown) {
    console.error('[Supabase Proxy Error]', err);
    res.status(502).json({
      error: 'Proxy Error',
      message: 'Erreur lors de la communication avec la base de données Supabase.',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// Lazy-initialized Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Contextual expert fallback generator for resilient audit reports
function buildContextualHeuristic(body: any) {
  const { ingredientName, category, theoreticalUsage, actualUsage, varianceQty, varianceCost, unit, suspectedVectors } = body;
  const vectors = Array.isArray(suspectedVectors) && suspectedVectors.length > 0 
    ? suspectedVectors 
    : ['overportioning_waste'];

  const vectorDetails: Record<string, string> = {
    pos_void_pattern: 'des écarts liés à des annulations et offerts non justifiés en caisse',
    delivery_discrepancy: 'une discordance lors du déchargement ou pesage des livraisons fournisseurs',
    unsupervised_access: 'des accès hors-horaires de service dans le local de stockage',
    overportioning_waste: 'un sur-portionnage en cuisine ou des pertes de préparation non comptabilisées',
  };

  const vectorExplanations = vectors
    .map((v: string) => vectorDetails[v] || v)
    .join(' ainsi que ');

  return {
    analysis: `L'audit de coulage pour **${ingredientName || 'cet ingrédient'}** (${category || 'cuisine'}) révèle une perte nette de ${varianceQty || 0} ${unit || 'unités'} d'un montant de ${varianceCost || 0} DT (conso théorique : ${theoreticalUsage || 0}, réelle : ${actualUsage || 0}). Les corrélations suggèrent principalement ${vectorExplanations}.`,
    recommendations: [
      `Peser systématiquement chaque colis de ${ingredientName || 'produit'} à la réception avec ticket de pesée agrafé au bon de livraison.`,
      `Verrouiller les autorisations d'annulation (voids) et d'offerts sur le terminal de caisse aux seuls managers.`,
      `Contrôler les pointages horaires et passages badges vers la réserve en fin de service.`,
      `Mettre en place un comptage contradictoire au changement d'équipe pendant 7 jours.`
    ],
    source: 'heuristic'
  };
}

async function generateAuditAnalysisWithFallback(
  ai: GoogleGenAI,
  prompt: string
): Promise<{ analysis: string; recommendations: string[] } | null> {
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ];

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const responseText = response.text || '{}';
        let parsedData: { analysis?: string; recommendations?: string[] };
        try {
          parsedData = JSON.parse(responseText);
        } catch {
          parsedData = {
            analysis: responseText,
            recommendations: [
              'Contrôler les pesées de livraison à la réception',
              'Auditer les annulations de caisse et tickets offerts',
              'Instaurer un double comptage aux changements d\'équipe'
            ]
          };
        }

        if (parsedData && typeof parsedData.analysis === 'string') {
          return {
            analysis: parsedData.analysis,
            recommendations: Array.isArray(parsedData.recommendations)
              ? parsedData.recommendations
              : [
                  'Contrôler les pesées de livraison à la réception',
                  'Auditer les annulations de caisse et tickets offerts',
                  'Instaurer un double comptage aux changements d\'équipe'
                ]
          };
        }
      } catch (err: unknown) {
        const errorObj = err as { status?: number; code?: number; message?: string };
        const msg = errorObj?.message || String(err);
        const isTemporary =
          errorObj?.status === 503 ||
          errorObj?.code === 503 ||
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('RESOURCE_EXHAUSTED');

        console.log(`[Gemini Handler] Model ${model} unavailable (attempt ${attempt}), checking fallback options.`);

        if (isTemporary && attempt < 2) {
          // Brief pause before retry
          await new Promise((r) => setTimeout(r, 600 * attempt));
          continue;
        }
        break; // Try next candidate model
      }
    }
  }

  return null;
}

// Auth verification middleware for protected API endpoints
async function verifySupabaseAuth(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token d\'authentification manquant dans l\'en-tête Authorization.',
    });
    return;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Jeton d\'authentification vide.',
    });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (supabaseUrl && supabaseAnonKey) {
    if (token === 'demo-bearer-token' && isProduction) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Jeton démo interdit en environnement de production.',
      });
      return;
    }

    if (token !== 'demo-bearer-token') {
      try {
        const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error } = await supabaseServer.auth.getUser(token);
        if (error || !user) {
          res.status(401).json({
            error: 'Unauthorized',
            message: 'Jeton d\'authentification Supabase invalide ou expiré.',
          });
          return;
        }
      } catch {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Échec de vérification du jeton.',
        });
        return;
      }
    }
  }

  next();
}

// AI Anti-Shrinkage & Loss Correlation Expert API
app.post('/api/ai/investigate', aiInvestigateLimiter, verifySupabaseAuth, async (req, res) => {
  const body = req.body || {};
  const { ingredientName, category, theoreticalUsage, actualUsage, varianceQty, varianceCost, unit, suspectedVectors, accessLogsCount, posVoidsCount } = body;

  const ai = getGenAI();
  if (!ai) {
    return res.json(buildContextualHeuristic(body));
  }

  const prompt = `
Vous êtes un expert en gestion de ratios de restauration, contrôle de gestion matière (F&B Cost Controller) et audit anti-coulage pour le restaurant "La Grotte".
Analysez l'écart suivant :
- Ingrédient: ${ingredientName} (Rayon: ${category})
- Conso théorique (recettes × ventes): ${theoreticalUsage} ${unit}
- Conso réelle (inventaire): ${actualUsage} ${unit}
- Écart manquant: ${varianceQty} ${unit} (Perte financière: ${varianceCost} DT)
- Indices détectés: ${(suspectedVectors || []).join(', ')}
- Nombre de passages en réserve enregistrés: ${accessLogsCount || 0}
- Nombre d'annulations/offerts caisse (POS voids): ${posVoidsCount || 0}

Rédigez une synthèse concise en français (3 phrases maximum) expliquant la cause la plus probable du coulage (vol, erreur de livraison, sur-portionnage, ou manipulation caisse), suivie de 3 à 4 actions correctives opérationnelles concrètes et immédiates pour la brigade de cuisine et le service en salle.
Répondez au format JSON avec la structure:
{
  "analysis": "synthèse concise",
  "recommendations": ["action 1", "action 2", "action 3"]
}
`;

  try {
    const result = await generateAuditAnalysisWithFallback(ai, prompt);
    if (result) {
      return res.json({
        ...result,
        source: 'gemini'
      });
    }

    // If Gemini models are experiencing peak demand spikes, fall back seamlessly
    return res.json(buildContextualHeuristic(body));
  } catch (err: any) {
    console.log('[Gemini Notice] Fallback activated for audit analysis');
    return res.json(buildContextualHeuristic(body));
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
