import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { PDFParse } from "pdf-parse";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit to handle base64 image uploads
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini SDK with telemetry User-Agent
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Helper function to format GenAI error messages and detect prepayment billing depletion
function formatGenAIError(error: any): string {
  const errMsg = error.message || String(error);
  
  if (
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("prepayment credits are depleted") ||
    errMsg.includes("depleted") ||
    errMsg.includes("code\":429") ||
    error.status === 429
  ) {
    return "您的 Google AI Studio 預付點數已耗盡 (Prepayment credits depleted)。請點擊側邊欄底部的「設定與帳單」引導或至 Google AI Studio 主控台 (https://ai.studio/projects) 為您的 API 金鑰儲值點數，方可繼續學習與對話。";
  }

  try {
    const parsed = typeof errMsg === "string" ? JSON.parse(errMsg) : errMsg;
    if (parsed && parsed.error) {
      if (parsed.error.code === 429 || parsed.error.status === "RESOURCE_EXHAUSTED" || String(parsed.error.message).includes("depleted")) {
        return "您的 Google AI Studio 預付點數已耗盡 (Prepayment credits depleted)。請至 Google AI Studio 主控台 (https://ai.studio/projects) 進行儲值以繼續使用。";
      }
      return parsed.error.message || errMsg;
    }
  } catch (e) {
    // ignore
  }

  return errMsg;
}

// Chat completion endpoint using gemini-3.5-flash
app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured on the server. Please add it via Settings > Secrets.",
      });
    }

    const { messages, useSearch, systemInstruction, responseLength, textbookText, onlyUseTextbook } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid 'messages' layout provided." });
    }

    // Convert messages to Google GenAI Content SDK format
    // Each message contains { role: 'user'|'model', parts: [{ text: '...' }, { inlineData: { mimeType, data } }] }
    const contents = messages.map((msg: any) => {
      const parts = [];
      if (msg.text) {
        parts.push({ text: msg.text });
      }
      if (msg.image) {
        // msg.image format: { mimeType: 'image/jpeg', data: 'base64...' }
        // Clean base64 header if present (e.g., data:image/png;base64,...)
        let rawData = msg.image.data;
        if (rawData === "[圖片內容太大，已省略]" || rawData === "[圖片已省略]") {
          // Explicitly skip images that were truncated for database constraints
          // so as not to cause invalid base64 errors in Google GenAI SDK.
        } else {
          if (rawData.includes(";base64,")) {
            rawData = rawData.split(";base64,").pop();
          }
          parts.push({
            inlineData: {
              mimeType: msg.image.mimeType,
              data: rawData,
            },
          });
        }
      }
      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    let baseInstruction = systemInstruction || "You are a helpful, brilliant AI chatbot assistant.";
    let finalInstruction = baseInstruction;

    if (textbookText) {
      if (onlyUseTextbook) {
        finalInstruction = `${baseInstruction}\n\n[重要規範：只限根據教科書內容回答]\n你現在已被載入一本特定的學習教科書作為背景解答來源。在維持你原本「主要角色特點、思維風格、性格特徵與講話風格口吻」（例如若是蘇格拉底性格，則應維持以策略性問題引導，而非直接灌輸標準答案；若是代碼專家工程師，則專注於代碼與邏輯審查）的前提下，請務必遵循下列核心守則：\n\n【提供之參考教科書內容】：\n"""\n${textbookText}\n"""\n\n【嚴格行為準則】：\n1. 你的回答內容【僅能】根據上述提供的參考教科書內容，絕對不可自行捏造、假設或使用任何無關的外部知識庫。\n2. 如果問題在上述教科書內容中找不到答案，請【務必】回到你的角色性格口吻並回答：「抱歉，提供的教科書內容中並未包含相關資訊。」，千萬不可擅自腦補或使用其他外部知識補充。`;
      } else {
        finalInstruction = `${baseInstruction}\n\n[重要指引：優先依據教科書內容回答]\n你現在已被載入學習教科書作為主要背景參考脈絡。請在百分之百融合你原有「主要角色特點、思維風格、性格與口吻特徵」（例如蘇格拉底導師的暖心循循善誘與適當譬喻）的基礎上優先答題。若教科書中的內容不足，可適度引用學術基礎知識輔助說明，但請清楚註明哪些部分來自教科書，哪些是補充說明。\n\n【提供之參考教科書內容】：\n"""\n${textbookText}\n"""`;
      }
    }

    // Inject response length constraints to cleanly govern Gemini response length
    if (responseLength === "short") {
      finalInstruction += "\n\n[IMPORTANT RESPONSE LENGTH CONSTRAINT]\n請務必讓回答極度簡潔、精闢、切中要害，字數及句數儘可能精簡（建議不超過 2-3 句話）。";
    } else if (responseLength === "long") {
      finalInstruction += "\n\n[IMPORTANT RESPONSE LENGTH CONSTRAINT]\n請務必讓回答詳盡、深具學術或知識細節、完整剖析所有來龍去脈與推論過程，提供充分的解釋與範例說明。";
    } else {
      finalInstruction += "\n\n[IMPORTANT RESPONSE LENGTH CONSTRAINT]\n請務必讓回答長度適中、層次分明、脈絡清晰（建議維持在 2-3 段左右的長短）。";
    }

    // Setup configuration
    const config: any = {
      systemInstruction: finalInstruction,
    };

    const isSearchEnabled = useSearch === true || useSearch === "true" || !!useSearch;
    if (isSearchEnabled) {
      config.tools = [{ googleSearch: {} }];
      finalInstruction += "\n\n[GOOGLE SEARCH GROUNDING ACTIVE]\n當用戶的問題涉及最新時事、即時資訊、當天天氣或需要網頁最新結果時，你已被授予上網搜尋的能力。請善用 googleSearch 的搜尋結果，並精準引用、自然地融入你原本的「角色性格與口吻」（如蘇格拉底啟發、創意寫作、或工程師風格）之中。";
      config.systemInstruction = finalInstruction; // Ensure the tools nudge is updated in systemInstruction
    }

    // Call Gemini!
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config,
    });

    const text = response.text || "";

    // Extract search grounding metadata if present
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const searchSources = groundingChunks
      ? groundingChunks
          .map((chunk: any) => {
            if (chunk.web) {
              return {
                title: chunk.web.title || "Web Search Result",
                uri: chunk.web.uri,
              };
            }
            return null;
          })
          .filter(Boolean)
      : [];

    res.json({
      text,
      sources: searchSources,
    });
  } catch (error: any) {
    console.error("Error in /api/chat execution:", error);
    res.status(500).json({
      error: formatGenAIError(error),
    });
  }
});

