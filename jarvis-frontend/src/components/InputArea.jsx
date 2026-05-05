import React from 'react';
import { Send } from 'lucide-react';

const InputArea = ({ input, setInput, handleSend, isLoading }) => {
  return (
    <form className="input-area" onSubmit={handleSend}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Command J.A.R.V.I.S..."
        disabled={isLoading}
      />
      <button type="submit" disabled={!input.trim() || isLoading}>
        <Send size={20} />
      </button>
    </form>
  );
};

export default InputArea;