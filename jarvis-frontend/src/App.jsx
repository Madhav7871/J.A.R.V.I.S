import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import ChatBox from "./components/ChatBox";
import "./index.css";

const personalities = {
  buddy: {
    label: "Protocol: Real Bro",
    instruction:
      "You are the user's best friend, mentor, and guide. Talk to them exactly like a real, close friend would—use words like 'bro', 'man', or 'dude' naturally. Give highly practical, honest, and street-smart advice. Never sound like a robot; be empathetic, supportive, and real. Keep answers concise for voice output.",
    greeting: "System booted. Just say 'Hey Jarvis' to wake me up, bro.",
  },
};

function App() {
  const [activePersonality] = useState("buddy");
  const [messages, setMessages] = useState([
    { role: "jarvis", text: personalities["buddy"].greeting },
  ]);
  const [systemActive, setSystemActive] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const recognitionRef = useRef(null);
  const isAwakeRef = useRef(false); // Ref for accurate state inside event listeners
  const systemActiveRef = useRef(false);

  // Initialize Speech Recognition
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
    recognition.continuous = true; // Keep listening continuously
    recognition.lang = "en-IN";
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log("Listening in background...");
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript
        .toLowerCase()
        .trim();
      console.log("Heard:", transcript);

      // If Jarvis is currently speaking or processing, ignore background noise
      if (isProcessing) return;

      if (!isAwakeRef.current) {
        // Checking for the wake word
        if (transcript.includes("jarvis")) {
          const beep = new Audio(
            "https://www.soundjay.com/buttons/sounds/button-09.mp3",
          );
          beep.play().catch((e) => console.log(e));

          // Split the text to see if user said command along with wake word (e.g. "Hey Jarvis how are you")
          const parts = transcript.split("jarvis");
          const command = parts[1]?.trim();

          if (command && command.length > 2) {
            // Direct command given
            handleSendVoice(command);
          } else {
            // Only wake word given, wait for next sentence
            isAwakeRef.current = true;
            setIsAwake(true);
          }
        }
      } else {
        // System is already awake, treat this as the command
        isAwakeRef.current = false;
        setIsAwake(false);
        handleSendVoice(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
    };

    // Auto-restart if it stops (Chrome sometimes kills continuous listeners after silence)
    recognition.onend = () => {
      if (systemActiveRef.current && !isProcessing) {
        try {
          recognition.start();
        } catch (e) {
          // ignore already started errors
        }
      }
    };

    recognitionRef.current = recognition;
  }, [isProcessing, messages]);

  // J.A.R.V.I.S Voice Reply
  const speakResponse = (text) => {
    if ("speechSynthesis" in window) {
      // Pause listening so it doesn't hear its own voice
      if (recognitionRef.current) recognitionRef.current.abort();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 0.9;

      utterance.onend = () => {
        // Resume listening after speaking
        if (systemActiveRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // The Brain: Sending data to Backend
  const handleSendVoice = async (voiceText) => {
    if (!voiceText.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: voiceText }]);
    setIsProcessing(true);

    // Pause listening while processing
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

      // Resume listening on error
      if (systemActiveRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Initial System Boot
  const bootSystem = async () => {
    try {
      // Just requesting mic permission to be safe
      await navigator.mediaDevices.getUserMedia({ audio: true });

      systemActiveRef.current = true;
      setSystemActive(true);

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      console.log("System Online. Waiting for 'Hey Jarvis'...");
    } catch (err) {
      console.error("Mic access denied!", err);
      alert("Bro, J.A.R.V.I.S. needs mic access to hear you!");
    }
  };

  return (
    <div className="jarvis-container" style={{ position: "relative" }}>
      <Header
        activePersonality={activePersonality}
        personalities={personalities}
        onSwitch={() => {}}
      />

      {!systemActive ? (
        <div
          style={{
            display: "flex",
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h2 style={{ color: "var(--neon-blue)" }}>SYSTEM OFFLINE</h2>
          <button
            onClick={bootSystem}
            style={{
              padding: "15px 30px",
              fontSize: "1.2rem",
              background: "var(--neon-blue)",
              color: "#000",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            BOOT J.A.R.V.I.S.
          </button>
        </div>
      ) : (
        <>
          <ChatBox messages={messages} isLoading={isProcessing} />

          {/* Status Indicator Area */}
          <div
            style={{
              padding: "20px",
              borderTop: "1px solid var(--glass-border)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: isAwake ? "#ff003c" : "var(--neon-blue)",
                boxShadow: isAwake
                  ? "0 0 30px #ff003c"
                  : "0 0 20px var(--neon-blue)",
                animation: isAwake
                  ? "pulse-glow 1s infinite"
                  : "pulse 2s infinite",
                transition: "all 0.3s ease",
              }}
            />
            <p
              style={{
                marginTop: "15px",
                color: isAwake ? "#ff003c" : "var(--neon-blue)",
                fontWeight: "bold",
                letterSpacing: "2px",
              }}
            >
              {isProcessing
                ? "PROCESSING..."
                : isAwake
                  ? "LISTENING TO COMMAND..."
                  : "SAY 'HEY JARVIS'..."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
