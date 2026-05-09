import React, { useEffect, useRef } from "react";

// Notice the curly braces around { messages, isLoading }!
const ChatBox = ({ messages, isLoading }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Safety check: if messages somehow isn't an array, don't crash the app
  if (!Array.isArray(messages)) {
    return <div className="chat-box">System booting....</div>;
  }

  return (
    <div className="chat-box">
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.role}`}>
          {msg.text}
        </div>
      ))}
      {isLoading && (
        <div className="message jarvis loading">Processing matrix...</div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatBox;
