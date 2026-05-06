import { useState } from "react";
import Header from "./components/Header";
import ChatBox from "./components/ChatBox";
import InputArea from "./components/InputArea";
import "./index.css";

const personalities = {
  polite: {
    label: "Protocol: Butler",
    instruction:
      "Your name is J.A.R.V.I.S. You are an exceptionally polite, loyal, and brilliant AI assistant. Always address the user as 'Sir' or 'Boss'.",
    greeting:
      "System online. Protocols loaded. Good day, Sir. I am J.A.R.V.I.S.",
  },
  cyberpunk: {
    label: "Protocol: Architect",
    instruction:
      "Your name is J.A.R.V.I.S. You are a highly advanced AI architect. You are exceptionally cool and speak with a slight cyberpunk edge. Keep your answers sharp and technical.",
    greeting:
      "Mainframe connection established. Architect mode engaged. What are we building today, boss?",
  },
  buddy: {
    label: "Protocol: Real Bro",
    instruction:
      "You are the user's best friend, mentor, and guide. Talk to them exactly like a real, close friend would—use words like 'bro', 'man', or 'dude' naturally. Give highly practical, honest, and street-smart advice about life, stress, and goals. You know the user is a B.Tech CSE student from Delhi who grinds hard on full-stack projects, AI solutions, and hackathons, so you completely understand the pressure of the tech hustle. Never sound like a robot; be empathetic, supportive, and real.",
    greeting:
      "Yoo bro! I'm here. What's going on today? We grinding on code, or do you just need to vent?",
  },
};

function App() {
  const [input, setInput] = useState("");
  // Setting 'buddy' as default because it's awesome
  const [activePersonality, setActivePersonality] = useState("buddy");
  const [messages, setMessages] = useState([
    { role: "jarvis", text: personalities["buddy"].greeting },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handlePersonalitySwitch = (e) => {
    const newVibe = e.target.value;
    setActivePersonality(newVibe);
    setMessages([{ role: "jarvis", text: personalities[newVibe].greeting }]);
  };

  // Function to make J.A.R.V.I.S. talk out loud
  const speakResponse = (text) => {
    window.speechSynthesis.cancel(); // Stop any current talking

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.9;

    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const formattedHistory = messages.slice(1).map((msg) => ({
        role: msg.role === "jarvis" ? "model" : "user",
        parts: [{ text: msg.text }],
      }));

      // Sending to your Node.js backend!
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: formattedHistory,
          instruction: personalities[activePersonality].instruction,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect to mainframe");
      }

      setMessages((prev) => [...prev, { role: "jarvis", text: data.response }]);

      // J.A.R.V.I.S. will speak the response here!
      speakResponse(data.response);
    } catch (error) {
      console.error("Connection Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "jarvis", text: `System Error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="jarvis-container">
      <Header
        activePersonality={activePersonality}
        onSwitch={handlePersonalitySwitch}
        personalities={personalities}
      />
      <ChatBox messages={messages} isLoading={isLoading} />
      <InputArea
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App; // <-- THIS LINE PREVENTS THE CRASH