// Live API audio websocket endpoint will be below or above
// Textbook upload endpoint (using raw binary arraybuffer upload, handles any Content-Type as raw bytes)
app.post("/api/upload-textbook", express.raw({ type: "*/*", limit: "35mb" }), async (req, res) => {
  try {
    const fileBuffer = req.body;
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "未收到有效的檔案。請重試。" });
    }

    // Decode filename from header
    const encodedFileName = req.headers["x-file-name"] as string || "";
    const fileName = encodedFileName ? decodeURIComponent(encodedFileName) : "textbook.pdf";
    const lowerName = fileName.toLowerCase();

    let text = "";
    let numPages = 1;

    if (lowerName.endsWith(".pdf")) {
      // Parse the PDF with a maximum limit of 200 pages to prevent memory crashes & thread block
      const parser = new PDFParse({ data: fileBuffer });
      const data = await parser.getText({ first: 200 });
      text = data.text || "";
      numPages = data.total || 1;
    } else if (
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".markdown") ||
      lowerName.endsWith(".json") ||
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".tsv") ||
      lowerName.endsWith(".html") ||
      lowerName.endsWith(".htm") ||
      lowerName.endsWith(".js") ||
      lowerName.endsWith(".ts") ||
      lowerName.endsWith(".tsx") ||
      lowerName.endsWith(".css")
    ) {
      // Decode as UTF-8 text string directly
      text = fileBuffer.toString("utf-8");
      // Remove possible UTF-8 BOM byte-order-mark prefix
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }
      numPages = 1;
    } else {
      // Fallback: try PDF first, otherwise fallback to plain text UTF-8
      try {
        const parser = new PDFParse({ data: fileBuffer });
        const data = await parser.getText({ first: 200 });
        text = data.text || "";
        numPages = data.total || 1;
      } catch (pdfErr) {
        text = fileBuffer.toString("utf-8");
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.substring(1);
        }
        numPages = 1;
      }
    }

    res.json({
      text,
      numPages,
      textLength: text.length,
    });
  } catch (err: any) {
    console.error("Textbook Parsing error:", err);
    res.status(500).json({ error: err.message || "解析講義或教材檔案失敗。" });
  }
});

// Text-to-speech endpoint using gemini-3.1-flash-tts-preview
app.post("/api/speech", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured.",
      });
    }

    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text specified for speech generation." });
    }

    // Supported voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const voiceName = voice || "Zephyr";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: "Model failed to return speech audio." });
    }

    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("Error in /api/speech execution:", error);
    res.status(500).json({ error: formatGenAIError(error) });
  }
});

// Integrate Vite middleware in development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static asset serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler to catch middleware errors (like PayloadTooLarge)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express global error handler caught:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error"
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Chatbot full-stack server running on http://localhost:${PORT}`);
  });
}

setupVite();
