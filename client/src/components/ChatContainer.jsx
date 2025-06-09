import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import InputArea from "./InputArea";
import WrapUpMessage from "./WrapUpMessage";
import PreChatForm from "./PreChatForm";
import useChat from "../hooks/useChat";
import { FiMessageSquare, FiX, FiMinimize2 } from "react-icons/fi";

const ChatContainer = () => {
  const {
    messages,
    loading,
    wrapUpContent,
    handleSendMessage,
    handleWebhookTrigger,
    handleConfirm,
    startChat,
    userInfo,
    intent,
  } = useChat();
  
  const messagesEndRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showPreChat, setShowPreChat] = useState(true);
  const [isSupportPage, setIsSupportPage] = useState(false);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener("resize", handleResize);

  // Check if embedded on support page
  const checkEmbeddedContext = () => {
    // Method 1: Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('support_page')) {
      setIsSupportPage(true);
      setIsMinimized(false);
      setShowPreChat(true);
      return;
    }

    // Method 2: Try to detect parent page (works for same-origin iframes)
    try {
      if (window.parent !== window) {
        const parentUrl = document.referrer || window.parent.location.href;
        if (parentUrl.includes('/afi-assist-soutien')) {
          setIsSupportPage(true);
          setIsMinimized(false);
          setShowPreChat(true);
          return;
        }
      }
    } catch (e) {
      // Cross-origin error, will fall through to postMessage
    }

    // Method 3: Listen for postMessage from parent
    const handleMessage = (event) => {
      if (event.data?.type === 'AFI_OPEN_CHAT') {
        setIsSupportPage(true);
        setIsMinimized(false);
        setShowPreChat(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  };

  const cleanup = checkEmbeddedContext();

  return () => {
    window.removeEventListener("resize", handleResize);
    if (typeof cleanup === 'function') cleanup();
  };
}, []);

// Updated scrollToBottom function in ChatContainer.js
const scrollToBottom = (force = false) => {
  const messagesContainer = messagesEndRef.current?.parentElement;
  if (!messagesContainer) return;

  // Check if user is currently scrolling up (we shouldn't interrupt)
  const isUserScrollingUp = messagesContainer.scrollTop + messagesContainer.clientHeight < messagesContainer.scrollHeight - 50;

  // Only scroll if we're forcing it or user isn't actively scrolling up
  if (force || !isUserScrollingUp) {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start"
    });
  }
};

// Updated useEffect for messages
useEffect(() => {
  if (!isMinimized) {
    // Use a small timeout to ensure DOM is updated
    const timer = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timer);
  }
}, [messages, isMinimized, isSupportPage]);

// Add this to handle iframe resizing
useEffect(() => {
  const handleResize = () => {
    if (!isMinimized) scrollToBottom(true);
  };

  const resizeObserver = new ResizeObserver(handleResize);
  if (messagesEndRef.current) {
    resizeObserver.observe(messagesEndRef.current);
  }

  return () => resizeObserver.disconnect();
}, [isMinimized]);

  const handleStartChat = async (userData) => {
    await startChat(userData);
    setShowPreChat(false);
  };

  const MinimizedButton = () => (
    <button
      onClick={() => {
        setIsMinimized(false);
        // Only show pre-chat form if we don't have user info
        if (!userInfo) {
          setShowPreChat(true);
        }
      }}
      className="fixed bottom-6 right-6 bg-afi-dark text-white p-4 rounded-full shadow-xl hover:bg-afi-dark-secondary transition-all flex items-center group"
    >
      <FiMessageSquare className="mr-2 text-lg" />
      <span className="font-medium">Besoin d'aide ?</span>
      <span className="ml-2 px-2 py-1 bg-afi-orange text-xs font-bold rounded-full animate-pulse">
        EN DIRECT
      </span>
    </button>
  );

  if (isMinimized && !isSupportPage) {
    return <MinimizedButton />;
  }

  return (
    <div className={`fixed ${
      isMobile ? "inset-0" : "bottom-6 right-6 h-[600px]"
    } w-full max-w-md flex flex-col bg-white shadow-2xl border border-gray-100 overflow-hidden z-[9999] font-jamjuree`}
    >
      {/* Chat header */}
      <div className="bg-afi-dark text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-white/20 p-2 rounded-lg mr-3">
            <FiMessageSquare className="text-xl" />
          </div>
          <div className="font-jamjuree">
            <h2 className="text-lg font-bold">AFI ASSIST</h2>
            <p className="text-xs opacity-80">
              {userInfo ? `Assistance pour ${userInfo.name}` : "Nous sommes là pour vous aider"}
            </p>
          </div>
        </div>
        {/* Only show minimize button if not on support page */}
        {!isSupportPage && (
          <button
            onClick={() => setIsMinimized(true)}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            {isMobile ? <FiX size={24} /> : <FiMinimize2 size={20} />}
          </button>
        )}
      </div>

      {/* Only show pre-chat form if we don't have user info */}
      {!userInfo && showPreChat ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
          <PreChatForm onSubmit={handleStartChat} loading={loading} />
        </div>
      ) : (
        <>
          <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-white to-[#f5f9fa] pt-2">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <MessageBubble 
                  key={index} 
                  message={message} 
                  onConfirm={handleConfirm}
                />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 max-w-xs shadow-sm border border-gray-200">
                    <div className="flex space-x-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full bg-[#3366cc] animate-bounce"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Wrap-up message */}
          {wrapUpContent && (
            <WrapUpMessage
              content={wrapUpContent}
              onAction={handleWebhookTrigger}
              intent={intent}
            />
          )}

          {/* Input area */}
          <InputArea onSend={handleSendMessage} disabled={loading} />
        </>
      )}
    </div>
  );
};

export default ChatContainer;