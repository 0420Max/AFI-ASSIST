import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createThread, sendMessage, updateThreadWithEmail } from './services/assistantService.js';
import { triggerWebhook } from './services/webhookService.js';

import path from "path";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API endpoints
app.post('/api/thread', async (req, res) => {
  console.log('[SERVER] /api/thread request received. Body:', req.body);
  try {
    const { name, email } = req.body;
    // Pass user info even if email is null
    const threadId = await createThread({ name, email });
    console.log('[SERVER] Thread created successfully, ID:', threadId);
    res.json({ threadId });
  } catch (error) {
    console.error('[SERVER] Error in /api/thread:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || null
    });
  }
});

app.post('/api/thread/update', async (req, res) => {
  console.log('[SERVER] /api/thread/update request received. Body:', req.body);
  try {
    const { threadId, email } = req.body;
    
    if (!threadId || !email) {
      throw new Error('Thread ID and email are required');
    }

    const result = await updateThreadWithEmail(threadId, email);
    console.log('[SERVER] Thread updated successfully:', result);
    
    res.json(result);
  } catch (error) {
    console.error('[SERVER] Error updating thread:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || null
    });
  }
});

app.post('/api/message', async (req, res) => {
  console.log('[SERVER] /api/message request received. Body:', req.body);
  try {
    const { message, threadId } = req.body;
    const response = await sendMessage(message, threadId);
    console.log('[SERVER] Message processed successfully. Response:', response);
    res.json(response);
  } catch (error) {
    console.error('[SERVER] Error in /api/message:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || null
    });
  }
});

app.post('/api/webhook', async (req, res) => {
  console.log('[SERVER] /api/webhook request received. Body:', req.body);
  try {
    const { intent, summary, client_email, client_name } = req.body;
    console.log('[SERVER] Triggering webhook with:', { intent, summary, client_email, client_name });
    const result = await triggerWebhook({ intent, summary, client_email, client_name });
    console.log('[SERVER] Webhook result:', result);
    res.json(result);
  } catch (error) {
    console.error('[SERVER] Error in /api/webhook:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || null
    });
  }
});

app.get('/api/health', (req, res) => {
  console.log('[SERVER] Health check request received');
  res.json({ status: 'ok' });
});

const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "/client/dist")));

app.use(( res ) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});

app.use((err, res) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
});