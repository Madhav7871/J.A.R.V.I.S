const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const googleTTS = require("google-tts-api");
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
// 👑 MADHAV'S ULTIMATE CORE DIRECTIVE
// ==========================================
const madhavCoreContext = `
CRITICAL USER PROFILE - DO NOT FORGET THIS CONTEXT:
- Name: Madhav Kalra
- Location: Delhi, India
- Education: 3rd-year B.Tech CSE student at Bhagwan Parshuram Institute of Technology (BPIT), GGSIPU. Also holds a Diploma in ECE from Guru Tegh Bahadur Polytechnic Institute. Schooling from Maharaja Agarsain Public School.
- Family: Father is Ashok Kumar, Mother is Sunita Kalra. Has an elder brother (entrepreneur) and elder sister (teacher).
- Tech Stack: Full-stack developer (React.js, Node.js, Express.js, MongoDB, Supabase, Firebase). Strong in AI/Computer Vision (OpenCV, MediaPipe). Loves glassmorphism UI.
- Key Projects: 
  1. QuickRuit (AI recruitment platform with video interviews).
  2. ShareFile (Real-time P2P file sharing/code collaboration).
  3. Ashvaan (AI mental health platform, SIH 2025 Top 70).
- Social Links: 
  * LinkedIn: https://www.linkedin.com/in/madhav-kalra-807252242/
  * GitHub: https://github.com/Madhav7871
- Upcoming Events: Campus recruitment drive with Unthinkable Solutions in May 2026.
- Personality & Workflow: Prefers Hinglish. Hustler, focuses on scalable real-world impact projects. Frequently collaborates with Rahul Shrivastwa. You must act as his highly personalized, street-smart AI assistant.
`;

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
    let dynamicMemoryString =
      currentMemory.length > 0
        ? "\n\nADDITIONAL USER FACTS: " + currentMemory.join(". ")
        : "";

    const dynamicOSInstruction = `
    You are connected to Madhav's Windows PC. You have TWO special powers:

    POWER 1: RUN OS COMMANDS & ADVANCED SEARCH
    If Madhav asks you to open ANY app, search the web, or open his profiles, output exactly: <OS_CMD>command</OS_CMD>.
    Examples:
    - User: "Open Notepad" -> <OS_CMD>start notepad</OS_CMD> Opening Notepad.
    - User: "Open VS Code" -> <OS_CMD>code .</OS_CMD> Booting up the coding environment.
    - User: "Open my LinkedIn" -> <OS_CMD>start chrome "https://www.linkedin.com/in/madhav-kalra-807252242/"</OS_CMD> Opening your LinkedIn.
    - User: "Open my GitHub" -> <OS_CMD>start chrome "https://github.com/Madhav7871"</OS_CMD> Opening GitHub.
    - User: "Search for React hooks on YouTube" -> <OS_CMD>start chrome "https://www.youtube.com/results?search_query=React+hooks"</OS_CMD> Searching YouTube for you.
    - User: "Search what is glassmorphism on Google" -> <OS_CMD>start chrome "https://www.google.com/search?q=what+is+glassmorphism"</OS_CMD> Searching Google.

    POWER 2: TAKE NOTES (DIRECT DICTATION)
    If the user asks you to "note this down", extract ONLY the exact text they want saved and wrap it exactly in this tag: <MAKE_NOTE>text to save</MAKE_NOTE>. Do not add comments or dates inside the tag.
    Example: User: "Take a note that fix QuickRuit bugs" -> <MAKE_NOTE>fix QuickRuit bugs</MAKE_NOTE> I have noted that down.

    If the user is just chatting, answer naturally as his AI bro using his profile context. Do NOT use tags unless executing an action.
    `;

    const finalInstruction =
      instruction +
      "\n" +
      madhavCoreContext +
      dynamicMemoryString +
      dynamicOSInstruction;

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
      const noteContent = noteMatch[1].trim();
      console.log(`📝 DIRECT NOTE DICTATION: ${noteContent}`);

      const notesFilePath = path.join(__dirname, "Jarvis_Notes.txt");
      const formattedNote = `${noteContent}\n`;

      fs.appendFileSync(notesFilePath, formattedNote);

      exec(`start notepad "${notesFilePath}"`, (error) => {
        if (error) console.error(`Command failed: ${error.message}`);
      });

      aiResponseText = aiResponseText.replace(noteMatch[0], "").trim();
      if (!aiResponseText) aiResponseText = "Noted, boss.";
    } else if (cmdMatch) {
      const commandToRun = cmdMatch[1].trim();
      console.log(`⚡ EXECUTING AI COMMAND: ${commandToRun}`);

      exec(commandToRun, (error) => {
        if (error) console.error(`Command failed: ${error.message}`);
      });

      aiResponseText = aiResponseText.replace(cmdMatch[0], "").trim();
      if (!aiResponseText) aiResponseText = "Executing command now, boss.";
    }

    // ==========================================
    // 🔊 GENERATE PREMIUM VOICE AUDIO URLS
    // ==========================================
    let audioUrls = [];
    try {
      // google-tts-api lambe text ko automatically chhote MP3 chunks mein tod deta hai
      audioUrls = googleTTS.getAllAudioUrls(aiResponseText, {
        lang: "en-IN", // Indian English accent - Hinglish ke liye sabse smooth aur natural
        slow: false,
        host: "https://translate.google.com",
      });
    } catch (err) {
      console.error("TTS Audio Generation Failed:", err);
    }

    // Ab text aur audio dono frontend par jayenge
    res.json({ response: aiResponseText, audioUrls: audioUrls });
  } catch (error) {
    console.error("Backend Catch:", error.message);
    res
      .status(500)
      .json({ error: error.message || "Failed to process request" });
  }
});

app.listen(PORT, () => {
  console.log("🚀 J.A.R.V.I.S. Premium Voice Mainframe Active.");
});
