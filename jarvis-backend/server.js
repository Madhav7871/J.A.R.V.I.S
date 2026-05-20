const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ==========================================
// 🚀 API KEY ROTATION ENGINE
// ==========================================
let apiKeys = Object.keys(process.env)
  .filter((key) => key.startsWith("GEMINI_API_KEY_"))
  .map((key) => process.env[key]);

if (apiKeys.length === 0 && process.env.GEMINI_API_KEY) {
  apiKeys.push(process.env.GEMINI_API_KEY);
}

if (apiKeys.length === 0) {
  console.log("🚨 ALARM: NO API KEYS FOUND! Check your .env file.");
} else {
  console.log(`✅ SUCCESS: Loaded ${apiKeys.length} API Keys.`);
}

let currentKeyIndex = 0;
function getActiveKey() {
  return apiKeys[currentKeyIndex];
}
function switchKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  console.log(`🔄 Switching to API Key #${currentKeyIndex + 1}`);
}

// ==========================================
// 🤖 AUTO-SCANNER FOR CORRECT MODEL
// ==========================================
let workingModel = "models/gemini-1.5-flash";

async function scanForValidModel() {
  if (apiKeys.length === 0) return;
  console.log("📡 Scanning Google Servers to find the correct model...");
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${getActiveKey()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
      const validModels = data.models.filter(
        (m) =>
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes("generateContent") &&
          m.name.includes("gemini"),
      );

      if (validModels.length > 0) {
        const flash = validModels.find((m) => m.name.includes("1.5-flash"));
        const pro = validModels.find((m) => m.name.includes("1.5-pro"));

        workingModel = flash
          ? flash.name
          : pro
            ? pro.name
            : validModels[0].name;
        console.log(`🎯 MODEL LOCKED: Successfully bound to ${workingModel}`);
      }
    }
  } catch (error) {
    console.log("⚠️ Scan failed. Proceeding with default model.");
  }
}
scanForValidModel();

// ==========================================
// 🧠 J.A.R.V.I.S. INTERNAL MEMORY SYSTEM
// ==========================================
const memoryFile = path.join(__dirname, "memory.json");
if (!fs.existsSync(memoryFile))
  fs.writeFileSync(memoryFile, JSON.stringify({ facts: [] }));

function loadMemory() {
  const data = fs.readFileSync(memoryFile);
  return JSON.parse(data).facts;
}

function saveMemory(fact) {
  const memory = { facts: loadMemory() };
  memory.facts.push(fact);
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
}

