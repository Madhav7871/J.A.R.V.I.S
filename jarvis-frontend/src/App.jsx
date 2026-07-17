import { useState, useRef, useEffect, useCallback } from "react";
import "./index.css";

function App() {
  const [messages, setMessages] = useState([
    {
      role: "jarvis",
      text: "Systems online. OS control module active. How can I assist you today, Madhav?",
    },
  ]);
  const [inputText, setInputText] = useState("");

  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const isVoiceModeRef = useRef(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Force load voices on mount
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-IN";
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.trim();

      if (isProcessing || isSpeaking) return;

      if (isVoiceModeRef.current && transcript.length > 2) {
        handleSendMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (
        event.error === "no-speech" &&
        isVoiceModeRef.current &&
        !isProcessing &&
        !isSpeaking
      ) {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };

    recognition.onend = () => {
      if (isVoiceModeRef.current && !isProcessing && !isSpeaking) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
  }, [isProcessing, isSpeaking, messages]);

  const toggleVoiceMode = async () => {
    if (isVoiceMode) {
      // Turn off voice
      isVoiceModeRef.current = false;
      setIsVoiceMode(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      // Turn on voice
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        isVoiceModeRef.current = true;
        setIsVoiceMode(true);
        if (recognitionRef.current) recognitionRef.current.start();
        const beep = new Audio(
          "https://www.soundjay.com/buttons/sounds/button-09.mp3",
        );
        beep.play().catch((e) => console.log(e));
      } catch (err) {
        alert("Microphone access is required for Voice Mode.");
      }
    }
  };

  // 🔥 THE BULLETPROOF LOCAL AUDIO PLAYER
  const speakResponse = (text) => {
    if (!text || !("speechSynthesis" in window)) return;

    // Pehle ka koi ruka hua text clear karo
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    let voices = window.speechSynthesis.getVoices();

    // Priority to Indian/Hindi Voices
    let bestVoice = voices.find(
      (v) =>
        v.name.includes("Google हिन्दी") ||
        v.name.includes("Hemant") ||
        v.name.includes("Ravi"),
    );

    // Fallback to any Indian English Male
    if (!bestVoice) {
      bestVoice = voices.find(
        (v) =>
          (v.lang.includes("hi-IN") || v.lang.includes("en-IN")) &&
          v.name.toLowerCase().includes("male"),
      );
    }

    // Ultimate Fallback
    if (!bestVoice) {
      bestVoice = voices.find(
        (v) => v.lang.includes("en-IN") || v.lang.includes("hi-IN"),
      );
    }

    if (bestVoice) utterance.voice = bestVoice;

    utterance.pitch = 1.0;
    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeaking(true);

    utterance.onend = () => {
      setIsSpeaking(false);
      if (isVoiceModeRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    };

    utterance.onerror = (e) => {
      console.error("Speech Engine Error:", e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() && !isProcessing) {
      handleSendMessage(inputText);
      setInputText("");
    }
  };

  const handleSendMessage = async (textPayload) => {
    if (!textPayload.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: textPayload }]);
    setIsProcessing(true);

    if (recognitionRef.current) recognitionRef.current.abort();

    try {
      const formattedHistory = messages.slice(1).map((msg) => ({
        role: msg.role === "jarvis" ? "model" : "user",
        parts: [{ text: msg.text }],
      }));

      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textPayload,
          history: formattedHistory,
          instruction: "Keep answers concise. Use Hinglish naturally.",
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Server connection failed.");

      setMessages((prev) => [...prev, { role: "jarvis", text: data.response }]);

      // Seedha text bhej rahe hain bolne ke liye
      speakResponse(data.response);
    } catch (error) {
      console.error("Frontend Error:", error.message);
      setMessages((prev) => [
        ...prev,
        { role: "jarvis", text: `Error: ${error.message}` },
      ]);
      setIsProcessing(false);

      if (isVoiceModeRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getVoiceBtnClass = () => {
    if (isSpeaking) return "voice-toggle-btn speaking";
    if (isVoiceMode) return "voice-toggle-btn awake";
    return "voice-toggle-btn";
  };

  return (
    <div className="jarvis-container">
      {/* Header */}
      <div className="custom-header">
        <h1>
          <div className="status-dot"></div>
          J.A.R.V.I.S. // CORE_TERMINAL
        </h1>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {isProcessing
            ? "Processing Data..."
            : isVoiceMode
              ? "Listening..."
              : "Awaiting Input"}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.role}`}>
            <div className="msg-label">
              {msg.role === "jarvis" ? "J.A.R.V.I.S." : "Madhav"}
            </div>
            {msg.text}
          </div>
        ))}
        {isProcessing && (
          <div className="chat-message jarvis" style={{ opacity: 0.6 }}>
            Typing...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area (Hybrid) */}
      <div className="input-container">
        <form className="text-input-form" onSubmit={handleTextSubmit}>
          <input
            type="text"
            className="chat-input"
            placeholder={
              isVoiceMode
                ? "Voice mode active (Speak or type)..."
                : "Type a command..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={isProcessing || !inputText.trim()}
          >
            Send
          </button>
        </form>

        <button
          className={getVoiceBtnClass()}
          onClick={toggleVoiceMode}
          title="Toggle Voice Protocol"
        >
          <span className="mic-icon">{isVoiceMode ? "🎙️" : "🎤"}</span>
        </button>
      </div>
    </div>
  );
}

export default App;
