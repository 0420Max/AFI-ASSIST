import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheck,
  FiAlertTriangle,
  FiShoppingBag,
  FiChevronRight,
  FiChevronUp,
  FiChevronDown,
} from 'react-icons/fi';

const WrapUpMessage = ({ content, onAction, intent }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showActions, setShowActions] = useState(false);

    useEffect(() => {
    // Delay showing actions by 3 seconds
    const timer = setTimeout(() => setShowActions(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAction = (actionIntent) => {
    if (actionIntent === intent) {
      onAction(actionIntent, content);
    }
  };

  const formattedContent = content.includes('\n-') ? (
    <div className="space-y-1">
      {content
        .split('\n-')
        .filter(Boolean)
        .map((section, index) => (
          <div key={index} className="flex items-start">
            <div className="w-1.5 h-1.5 rounded-full bg-afi-orange mt-2 mr-2 flex-shrink-0"></div>
            <p className="text-sm text-gray-700">{section.trim()}</p>
          </div>
        ))}
    </div>
  ) : (
    <p className="text-sm text-gray-700">{content}</p>
  );

  const getIntentCTA = () => {
    switch (intent) {
      case 'wrap':
        return '👇 Clique sur Envoyer le résumé pour confirmer.';
      case 'escalation':
        return '👇 Clique sur Demander un technicien pour confirmer.';
      case 'product_request':
        return '👇 Clique sur Soumettre la demande produit pour confirmer.';
      default:
        return 'Cliquez sur le bouton ci-dessus pour confirmer.';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-b from-[#FFF8E1] to-[#FFF4D4] border-t-2 border-afi-orange/50 shadow-[0_-4px_12px_rgba(255,165,0,0.08)] overflow-hidden font-jamjuree"
    >
      {/* Minimized State */}
      {isMinimized ? (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="p-3 cursor-pointer flex items-center justify-between"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center">
            <div className="bg-afi-grey p-2 rounded-lg mr-3 shadow-sm">
              <FiCheck className="text-white text-xl" />
            </div>
            <h3 className="font-bold text-afi-grey">Résumé de la conversation</h3>
          </div>
          <FiChevronUp className="text-afi-grey ml-2" />
        </motion.div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
            <div className="p-5">
              {/* Header with minimize button */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="bg-afi-grey p-2 rounded-lg mr-3 shadow-sm">
                    <FiCheck className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="font-bold text-afi-grey text-lg">Résumé de la conversation</h3>
                    <p className="text-xs text-gray-500 mt-1">Veuillez revoir et sélectionner les prochaines étapes</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(true);
                  }}
                  className="text-afi-grey hover:text-[#0a4a50] p-1"
                >
                  <FiChevronDown size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="mb-3 pl-11">{formattedContent}</div>

              {/* CTA Message */}
              {intent && (
                <div className="pl-11 mb-5 text-sm text-afi-orange font-medium flex items-center gap-1">
                  <FiChevronRight />
                  {getIntentCTA()}
                </div>
              )}

              {/* Action Buttons */}
            {showActions && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Wrap-up */}
                {intent === 'wrap' && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAction('wrap')}
                    className="flex items-center justify-between text-sm px-4 py-3 rounded-xl bg-afi-orange text-white hover:shadow-md animate-pulse transition-all"
                  >
                    <span className="flex items-center font-medium">
                      <FiCheck className="mr-2" />
                      Envoyer le résumé
                    </span>
                    <FiChevronRight className="ml-2" />
                  </motion.button>
                )}

                {/* Escalation */}
                {intent === 'escalation' && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAction('escalation')}
                    className="flex items-center justify-between text-sm px-4 py-3 rounded-xl bg-afi-orange text-white hover:shadow-md animate-pulse transition-all"
                  >
                    <span className="flex items-center font-medium">
                      <FiAlertTriangle className="mr-2" />
                      Demander un technicien
                    </span>
                    <FiChevronRight className="ml-2" />
                  </motion.button>
                )}

                {/* Product Request */}
                {intent === 'product_request' && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAction('product_request')}
                    className="flex items-center justify-between text-sm px-4 py-3 rounded-xl bg-afi-orange text-white hover:shadow-md animate-pulse transition-all"
                  >
                    <span className="flex items-center font-medium">
                      <FiShoppingBag className="mr-2" />
                      Soumettre la demande produit
                    </span>
                    <FiChevronRight className="ml-2" />
                  </motion.button>
                )}
              </div>
            )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default WrapUpMessage;
