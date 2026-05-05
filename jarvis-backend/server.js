const express = require('express');
const cors = require('cors');
// This line loads the .env file
require('dotenv').config(); 
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const apiKey = process.env.GEMINI_API_KEY;

// --- DEBUGGING TRACKER ---
if (!apiKey) {
  console.log("🚨 ALARM: API KEY IS MISSING! Node.js cannot see your .env file!");
} else {
  console.log("✅ SUCCESS: API Key loaded properly!");
}
// -------------------------

const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/chat', async (req, res) => {
  try {
    if (!apiKey) {
      throw new Error("Backend has no API key. Please check your .env file setup.");
    }

    const { message, history, instruction } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: instruction
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const text = result.response.text();

    res.json({ response: text });
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: error.message || "Failed to process request" });
  }
});

app.listen(PORT, () => {
  console.log(`J.A.R.V.I.S. Mainframe running on port ${PORT}`);
});