import React, { useEffect, useRef } from 'react';

const ChatBox = ({ messages, isLoading }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-box">
      {messages.map((msg, index) => (
        <div key={index} className={`message ${msg.role}`}>
          {msg.text}
        </div>
      ))}
      {isLoading && (
        <div className="message jarvis loading">
          Processing matrix...
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatBox;