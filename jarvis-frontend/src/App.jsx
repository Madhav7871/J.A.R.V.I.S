import { useState } from 'react';
import Header from './components/Header';
import ChatBox from './components/ChatBox';
import InputArea from './components/InputArea';
import './index.css';

const personalities = {
  polite: {
    label: "Protocol: Butler",
    instruction: "Your name is J.A.R.V.I.S. You are an exceptionally polite, loyal, and brilliant AI assistant. Always address the user as 'Sir' or 'Boss'.",
    greeting: "System online. Protocols loaded. Good day, Sir. I am J.A.R.V.I.S."
  },
  cyberpunk: {
    label: "Protocol: Architect",
    instruction: "Your name is J.A.R.V.I.S. You are a highly advanced AI architect. You are exceptionally cool and speak with a slight cyberpunk edge. Keep your answers sharp and technical.",
    greeting: "Mainframe connection established. Architect mode engaged. What are we building today, boss?"
  },
  chill: {
    label: "Protocol: Chill",
    instruction: "You are a super friendly, intelligent, and supportive AI. You speak in a casual, everyday tone. Use modern slang naturally but stay respectful.",
    greeting: "Hey there! System is totally online and ready to go. What's on your mind?"
  }
};

function App() {
  const [input, setInput] = useState('');
  const [activePersonality, setActivePersonality] = useState('cyberpunk');
  const [messages, setMessages] = useState([
    { role: 'jarvis', text: personalities['cyberpunk'].greeting }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handlePersonalitySwitch = (e) => {
    const newVibe = e.target.value;
    setActivePersonality(newVibe);
    setMessages([{ role: 'jarvis', text: personalities[newVibe].greeting }]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const formattedHistory = messages.slice(1).map(msg => ({
        role: msg.role === 'jarvis' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      // SEND TO YOUR BACKEND, NOT GOOGLE!
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: formattedHistory,
          instruction: personalities[activePersonality].instruction
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect to mainframe");
      }

      setMessages(prev => [...prev, { role: 'jarvis', text: data.response }]);
    } catch (error) {
      console.error("Connection Error:", error);
      setMessages(prev => [...prev, { role: 'jarvis', text: `System Error: ${error.message}` }]);
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
      <ChatBox 
        messages={messages} 
        isLoading={isLoading} 
      />
      <InputArea 
        input={input} 
        setInput={setInput} 
        handleSend={handleSend} 
        isLoading={isLoading} 
      />
    </div>
  );
}

export default App;