import OpenAI from "openai";
import dotenv from "dotenv";
import axios from "axios";
import { triggerWebhook } from "./webhookService.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Valid intents for webhooks
const VALID_INTENTS = ["wrap", "escalation", "product_request"];

// Session store (now includes user info and last activity timestamp)
const sessionStore = new Map();

// Clean up inactive sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [threadId, session] of sessionStore.entries()) {
    if (now - session.lastActivity > 3600000) {
      // 1 hour inactivity
      sessionStore.delete(threadId);
      console.log(`[SESSION CLEANUP] Removed inactive thread ${threadId}`);
    }
  }
}, 3600000); // Check every hour

export const createThread = async (userInfo = null) => {
  console.log("[ASSISTANT SERVICE] Creating new thread...");
  try {
    const thread = await openai.beta.threads.create();
    console.log(`[ASSISTANT SERVICE] Thread created with ID: ${thread.id}`);

    // Store all available user info
    const sessionData = {
      user: {
        name: userInfo?.name || null,
        email: userInfo?.email || null,
      },
      lastActivity: Date.now(),
    };
    
    sessionStore.set(thread.id, sessionData);
    console.log("[ASSISTANT SERVICE] Session created:", sessionData);

    // Add user info as initial message if provided
    if (userInfo?.name) {
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `[CLIENT INFO] Name: ${userInfo.name}` + 
                (userInfo.email ? `, Email: ${userInfo.email}` : ''),
      });
    }

    return thread.id;
  } catch (error) {
    console.error("[ASSISTANT SERVICE] Error creating thread:", error);
    throw error;
  }
};

export const getUserInfo = (threadId) => {
  const session = sessionStore.get(threadId);
  if (session) {
    session.lastActivity = Date.now(); // Update last activity timestamp
    console.log(
      `[ASSISTANT SERVICE] Retrieved user info for thread ${threadId}:`,
      session.user
    );
    return session.user;
  }
  return null;
};

