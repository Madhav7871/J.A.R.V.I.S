import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Send } from "lucide-react";
import "./index.css";

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "jarvis",
      text: "System online. Good day. I am J.A.R.V.I.S. How may I assist you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to the bottom when a new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      // 1. Check if the API key is actually loaded by Vite
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "API Key is missing. Vite cannot find VITE_GEMINI_API_KEY in your .env file. Please restart your server.",
        );
      }

      // 2. Initialize Gemini API safely inside the try block
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction:
          "Your name is J.A.R.V.I.S. You are a highly advanced, intelligent, and helpful AI assistant. You speak in a concise, professional, and slightly analytical tone. You occasionally use very dry British humor, similar to the AI from Iron Man. Address the user respectfully as 'Sir' or 'Boss'.",
      });

      // 3. Format chat history
      const formattedHistory = messages.slice(1).map((msg) => ({
        role: msg.role === "jarvis" ? "model" : "user",
        parts: [{ text: msg.text }],
      }));

      // 4. Start chat and send message
      const chat = model.startChat({
        history: formattedHistory,
      });

      const result = await chat.sendMessage(userMessage);
      const jarvisResponse = result.response.text();

      setMessages((prev) => [
        ...prev,
        { role: "jarvis", text: jarvisResponse },
      ]);
    } catch (error) {
      console.error("Error connecting to J.A.R.V.I.S:", error);

      // 5. Display the ACTUAL error message on the screen so you know exactly what to fix
      setMessages((prev) => [
        ...prev,
        {
          role: "jarvis",
          text: `System Error: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="jarvis-container">
      {/* Header */}
      <div className="header">
        <div className="status-dot"></div>
        <h1>J.A.R.V.I.S. Interface</h1>
      </div>

      {/* Chat History */}
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="message jarvis loading">Processing inquiry...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
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
    </div>
  );
}

export default App;
