const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.log("🚨 ALARM: API KEY IS MISSING! Check your .env file.");
} else {
  console.log("✅ SUCCESS: API Key loaded properly!");
}

const genAI = new GoogleGenerativeAI(apiKey);

app.post("/api/chat", async (req, res) => {
  try {
    if (!apiKey) {
      throw new Error("Backend has no API key.");
    }

    const { message, history, instruction } = req.body;

    // Bulletproof Model Setup using the stable gemini-1.5-pro
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest", // <--- Yahan '-latest' add kar diya
      systemInstruction: instruction,
    });

    // Start chat with history so it remembers the conversation
    const chat = model.startChat({ history: history || [] });

    // Send the user's message
    const result = await chat.sendMessage(message);
    const text = result.response.text();

    // Send response back to frontend
    res.json({ response: text });
  } catch (error) {
    console.error("Backend Error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to process request" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 J.A.R.V.I.S. Mainframe running on port ${PORT}`);
});
