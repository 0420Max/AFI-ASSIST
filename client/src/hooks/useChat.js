import { useState, useEffect } from "react";
import axios from "axios";

const useChat = () => {
  console.log('[USE CHAT] Initializing chat hook');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [wrapUpContent, setWrapUpContent] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);
  const [currentIntent, setCurrentIntent] = useState(null);

const startChat = async (userData) => {
  console.log('[USE CHAT] Starting chat with user data:', userData);
  try {
    setLoading(true);
    setError(null);
    console.log('[USE CHAT] Creating new thread...');
    const response = await axios.post("/api/thread", {
      name: userData.name,
      email: userData.email // Will be null initially
    });
    
    console.log('[USE CHAT] Thread created, response:', response.data);
    setThreadId(response.data.threadId);
    setUserInfo({
      name: userData.name,
      email: userData.email // Will be null initially
    });
    
    const greetingMessage = {
      role: "assistant",
      content: `Salut ${userData.name} ! Juste pour documenter ton dossier, avant de commencer, j'peux avoir ton courriel ?`,
      timestamp: new Date().toISOString(),
    };
    
    console.log('[USE CHAT] Setting simplified greeting message');
    setMessages([greetingMessage]);
  } catch (error) {
    console.error('[USE CHAT] Error starting chat:', error);
    setError("Failed to start chat. Please try again.");
    throw error;
  } finally {
    setLoading(false);
  }
};

  const handleSendMessage = async (message) => {
    if (!threadId) {
      console.error('[USE CHAT] No thread ID available');
      setError("Chat session not initialized");
      return;
    }

    console.log('[USE CHAT] Handling user message:', message);
    const userMessage = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    console.log('[USE CHAT] Adding user message to UI');
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
    // Check if message contains an email pattern
    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch && userInfo) {
      const email = emailMatch[0];
      console.log('[USE CHAT] Detected email in message:', email);
      
      // Update both local state and backend
      setUserInfo(prev => ({ ...prev, email }));
      
      // Update the thread with the new email while preserving name
      await axios.post("/api/thread/update", {
        threadId,
        email
      });
    }
      console.log('[USE CHAT] Sending message to API');
      const response = await axios.post("/api/message", {
        message,
        threadId,
      });
      console.log('[USE CHAT] API response:', response.data);

      const assistantMessage = {
        role: "assistant",
        content: response.data.text,
        timestamp: new Date().toISOString(),
      };

      console.log('[USE CHAT] Adding assistant response to UI:', assistantMessage);
      setMessages((prev) => [...prev, assistantMessage]);

      if (response.data.wrapUp) {
        console.log('[USE CHAT] Wrap-up content detected:', response.data.wrapUp);
        console.log('[USE CHAT] Intent detected:', response.data.intent);
        setWrapUpContent(response.data.wrapUp);
        setCurrentIntent(response.data.intent);
      }
    } catch (error) {
      console.error('[USE CHAT] Error sending message:', error);
      setError("Failed to send message. Please try again.");
      const errorMessage = {
        role: "assistant",
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        timestamp: new Date().toISOString(),
      };
      console.log('[USE CHAT] Adding error message to UI');
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    console.log('[USE CHAT] Handling confirmation');
    try {
      setLoading(true);
      // Send a "Confirm" message in French to match the assistant's language
      await handleSendMessage("Je confirme");
    } catch (error) {
      console.error('[USE CHAT] Confirmation failed:', error);
      setError("Confirmation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWebhookTrigger = async (intent, summary) => {
    console.log('[USE CHAT] Triggering webhook with intent:', intent);
    console.log('[USE CHAT] Summary content:', summary);
    console.log('[USE CHAT] Current user info:', userInfo);
    
    try {
      setLoading(true);
      setError(null);
      
      // Show processing message
      const processingMessage = {
        role: "assistant",
        content: intent === "wrap" 
          ? "J'envoie maintenant le résumé..." 
          : "Je transfère votre demande à l'équipe concernée...",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, processingMessage]);

      // Trigger webhook
      const result = await axios.post("/api/webhook", {
        intent,
        summary,
        client_email: userInfo?.email || "unknown@client.com",
        client_name: userInfo?.name || "Unknown Client"
      });
      console.log('[USE CHAT] Webhook successful, result:', result.data);

      // Show success message
      const successMessage = {
        role: "assistant",
        content: intent === "wrap"
          ? "Résumé envoyé avec succès ! Puis-je vous aider avec autre chose ?"
          : "Demande soumise ! Notre équipe vous contactera sous peu.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, successMessage]);
      
      setWrapUpContent(null);
      setCurrentIntent(null);
    } catch (error) {
      console.error('[USE CHAT] Webhook error:', error);
      setError("Failed to submit request. Please try again.");
      const errorMessage = {
        role: "assistant",
        content: "Désolé, une erreur s'est produite lors de l'envoi de votre demande.",
        timestamp: new Date().toISOString(),
      };
      console.log('[USE CHAT] Adding webhook error message to UI');
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    wrapUpContent,
    userInfo,
    error,
    intent: currentIntent,
    startChat,
    handleSendMessage,
    handleConfirm,
    handleWebhookTrigger,
  };
};

export default useChat;