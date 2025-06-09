import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const VALID_INTENTS = ['wrap', 'escalation', 'product_request'];
const WEBHOOK_URLS = {
  wrap: process.env.WRAP_WEBHOOK_URL,
  escalation: process.env.ESCALATION_WEBHOOK_URL,
  product_request: process.env.PRODUCT_WEBHOOK_URL
};

export const triggerWebhook = async ({ intent, summary, client_email, client_name }) => {
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