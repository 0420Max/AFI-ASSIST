import { useState, useEffect, useRef } from 'react';
import { FiSend, FiPaperclip, FiMic } from 'react-icons/fi';
import { FaRegSmile } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';

const InputArea = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    const emoji = emojiObject.emoji;
    setMessage((prev) => prev + emoji);
  };

  // Close emoji picker if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  return (
    <form 
      onSubmit={handleSubmit}
      className={`p-3 bg-white border-t border-gray-100 transition-all duration-200 ${
        isFocused ? 'shadow-[0_-2px_10px_rgba(13,92,99,0.1)]' : ''
      } font-jamjuree`}
    >
      <div className="flex items-center gap-1">
        {/* Attachment Button */}
        {/* <button
          type="button"
          disabled={disabled}
          className={`p-2 rounded-full text-gray-500 hover:text-[#0D5C63] hover:bg-[#0D5C63]/10 transition-colors ${
            disabled ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          aria-label="Attach file"
        >
          <FiPaperclip className="text-lg" />
        </button> */}

        {/* Emoji Picker Button */}
        <div ref={emojiButtonRef} className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className={`p-2 rounded-full text-gray-500 hover:text-[#FFA500] hover:bg-[#FFA500]/10 transition-colors ${
              disabled ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            aria-label="Add emoji"
          >
            <FaRegSmile className="text-lg" />
          </button>

          {/* Emoji Picker Dropdown */}
          {showEmojiPicker && (
            <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-lg overflow-hidden">
              <EmojiPicker
                height={350}
                width="100%"
                onEmojiClick={handleEmojiClick}
                searchDisabled
                skinTonesDisabled
                autoFocusSearch={false}
                theme="light"
                style={{ fontFamily: 'sans-serif' }}
              />
            </div>
          )}
        </div>

        {/* Voice Message Button (Optional) */}
        {/* <button
          type="button"
          disabled={disabled}
          className={`p-2 rounded-full text-gray-500 hover:text-[#0D5C63] hover:bg-[#0D5C63]/10 transition-colors md:hidden ${
            disabled ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          aria-label="Voice message"
        >
          <FiMic className="text-lg" />
        </button> */}

        {/* Input Field */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre message..."
            disabled={disabled}
            className={`w-full border border-gray-200 rounded-full py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/50 focus:border-[#0D5C63]/30 transition-all duration-200 font-jamjuree text-gray-700 placeholder-gray-400 ${
              disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            }`}
          />
        </div>

        {/* Send Button - Shows only when there's input */}
        {message.trim() ? (
          <button
            type="submit"
            disabled={disabled}
            className={`ml-2 p-3 rounded-full bg-afi-dark text-white hover:bg-afi-dark-secondary transition-colors shadow-md active:scale-95 transform transition-transform ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-label="Send message"
          >
            <FiSend className="text-lg" />
          </button>
        ) : (
          <div className="ml-2 w-12" />
        )}
      </div>

      {/* Character Counter for longer messages */}
      {message.length > 80 && (
        <div className="text-right mt-1 px-2">
          <span className={`text-xs ${
            message.length > 190 ? 'text-red-500' : 'text-gray-400'
          }`}>
            {message.length}/200
          </span>
        </div>
      )}
    </form>
  );
};

export default InputArea;