import React, { useState } from "react";
import { Send, Mic } from "lucide-react";

const InputArea = ({ input, setInput, handleSend, isLoading }) => {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    // Check if the browser supports voice recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(
        "Voice recognition isn't supported in this browser. Try Google Chrome, bro!",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false; // Wait until you finish speaking

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      // Get the words you spoke
      const spokenText = event.results[0][0].transcript;
      setInput(spokenText); // Put it in the text box automatically!
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <form className="input-area" onSubmit={handleSend}>
      {/* The Glowing J.A.R.V.I.S. Mic Button */}
      <button
        type="button"
        className={`voice-button ${isListening ? "listening" : ""}`}
        onClick={startListening}
        title="Talk to J.A.R.V.I.S."
      >
        <div className="arc-ring"></div>
        <Mic size={20} color={isListening ? "#ff003c" : "#00f3ff"} />
      </button>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={isListening ? "Listening..." : "Command J.A.R.V.I.S..."}
        disabled={isLoading}
      />
      <button type="submit" disabled={!input.trim() || isLoading}>
        <Send size={20} />
      </button>
    </form>
  );
};

export default InputArea;
