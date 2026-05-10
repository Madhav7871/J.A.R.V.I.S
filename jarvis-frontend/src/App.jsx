import { useState, useRef, useEffect } from "react";
import Header from "./components/Header";
import ChatBox from "./components/ChatBox";
import "./index.css";

const personalities = {
  buddy: {
    label: "Protocol: Real Bro",
    instruction:
      "You are the user's best friend, mentor, and guide. Talk to them exactly like a real, close friend would—use words like 'bro', 'man', or 'dude' naturally. Give highly practical, honest, and street-smart advice. Never sound like a robot; be empathetic, supportive, and real. Keep answers concise for voice output.",
    greeting: "System booted. Just say my name, 'Jarvis', to wake me up.",
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
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const isAwakeRef = useRef(false);
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
    recognition.continuous = true;
    recognition.lang = "en-IN"; // English-India
    recognition.interimResults = false;

    recognition.onstart = () => console.log("Listening in background...");

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript
        .toLowerCase()
        .trim();

      // 🔥 DEBUGGING TRICK: F12 (Console) mein dekh browser kya sun raha hai!
      console.log("Browser heard:", transcript);

      if (isProcessing || isSpeaking) return;

      if (!isAwakeRef.current) {
        // 🔥 SUPER EASY WAKE WORD: Bas "jarvis" match hona chahiye
        if (
          transcript.includes("jarvis") ||
          transcript.includes("service") ||
          transcript.includes("charvis")
        ) {
          const beep = new Audio(
            "https://www.soundjay.com/buttons/sounds/button-09.mp3",
          );
          beep.play().catch((e) => console.log(e));

          // Extract command if spoken in the same breath
          const parts = transcript.split(/jarvis|service|charvis/);
          const command = parts[1]?.trim();

          if (command && command.length > 2) {
            handleSendVoice(command);
          } else {
            isAwakeRef.current = true;
            setIsAwake(true);
          }
        }
      } else {
        // System is awake, taking the command
        isAwakeRef.current = false;
        setIsAwake(false);
        handleSendVoice(transcript);
      }
    };

    // Auto-restart logic if browser puts mic to sleep
    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
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

  // J.A.R.V.I.S Voice Reply (Slow, Deep & Animated)
  const speakResponse = (text) => {
    if ("speechSynthesis" in window) {
      if (recognitionRef.current) recognitionRef.current.abort();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const roboticVoice = voices.find(
        (voice) =>
          voice.name.includes("Google UK English Male") ||
          voice.name.includes("Microsoft Mark") ||
          voice.name.includes("English (United Kingdom)"),
      );

      if (roboticVoice) utterance.voice = roboticVoice;

      utterance.pitch = 0.2;
      utterance.rate = 0.75;

      utterance.onstart = () => setIsSpeaking(true);

      utterance.onend = () => {
        setIsSpeaking(false);
        if (systemActiveRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
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
      if (systemActiveRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const bootSystem = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      systemActiveRef.current = true;
      setSystemActive(true);
      if (recognitionRef.current) recognitionRef.current.start();
    } catch (err) {
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

          <div
            style={{
              padding: "30px",
              borderTop: "1px solid var(--glass-border)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                width: isSpeaking ? "80px" : "60px",
                height: isSpeaking ? "80px" : "60px",
                borderRadius: "50%",
                background: isSpeaking
                  ? "var(--neon-blue)"
                  : isAwake
                    ? "#ff003c"
                    : "rgba(0, 243, 255, 0.1)",
                boxShadow: isSpeaking
                  ? "0 0 50px var(--neon-blue), inset 0 0 20px #fff"
                  : isAwake
                    ? "0 0 30px #ff003c"
                    : "0 0 20px var(--neon-blue)",
                transition: "all 0.1s ease-in-out",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: isSpeaking ? "35px" : "15px",
                  height: isSpeaking ? "35px" : "15px",
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 0 15px #fff",
                  transition: "all 0.1s ease-in-out",
                }}
              />
            </div>

            <p
              style={{
                marginTop: "20px",
                color: isSpeaking
                  ? "#fff"
                  : isAwake
                    ? "#ff003c"
                    : "var(--neon-blue)",
                fontWeight: "bold",
                letterSpacing: "2px",
                textShadow: isSpeaking ? "0 0 10px var(--neon-blue)" : "none",
              }}
            >
              {isSpeaking
                ? "J.A.R.V.I.S. IS SPEAKING..."
                : isProcessing
                  ? "PROCESSING..."
                  : isAwake
                    ? "LISTENING TO COMMAND..."
                    : "SAY 'JARVIS'..."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
