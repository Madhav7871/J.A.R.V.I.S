import { useState, useRef, useEffect } from "react";
import "./index.css";

const personalities = {
  buddy: {
    label: "Protocol: Real Bro",
    instruction:
      "You are the user's best friend, mentor, and guide. The user's name is Madhav. Talk exactly like a real, close friend would. Give highly practical, honest, and street-smart advice. You can mix Hindi and English (Hinglish) naturally. Never sound like a robot; be empathetic, supportive, and real. Keep answers concise for voice output.",
    greeting:
      "System booted. Say 'Jarvis' once to start the continuous conversation.",
  },
};

function App() {
  const [activePersonality, setActivePersonality] = useState("buddy");
  const [messages, setMessages] = useState([
    { role: "jarvis", text: personalities["buddy"].greeting },
  ]);
  const [systemActive, setSystemActive] = useState(false);

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

  // KILL SWITCH / PAUSE LOGIC
  const pauseConversation = () => {
    console.log("Session Paused / Interrupted!");
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
  };

  // SPACEBAR SHORTCUT TO PAUSE
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && systemActiveRef.current) {
        e.preventDefault();
        pauseConversation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // SPEECH RECOGNITION SETUP
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(
        "Bro, your browser doesn't support Speech Recognition. Use Chrome!",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-IN";
    recognition.interimResults = false;

    recognition.onstart = () => console.log("Mic Active...");

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript
        .toLowerCase()
        .trim();

      console.log("Browser heard:", transcript);

      if (isProcessing || isSpeaking) return;

      if (!isConversationModeRef.current) {
        // WAKE WORD DETECTION
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
        // CONTINUOUS LISTENING
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
      const voices = window.speechSynthesis.getVoices();

      const bestVoice =
        voices.find(
          (voice) =>
            voice.name.includes("Google हिन्दी") ||
            voice.lang === "hi-IN" ||
            voice.name.includes("India") ||
            voice.name.includes("Hemant") ||
            voice.name.includes("Ravi"),
        ) || voices.find((voice) => voice.lang.includes("en-IN"));

      if (bestVoice) utterance.voice = bestVoice;
      utterance.pitch = 1.0;
      utterance.rate = 0.95;

      utterance.onstart = () => setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);
        // Resume listening automatically after speaking
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
      if (!response.ok) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "jarvis", text: data.response }]);
      speakResponse(data.response);
    } catch (error) {
      console.error("Backend Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "jarvis", text: "System Error. Connection failed." },
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
      systemActiveRef.current = true;
      setSystemActive(true);
      if (recognitionRef.current) recognitionRef.current.start();
      window.speechSynthesis.getVoices();
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
    if (isSpeaking) return "J.A.R.V.I.S. IS SPEAKING...";
    if (isProcessing) return "PROCESSING...";
    if (isConversationMode) return "CONVERSATION ACTIVE...";
    return "SAY 'JARVIS' TO START...";
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
          <h2>SYSTEM OFFLINE</h2>
          <button className="boot-btn" onClick={bootSystem}>
            BOOT J.A.R.V.I.S.
          </button>
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
            <div className={`visualizer-orb ${getHudModeClass()}`}>
              <div className="orb-core" />
            </div>

            <p className={`status-text ${getStatusColorClass()}`}>
              {getStatusText()}
            </p>

            {isConversationMode && (
              <button className="pause-btn" onClick={pauseConversation}>
                ⏸ PAUSE JARVIS (OR PRESS SPACE)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
