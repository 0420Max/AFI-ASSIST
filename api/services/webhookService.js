import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const VALID_INTENTS = ['wrap', 'escalation', 'product_request'];
const WEBHOOK_URLS = {
  wrap: process.env.WRAP_WEBHOOK_URL,
  escalation: process.env.ESCALATION_WEBHOOK_URL,
  product_request: process.env.PRODUCT_WEBHOOK_URL
};

const AFI_OPS_BACKEND_URL =
  process.env.AFI_OPS_BACKEND_URL || 'https://afi-ops-backend.onrender.com';
const AFI_AI_TOKEN = process.env.AFI_AI_TOKEN || '';

/**
 * notifyBackendEscalation — appelle POST /api/chat/escalation-update
 * sur afi-ops-backend pour update la description du ticket Monday avec
 * le résumé AI structuré. Fire-and-forget : Zapier reste authoritative.
 *
 * @param {object} params
 * @param {string} params.conversationId   ID de la conversation chat backend
 * @param {string} params.summary           Résumé du problème (5-1000 chars)
 * @param {string} [params.stepsDone]       Étapes diagnostic effectuées
 * @param {string} [params.productMentioned] Modèle/produit concerné
 * @returns {Promise<{ok:boolean, status?:number, error?:string}>}
 */
export async function notifyBackendEscalation({
  conversationId,
  summary,
  stepsDone,
  productMentioned
}) {
  if (!conversationId) {
    console.warn('[notifyBackend] missing conversationId, skip');
    return { ok: false, error: 'NO_CONV_ID' };
  }
  if (!AFI_AI_TOKEN) {
    console.warn('[notifyBackend] AFI_AI_TOKEN not set, skip');
    return { ok: false, error: 'NO_TOKEN' };
  }

  try {
    const response = await axios.post(
      `${AFI_OPS_BACKEND_URL}/api/chat/escalation-update`,
      {
        conversationId,
        summary: summary || '',
        stepsDone: stepsDone || '',
        productMentioned: productMentioned || ''
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-AFI-AI-Token': AFI_AI_TOKEN
        },
        timeout: 10000
      }
    );
    console.log('[notifyBackend] ✅ ticket updated:', response.data);
    return { ok: true, ...response.data };
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    console.warn('[notifyBackend] ❌ failed:', status, data || error.message);
    // Ne jamais throw : Zapier reste authoritative
    return { ok: false, status, error: data?.error || error.message };
  }
}

export const triggerWebhook = async ({
  intent,
  summary,
  client_email,
  client_name,
  conversationId,
  stepsDone,
  productMentioned
}) => {
  // Skip if intent is not valid or is 'none'
  if (!VALID_INTENTS.includes(intent)) {
    console.log(`[WEBHOOK SERVICE] Skipping webhook for invalid intent: ${intent}`);
    return null;
  }

  console.log('[WEBHOOK SERVICE] Preparing to trigger webhook with intent:', intent);
  console.log('[WEBHOOK SERVICE] Webhook URLs configured:', WEBHOOK_URLS);

  const payload = {
    intent,
    client_email: client_email || 'unknown@client.com',
    client_name: client_name || 'Unknown Client',
    summary,
    source: 'AFI Assist Web Chat',
    timestamp: new Date().toISOString()
  };

  console.log('[WEBHOOK SERVICE] Sending payload:', payload);

  try {
    const url = WEBHOOK_URLS[intent];
    if (!url) {
      throw new Error(`No webhook URL configured for intent: ${intent}`);
    }
    console.log(`[WEBHOOK SERVICE] Sending to URL: ${url}`);

    const response = await axios.post(url, payload, {
      timeout: 10000 // 10 second timeout
    });
    console.log('[WEBHOOK SERVICE] Webhook successful, response:', response.data);

    // Notifier afi-ops-backend en parallèle (fire-and-forget) pour les
    // escalations : update description ticket Monday avec le résumé AI.
    // Zapier reste authoritative — backend down ne bloque pas l'email.
    if (intent === 'escalation' && conversationId) {
      notifyBackendEscalation({
        conversationId,
        summary,
        stepsDone,
        productMentioned
      }).catch((e) =>
        console.warn('[WEBHOOK SERVICE] backend notify failed:', e.message)
      );
    }

    return response.data;
  } catch (error) {
    console.error('[WEBHOOK SERVICE] Webhook error:', error);
    if (error.response) {
      console.error('[WEBHOOK SERVICE] Response data:', error.response.data);
      console.error('[WEBHOOK SERVICE] Response status:', error.response.status);
      console.error('[WEBHOOK SERVICE] Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('[WEBHOOK SERVICE] No response received:', error.request);
    }
    throw error;
  }
};