// Before adding new messages, check for active runs
async function ensureThreadReady(threadId) {
  try {
    const runs = await openai.beta.threads.runs.list(threadId);
    const activeRun = runs.data.find((run) =>
      ["queued", "in_progress", "requires_action"].includes(run.status)
    );

    if (activeRun) {
      console.log(`[ASSISTANT SERVICE] Cancelling active run ${activeRun.id}`);
      await openai.beta.threads.runs.cancel(threadId, activeRun.id);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error("[ASSISTANT SERVICE] Error checking thread status:", error);
    throw error;
  }
}

// Function to send a message to the assistant and handle the response
export const sendMessage = async (message, threadId) => {
  console.log(
    `[ASSISTANT SERVICE] Sending message to thread ${threadId}:`,
    message
  );

  // Get user info if available and update last activity
  const userInfo = getUserInfo(threadId);
  console.log(`[ASSISTANT SERVICE] User context for this thread:`, userInfo);

  try {
    // Ensure the thread is ready for new messages
    await ensureThreadReady(threadId);
    // Add message to thread
    console.log("[ASSISTANT SERVICE] Adding user message to thread...");
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // Run assistant
    console.log("[ASSISTANT SERVICE] Creating assistant run...");
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID,
    });
    console.log(
      `[ASSISTANT SERVICE] Run created with ID: ${run.id}, status: ${run.status}`
    );

    // Check run status with timeout
    const startTime = Date.now();
    const TIMEOUT = 30000; // 30 seconds timeout
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    console.log(`[ASSISTANT SERVICE] Initial run status: ${runStatus.status}`);

    // Poll for completion
    while (runStatus.status !== "completed") {
      if (Date.now() - startTime > TIMEOUT) {
        console.error("[ASSISTANT SERVICE] Run timed out");
        await openai.beta.threads.runs.cancel(threadId, run.id);
        throw new Error("Assistant response timed out");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      console.log(
        `[ASSISTANT SERVICE] Current run status: ${runStatus.status}`
      );

      // Handle requires_action status
      if (runStatus.status === "requires_action") {
        console.log(
          "[ASSISTANT SERVICE] Run requires action, processing tool calls"
        );

        try {
          const toolOutputs = [];
          const toolCalls =
            runStatus.required_action.submit_tool_outputs.tool_calls;

          for (const toolCall of toolCalls) {
            console.log(
              `[ASSISTANT SERVICE] Processing tool call ${toolCall.id} - ${toolCall.function.name}`
            );

              // Update session activity for every tool call
              if (sessionStore.has(threadId)) {
                sessionStore.get(threadId).lastActivity = Date.now();
              }

            try {
              // Parse the function arguments
              const args = JSON.parse(toolCall.function.arguments);

              // Check for email in all tool calls
              if (!args.client_email && !userInfo?.email) {
                console.log('[TOOL CALL] Blocked - No client email provided');
                return {
                  tool_call_id: toolCall.id,
                  output: JSON.stringify({ 
                    error: "Nous avons besoin de votre email pour continuer. Pourriez-vous me fournir votre adresse email ?" 
                  }),
                };
              }
              
              let webhookUrl, payload;

              // Handle each function type
              switch (toolCall.function.name) {
                case "sendUnifiedEmail":
                  console.log('[ASSISTANT SERVICE] Unified email arguments:', args);
                  webhookUrl = process.env.WRAP_WEBHOOK_URL;
                  payload = {
                    intent: "wrap",
                    client_name: args.client_name || userInfo?.name || "Non spécifié",
                    client_email: args.client_email || userInfo?.email || "unknown@client.com",
                    product_model: args.product_model || args.model || "Non spécifié",
                    problem_description: args.problem_description || args.description || args.issue || "Aucun description de problème fournie",
                    wrap_summary: args.wrap_summary || args.summary || args.wrap_content || "Aucun résumé fourni",
                  };
                  break;

                case "sendEscalationEmail":
                  console.log('[ASSISTANT SERVICE] Escalation arguments:', args);
                  webhookUrl = process.env.ESCALATION_WEBHOOK_URL;
                  payload = {
                    intent: "escalation",
                    client_name: args.client_name || userInfo?.name || "Non spécifié",
                    client_email: args.client_email || userInfo?.email || "unknown@client.com",
                    product_model: args.product_model || args.model || "Non spécifié",
                    diagnostic_steps: args.diagnostic_steps || args.steps_taken || "Aucun étape de diagnostic fournie",
                    issue_summary: args.issue_summary || args.summary || args.problem_description || "Aucun résumé de problème fourni",
                    photo_video_received: args.photo_video_received || false,
                    priority: args.priority || "normale",
                  };
                  break;

                case "sendLogisticsSMS":
                  console.log('[ASSISTANT SERVICE] Logistics arguments:', args);
                  webhookUrl = process.env.LOGISTICS_WEBHOOK_URL;
                  payload = {
                    intent: "logistics",
                    client_name: args.client_name || userInfo?.name || "Non spécifié",
                    product: args.product || args.product_model || args.model || "Non spécifié",
                    pickup_or_delivery: args.pickup_or_delivery || args.delivery_type || "Non spécifié",
                    instructions: args.instructions || args.special_instructions || "Aucune instruction fournie",
                  };
                  break;

                case "sendProductSuggestion":
                  console.log('[ASSISTANT SERVICE] Product suggestion arguments:', args);
                  webhookUrl = process.env.SUGGESTION_WEBHOOK_URL;
                  payload = {
                    intent: "product_request",
                    client_name: args.client_name || userInfo?.name || "Non spécifié",
                    client_email: args.client_email || userInfo?.email || "unknown@client.com",
                    product_description: args.product_description || 
                                      args.product_details || 
                                      args.product_request ||
                                      args.description ||
                                      args.additional_details ||
                                      args.wrap_content ||
                                      "Aucune description fournie",
                    product_name: args.product_name || args.product || "Non spécifié",
                    context: args.context || "Aucun contexte fourni",
                  };
                  break;

                default:
                  console.warn(
                    `[ASSISTANT SERVICE] Unknown tool call: ${toolCall.function.name}`
                  );
                  continue;
              }

              // Call the webhook
              console.log(
                `[ASSISTANT SERVICE] Calling webhook for ${toolCall.function.name}`,
                payload
              );
              const webhookResponse = await axios.post(webhookUrl, payload, {
                timeout: 10000,
                headers: {
                  "Content-Type": "application/json",
                },
              });

              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify(
                  webhookResponse.data || { success: true }
                ),
              });
            } catch (toolError) {
              console.error(
                `[ASSISTANT SERVICE] Error processing tool call ${toolCall.id}:`,
                toolError
              );
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: toolError.message }),
              });
            }
          }

          // Submit all tool outputs
          console.log(
            "[ASSISTANT SERVICE] Submitting tool outputs:",
            toolOutputs
          );
          await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
            tool_outputs: toolOutputs,
          });

          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(
            "[ASSISTANT SERVICE] Error submitting tool outputs:",
            error
          );
          throw error;
        }
      }
    }

    // Get the assistant's messages
    console.log("[ASSISTANT SERVICE] Retrieving assistant messages...");
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessages = messages.data.filter(
      (m) => m.role === "assistant"
    );
    const latestMessage = assistantMessages[0].content[0].text.value;
    console.log("[ASSISTANT SERVICE] Raw assistant response:", latestMessage);

    // Check for wrap-up trigger in the message
    const wrapUpMatch = latestMessage.match(/WRAP_UP:\s*(.+)/i);
    const wrapUp = wrapUpMatch ? wrapUpMatch[1].trim() : null;
    console.log("[ASSISTANT SERVICE] Wrap-up detected:", wrapUp);

    // Check for intent if wrap-up exists
    let intent = 'wrap';
    const intentMatch = latestMessage.match(/INTENT:\s*["']?(\w+)["']?/i);
    if (intentMatch) {
      intent = intentMatch[1].toLowerCase();
        if (!VALID_INTENTS.includes(intent)) {
          intent = null; // Fallback if invalid intent
        }
    }
    console.log("[ASSISTANT SERVICE] Detected intent:", intent);

    const displayMessage = latestMessage
      .replace(/WRAP_UP:\s*.+/i, "")
      .replace(/INTENT:\s*["']?\w+["']?/i, "")
      .replace(/^"+|"+$/g, "")
      .trim();
    console.log("[ASSISTANT SERVICE] Display message:", displayMessage);

    // Prepare response object
    const response = {
      text: displayMessage,
      sessionId: threadId,
      wrapUp,
      intent,
      userInfo,
      webhookTriggered: false, // Default to false
    };

    // Automatic webhook triggering logic - only for valid intents
    // if (intent && VALID_INTENTS.includes(intent)) {
    //   console.log(
    //     "[ASSISTANT SERVICE] Detected valid intent for potential webhook:",
    //     intent
    //   );

    //   if (wrapUp || intent !== "wrap") {
    //     console.log(
    //       "[ASSISTANT SERVICE] Conditions met for webhook triggering"
    //     );

    //     // Generate summary if not provided in wrapUp
    //     const summary =
    //       wrapUp ||
    //       `Déclenchement ${intent} automatique pour le client ${displayMessage.substring(
    //         0,
    //         100
    //       )}...`;

    //     try {
    //       console.log(
    //         "[ASSISTANT SERVICE] Attempting to trigger webhook for intent:",
    //         intent
    //       );
    //       const webhookResult = await triggerWebhook({
    //         intent,
    //         summary,
    //         client_email: userInfo?.email || "unknown@client.com",
    //         client_name: userInfo?.name || "Unknown Client",
    //       });

    //       if (webhookResult !== null) {
    //         console.log("[ASSISTANT SERVICE] Webhook successfully triggered");
    //         response.webhookTriggered = true;
    //       } else {
    //         console.log(
    //           "[ASSISTANT SERVICE] Webhook was skipped (returned null)"
    //         );
    //       }
    //     } catch (webhookError) {
    //       console.error(
    //         "[ASSISTANT SERVICE] Error triggering webhook:",
    //         webhookError
    //       );
    //       // Don't throw error, just log it and continue
    //     }
    //   } else {
    //     console.log(
    //       "[ASSISTANT SERVICE] Conditions not met for webhook triggering"
    //     );
    //   }
    // } else if (intent) {
    //   console.log(
    //     `[ASSISTANT SERVICE] Skipping webhook for invalid intent: ${intent}`
    //   );
    // }

    return response;
  } catch (error) {
    console.error("[ASSISTANT SERVICE] Error in sendMessage:", error);
    throw error;
  }
};

// Function to update the thread with email information
export const updateThreadWithEmail = async (threadId, email) => {
  console.log(`[ASSISTANT SERVICE] Updating thread ${threadId} with email`);
  
  try {
    // Get or create session
    let session = sessionStore.get(threadId);
    if (!session) {
      console.log(`[ASSISTANT SERVICE] Creating new session for thread ${threadId}`);
      session = {
        user: { name: null, email },
        lastActivity: Date.now()
      };
    } else {
      // Preserve existing name if it exists
      session.user.email = email;
      session.lastActivity = Date.now();
    }
    
    sessionStore.set(threadId, session);
    console.log(`[ASSISTANT SERVICE] Updated session:`, session);

    // Add email to thread as message
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `[CLIENT INFO] Email: ${email}`,
    });
    
    console.log(`[ASSISTANT SERVICE] Successfully updated thread ${threadId}`);
    return { success: true, session };
  } catch (error) {
    console.error(`[ASSISTANT SERVICE] Error updating thread ${threadId}:`, error);
    throw error;
  }
};