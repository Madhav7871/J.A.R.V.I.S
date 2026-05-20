import { useState, useRef, useEffect, useCallback } from "react";
import "./index.css";

const personalities = {
  buddy: {
    label: "Protocol: Real Bro",
    instruction:
      "You are the user's best friend, mentor, and guide. The user's name is Madhav. Talk exactly like a real, close friend would. Give highly practical, honest, and street-smart advice. You can mix Hindi and English (Hinglish) naturally. Never sound like a robot; be empathetic, supportive, and real. Keep answers concise for voice output.",
    greeting:
      "System booted. Arc Reactor Online. Say 'Jarvis' once to initialize connection.",
  },
};

function App() {
  const [activePersonality, setActivePersonality] = useState("buddy");
  const [messages, setMessages] = useState([
    { role: "jarvis", text: personalities["buddy"].greeting },
  ]);
  const [systemActive, setSystemActive] = useState(false);
  const [isBooting, setIsBooting] = useState(false);

  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const isConversationModeRef = useRef(false);
  const systemActiveRef = useRef(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pauseConversation = useCallback(() => {
    console.log("Protocol Paused!");
    isConversationModeRef.current = false;
    setIsConversationMode(false);
    setIsProcessing(false);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && systemActiveRef.current) {
        e.preventDefault();
        pauseConversation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pauseConversation]);

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
      const transcript = event.results[current][0].transcript
        .toLowerCase()
        .trim();

      if (isProcessing || isSpeaking) return;

      if (!isConversationModeRef.current) {
        if (
          transcript.includes("jarvis") ||
          transcript.includes("service") ||
          transcript.includes("charvis")
        ) {
          const beep = new Audio(
            "https://www.soundjay.com/buttons/sounds/button-09.mp3",
          );
          beep.play().catch((e) => console.log(e));

          isConversationModeRef.current = true;
          setIsConversationMode(true);

          const parts = transcript.split(/jarvis|service|charvis/);
          const command = parts[1]?.trim();

          if (command && command.length > 2) {
            handleSendVoice(command);
          }
        }
      } else {
        if (transcript.length > 2) {
          handleSendVoice(transcript);
        }
      }
    };

    recognition.onerror = (event) => {
      if (
        event.error === "no-speech" &&
        systemActiveRef.current &&
        !isProcessing &&
        !isSpeaking
      ) {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };

    recognition.onend = () => {
      if (systemActiveRef.current && !isProcessing && !isSpeaking) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
  }, [isProcessing, isSpeaking, messages]);

  const speakResponse = (text) => {
    if ("speechSynthesis" in window) {
      if (recognitionRef.current) recognitionRef.current.abort();

      const utterance = new SpeechSynthesisUtterance(text);
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) voices = window.speechSynthesis.getVoices();

      let bestVoice = voices.find(
        (v) =>
          v.name.includes("Hemant") ||
          v.name.includes("Ravi") ||
          v.name.includes("Google UK English Male") ||
          v.name.toLowerCase().includes("male") ||
          v.name.includes("David"),
      );

      if (!bestVoice)
        bestVoice = voices.find(
          (v) => v.lang.includes("en-IN") || v.lang.includes("hi-IN"),
        );

      if (bestVoice) utterance.voice = bestVoice;
      utterance.pitch = 0.9;
      utterance.rate = 0.95;

      utterance.onstart = () => setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);
        if (systemActiveRef.current && isConversationModeRef.current) {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {}
          }
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendVoice = async (voiceText) => {
    if (!voiceText.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: voiceText }]);
    setIsProcessing(true);

    if (recognitionRef.current) recognitionRef.current.abort();

    try {
      // Clean map for API
      const formattedHistory = messages.slice(1).map((msg) => ({
        role: msg.role === "jarvis" ? "model" : "user",
        parts: [{ text: msg.text }],
      }));

      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: voiceText,
          history: formattedHistory,
          instruction: personalities[activePersonality].instruction,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Server connection failed.");
      }

      setMessages((prev) => [...prev, { role: "jarvis", text: data.response }]);
      speakResponse(data.response);
    } catch (error) {
      console.error("Frontend Error:", error.message);
      // Now it shows EXACTLY why it failed on the screen!
      setMessages((prev) => [
        ...prev,
        { role: "jarvis", text: `Error: ${error.message}` },
      ]);
      setIsProcessing(false);

      if (systemActiveRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    }
  };

  const bootSystem = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsBooting(true);

      setTimeout(() => {
        setIsBooting(false);
        systemActiveRef.current = true;
        setSystemActive(true);
        if (recognitionRef.current) recognitionRef.current.start();
        window.speechSynthesis.getVoices();
      }, 2000);
    } catch (err) {
      alert("Bro, J.A.R.V.I.S. needs mic access to hear you!");
    }
  };

  const getHudModeClass = () => {
    if (isSpeaking) return "mode-speaking";
    if (isConversationMode || isProcessing) return "mode-awake";
    return "mode-sleep";
  };

  const getStatusText = () => {
    if (isSpeaking) return "TRANSMITTING DATA...";
    if (isProcessing) return "PROCESSING...";
    if (isConversationMode) return "SYSTEM ACTIVE...";
    return "AWAITING 'JARVIS'...";
  };

  const getStatusColorClass = () => {
    if (isSpeaking) return "text-white";
    if (isConversationMode || isProcessing) return "text-red";
    return "text-blue";
  };

  return (
    <div className="jarvis-container">
      <div className="custom-header">
        <h1>● J.A.R.V.I.S. INTERFACE</h1>
        <select
          value={activePersonality}
          onChange={(e) => setActivePersonality(e.target.value)}
        >
          {Object.keys(personalities).map((key) => (
            <option key={key} value={key}>
              {personalities[key].label}
            </option>
          ))}
        </select>
      </div>

      {!systemActive ? (
        <div className="offline-screen">
          {isBooting ? (
            <h2
              style={{
                animation: "breathe 1s infinite",
                color: "var(--neon-red)",
              }}
            >
              INITIALIZING CORE PROTOCOLS...
            </h2>
          ) : (
            <>
              <h2>SYSTEM OFFLINE</h2>
              <button className="boot-btn" onClick={bootSystem}>
                BOOT J.A.R.V.I.S.
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="chat-area">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                {msg.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="hud-container">
            <div className={`arc-reactor ${getHudModeClass()}`}>
              <div className="arc-ring-1"></div>
              <div className="arc-ring-2"></div>
              <div className="orb-core"></div>
            </div>

            <p className={`status-text ${getStatusColorClass()}`}>
              {getStatusText()}
            </p>

            {isConversationMode && (
              <button className="pause-btn" onClick={pauseConversation}>
                ⏸ PAUSE PROTOCOL (SPACE)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
