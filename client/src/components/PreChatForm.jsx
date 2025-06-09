import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiArrowRight, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const PreChatForm = ({ onSubmit, loading }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez entrer votre prénom');
      return;
    }
    onSubmit({ name, email: null }); // Set email to null initially
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white rounded-lg shadow-md max-w-md w-full mx-auto font-jamjuree max-h-[70vh] overflow-y-auto"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-afi-dark mb-2">
          Bienvenue au support AFI
        </h2>
        <p className="text-afi-grey text-base">
          Veuillez fournir votre prénom pour commencer la conversation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-base font-medium text-afi-grey mb-1">
            Votre prénom
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiUser className="text-gray-400" />
            </div>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              className={`pl-10 w-full rounded-lg border text-base ${
                error ? 'border-red-500' : 'border-gray-300'
              } focus:ring-afi-orange focus:border-afi-orange`}
              placeholder="Jean"
            />
          </div>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        {/* Disclaimer Section */}
        <div className="pt-2 text-sm text-afi-grey">
          <div className="flex items-start gap-2 mb-1">
            <span>🤓</span>
            <p>En continuant, tu consens à recevoir du contenu utile, pas du spam.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowFullDisclaimer(!showFullDisclaimer)}
            className="text-afi-orange hover:underline flex items-center gap-1 text-sm mb-2"
          >
            {showFullDisclaimer ? (
              <>
                <FiChevronUp size={14} />
                <span>Masquer les détails</span>
              </>
            ) : (
              <>
                <FiChevronDown size={14} />
                <span>Avis de non-responsabilité – Clique ici</span>
              </>
            )}
          </button>

          {showFullDisclaimer && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-left text-sm leading-relaxed space-y-2">
              <p className="font-semibold">Avis de non-responsabilité – Chatbot AFI ASSIST</p>
              <p>
                Le service de clavardage automatisé (AFI ASSIST) est offert par Aqua Fibre Innovation
                pour fournir un soutien général, des réponses rapides aux questions fréquentes et
                des conseils techniques de base.
              </p>
              <p>
                <strong>Aucune garantie de précision :</strong> Les réponses sont générées automatiquement.
                Aucune garantie d'exactitude ou d'exhaustivité n'est offerte.
              </p>
              <p>
                <strong>Pas de relation contractuelle :</strong> L'utilisation du chatbot ne constitue
                pas une relation contractuelle ou professionnelle.
              </p>
              <p>
                <strong>Limitation de responsabilité :</strong> Aqua Fibre Innovation ne peut être tenu
                responsable de tout dommage découlant de l'utilisation du chatbot.
              </p>
              <p>
                <strong>Utilisation à tes risques :</strong> En utilisant ce service, tu reconnais avoir
                lu et accepté cette clause.
              </p>
            </div>
          )}
        </div>

        <div className="pt-2">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white text-base bg-afi-orange hover:bg-afi-orange/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-afi-orange transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Démarrage de la conversation...' : 'Commencer le chat'}
            {!loading && <FiArrowRight className="ml-2" />}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default PreChatForm;