const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const apiKey = process.env.GEMINI_API_KEY;

let workingModel = "models/gemini-1.5-flash"; // Default

// 🧠 HACK: Server start hote hi model detect karke save kar lenge
// Taaki har message par double API call na ho aur Rate Limit hit na kare!
async function initializeMainframe() {
  if (!apiKey) {
    console.log("🚨 ALARM: API KEY IS MISSING!");
    return;
  }
  try {
    console.log("📡 Scanning Google Servers for available models...");
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const listData = await listResponse.json();

    if (listData.models && listData.models.length > 0) {
      const availableModels = listData.models.filter(
        (m) =>
          m.name.includes("gemini") &&
          m.supportedGenerationMethods.includes("generateContent"),
      );
      if (availableModels.length > 0) {
        workingModel = availableModels[0].name;
      }
    }
    console.log(`✅ SUCCESS: Mainframe locked onto ${workingModel}`);
  } catch (error) {
    console.log(`⚠️ Warning: Scan failed, defaulting to ${workingModel}`);
  }
}

// Start the scan
initializeMainframe();

app.post("/api/chat", async (req, res) => {
  try {
    if (!apiKey) throw new Error("Backend has no API key.");

    const { message, history, instruction } = req.body;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `SYSTEM INSTRUCTION: Strictly follow this persona: ${instruction}`,
          },
        ],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I am online and ready to assist." }],
      },
      ...(history || []),
      { role: "user", parts: [{ text: message }] },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/${workingModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: contents }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Google API request failed");
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    res.json({ response: textResponse });
  } catch (error) {
    console.error("Backend Error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to process request" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 J.A.R.V.I.S. Optimized Mainframe running on port ${PORT}`);
});
