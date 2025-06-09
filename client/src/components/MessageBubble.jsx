import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiCheckCircle } from 'react-icons/fi';
import { linkify } from '../utils/linkify';

const MessageBubble = ({ message, onConfirm }) => {
  const isUser = message.role === "user";
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Enhanced French confirmation prompt detection
  const hasConfirmationPrompt = 
    /(clique|confirmer|confirme|appuyer|bouton)/i.test(message.content) && 
    !isUser &&
    !message.content.includes("WRAP_UP:");

  // Reset confirmation state when a new message with prompt arrives
  useEffect(() => {
    if (hasConfirmationPrompt) {
      setIsConfirmed(false);
    }
  }, [hasConfirmationPrompt]);

  const displayContent = message.content
    .replace(/WRAP_UP:\s*.+/i, "")
    .replace(/INTENT:\s*["']?\w+["']?/i, "")
    .replace(/^"+|"+$/g, "")
    .trim();

  const handleConfirm = async () => {
    if (isConfirmed) return;
    
    setIsConfirming(true);
    try {
      await onConfirm();
      setIsConfirmed(true);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className={`flex mb-4 ${isUser ? "justify-end" : "justify-start"} font-jamjuree`}>
      <div
        className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-afi-dark text-white rounded-tr-none"
            : "bg-white text-afi-grey rounded-tl-none shadow-sm border border-gray-200"
        }`}
      >
        <p 
          className="text-sm font-jamjuree whitespace-pre-wrap font-bold"
          dangerouslySetInnerHTML={{ __html: linkify(displayContent) }}
        />
        
        {/* Confirmation Button */}
        {hasConfirmationPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3"
          >
            <button
              onClick={handleConfirm}
              disabled={isConfirming || isConfirmed}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-medium transition-all ${
                isConfirmed
                  ? 'bg-green-100 text-green-700 border border-green-200 cursor-default'
                  : isConfirming
                    ? 'bg-[#1e3a3a]/90 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#1e3a3a] to-[#0a4a50] hover:from-[#0a4a50] hover:to-[#083c42] shadow-md hover:shadow-lg text-white'
              }`}
              aria-label={isConfirmed ? "Confirmé" : "Confirmer"}
            >
              {isConfirmed ? (
                <>
                  <FiCheckCircle className="text-lg text-green-600" />
                  <span className="font-medium">Confirmé</span>
                </>
              ) : isConfirming ? (
                <>
                  <svg 
                    className="animate-spin h-4 w-4 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Confirmation en cours...</span>
                </>
              ) : (
                <>
                  <FiCheck className="text-lg" />
                  <span className="font-medium">Confirmer</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        <p
          className={`text-xs mt-2 text-right ${
            isUser ? "text-blue-100" : "text-gray-500"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;