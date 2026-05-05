const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
// Allow your frontend to talk to this backend
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize Gemini with the hidden key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
  try {
    // Receive the message, history, and personality from the frontend
    const { message, history, instruction } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: instruction
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const text = result.response.text();

    // Send the response back to the frontend
    res.json({ response: text });
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: error.message || "Failed to process request" });
  }
});

app.listen(PORT, () => {
  console.log(`J.A.R.V.I.S. Mainframe running on port ${PORT}`);
});