// ==========================================
// 🤖 MAIN CHAT API WITH DIRECT NOTES SYSTEM
// ==========================================
app.post("/api/chat", async (req, res) => {
  try {
    if (apiKeys.length === 0) throw new Error("No API keys configured.");

    const { message, history, instruction } = req.body;
    const userMsg = message.toLowerCase().trim();

    // 1. MEMORY COMMAND
    if (
      userMsg.startsWith("jarvis remember that") ||
      userMsg.startsWith("remember that")
    ) {
      const fact = message
        .replace(/jarvis remember that|remember that/i, "")
        .trim();
      saveMemory(fact);
      return res.json({
        response: `Got it. I have securely saved this to my internal memory: ${fact}`,
      });
    }

    // 2. DYNAMIC OS & NOTE INSTRUCTION
    const currentMemory = loadMemory();
    let memoryString =
      currentMemory.length > 0
        ? "\n\nCRITICAL CONTEXT - User's Personal Facts: " +
          currentMemory.join(". ")
        : "";

    const dynamicOSInstruction = `
    You are connected to the user's Windows PC. You have TWO special powers:

    POWER 1: RUN OS COMMANDS
    If asked to open an app (like Chrome, VS Code), output exactly: <OS_CMD>command</OS_CMD>.
    Example: User: "Open Notepad" -> <OS_CMD>start notepad</OS_CMD> Opening Notepad.

    POWER 2: TAKE NOTES (DIRECT DICTATION)
    If the user asks you to "note this down", "write a note saying...", or "take a note", extract ONLY the exact text they want saved and wrap it exactly in this tag: <MAKE_NOTE>text to save</MAKE_NOTE>. Do not add comments, bullets, or dates inside the tag. Just the clean text.
    Example: User: "Take a note that buy groceries tomorrow" -> <MAKE_NOTE>buy groceries tomorrow</MAKE_NOTE> I have noted that down for you.

    If the user is just chatting normally, do NOT use any tags.
    `;

    const finalInstruction = instruction + memoryString + dynamicOSInstruction;

    const cleanHistory = (history || []).filter(
      (msg) =>
        msg.parts &&
        msg.parts[0] &&
        !msg.parts[0].text.includes("System Error") &&
        !msg.parts[0].text.includes("Mainframe offline") &&
        !msg.parts[0].text.includes("Error:"),
    );

    const requestBody = {
      system_instruction: { parts: [{ text: finalInstruction }] },
      contents: [...cleanHistory, { role: "user", parts: [{ text: message }] }],
    };

    let attempts = 0;
    let aiResponseText = "";
    let lastErrorDetail = "";

    while (attempts < apiKeys.length) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/${workingModel}:generateContent?key=${getActiveKey()}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok) {
          aiResponseText = data.candidates[0].content.parts[0].text;
          break;
        }

        lastErrorDetail = data.error?.message || "Unknown API Error";

        if (
          data.error?.code === 429 ||
          data.error?.code === 503 ||
          lastErrorDetail.includes("quota")
        ) {
          throw new Error("Quota/Demand Error");
        } else if (
          lastErrorDetail.includes("not found for API version") ||
          lastErrorDetail.includes("not supported")
        ) {
          console.log("⚠️ Current model unsupported. Retrying scan...");
          await scanForValidModel();
          throw new Error(`Model Error: ${lastErrorDetail}. Retrying...`);
        } else {
          throw new Error(`Google API Format Error: ${lastErrorDetail}`);
        }
      } catch (error) {
        if (
          error.message === "Quota/Demand Error" ||
          error.message.includes("Model Error")
        ) {
          switchKey();
          attempts++;
        } else {
          throw error;
        }
      }
    }

    if (!aiResponseText)
      throw new Error(`All APIs failed. Last Error: ${lastErrorDetail}`);

    // ==========================================
    // ⚡ 3. EXECUTE OS COMMANDS OR TAKE NOTES
    // ==========================================
    const noteRegex = /<MAKE_NOTE>([\s\S]*?)<\/MAKE_NOTE>/;
    const cmdRegex = /<OS_CMD>(.*?)<\/OS_CMD>/;

    const noteMatch = aiResponseText.match(noteRegex);
    const cmdMatch = aiResponseText.match(cmdRegex);

    if (noteMatch) {
      // 🔥 THE FIX: Date aur timestamp completely removed. Direct clean append.
      const noteContent = noteMatch[1].trim();
      console.log(`📝 DIRECT NOTE DICTATION: ${noteContent}`);

      const notesFilePath = path.join(__dirname, "Jarvis_Notes.txt");

      // Seedha wahi line insert hogi jo tune boli hai, uske baad ek naya line brake (\n)
      const formattedNote = `${noteContent}\n`;

      fs.appendFileSync(notesFilePath, formattedNote);

      // Pop up the text file inside Notepad
      exec(`start notepad "${notesFilePath}"`, (error) => {
        if (error) console.error(`Command failed: ${error.message}`);
      });

      aiResponseText = aiResponseText.replace(noteMatch[0], "").trim();
      if (!aiResponseText) aiResponseText = "Noted, boss.";
    } else if (cmdMatch) {
      const commandToRun = cmdMatch[1];
      console.log(`⚡ EXECUTING AI COMMAND: ${commandToRun}`);

      exec(commandToRun, (error) => {
        if (error) console.error(`Command failed: ${error.message}`);
      });

      aiResponseText = aiResponseText.replace(cmdMatch[0], "").trim();
      if (!aiResponseText) aiResponseText = "Executing command now, boss.";
    }

    res.json({ response: aiResponseText });
  } catch (error) {
    console.error("Backend Catch:", error.message);
    res
      .status(500)
      .json({ error: error.message || "Failed to process request" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 J.A.R.V.I.S. Clean Dictation OS Mainframe Active.");
});
