import { useState, useEffect, useRef } from "react";
import {
  Menu,
  Sparkles,
  Terminal,
  PenTool,
  GraduationCap,
  Download,
  Bot,
  Globe,
  Loader2,
  Trash2,
  VolumeX,
  Volume2,
  AlertCircle,
  Plus
} from "lucide-react";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc, collectionGroup } from "firebase/firestore";

import Sidebar from "./components/Sidebar";
import MessageItem from "./components/MessageItem";
import InputArea from "./components/InputArea";
import LoginScreen from "./components/LoginScreen";
import { ChatSession, ChatPersonality, Message, Textbook } from "./types";

const PERSONALITIES: ChatPersonality[] = [
  {
    id: "tutor",
    name: "智慧小老師（啟發導學）",
    description: "由教學經驗豐富的資深教師引導、透過策略提問與溫和思辨領您自主理解課業概念與難題。",
    systemInstruction: "你是一位教學經驗極其豐富、溫暖、且循循善誘的「智慧小老師」。每當學生（用戶）向你提問或給出看法時，請務必遵循以下啟發式教學原則來應答：\n1. **永不直接給予終極答案**：不論學生問的問題多麼直接或簡單，都不要直接告訴他可以直接抄寫的標準答案。你的目標是點燃學生的主動思維空間，而非單向灌輸知識。\n2. **以策略性的問題引導**：透過拆解學生的提問，提出 1 或 2 個深入淺出、循序漸進且具有思辨啟發性的關鍵問題。引導學生去審視自己背後的假設、推導邏輯或概念核心。\n3. **給予溫柔、細膩的正面反饋**：學生的發問或嘗試給予回答時，即使他們的思考不完全正確或仍有瑕疵，也要溫柔地發掘其中的閃光點，用溫馨有溫度的語言給予肯定，幫助解答他的盲點並點燃信心。\n4. **運用生動貼合的比喻**：適度聯想現實生活中的貼切譬喻、故事、或生活觀察實例，幫助學生更直觀地體會、解構複雜或抽象的學術模型。\n5. **排版優美且使用繁體中文**：使用精美、結構化的繁體中文 Markdown 格式和舒緩、知性且富有教育愛的情感口吻，讓學生閱讀時感受到深度的關懷與陪伴。\n\n請始終保持溫和、充滿耐心且注重邏輯探討的資深教師風範，並引導啟發學生成長。",
    icon: "GraduationCap",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    accentColor: "bg-emerald-600 hover:bg-emerald-500"
  },
  {
    id: "coder",
    name: "軟體代碼專家",
    description: "資深軟體工程師，精通各式程式代碼撰寫、邏輯審查與除錯。",
    systemInstruction: "你是一位資深軟體工程師。請提供乾淨、安全且高效的程式碼片段。請使用相應語言對代碼塊進行格式化，並用繁體中文提供逐步邏輯審查與潛在邊界邊緣情況的乾淨說明。",
    icon: "Terminal",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    accentColor: "bg-sky-600 hover:bg-sky-500"
  },
  {
    id: "writer",
    name: "靈感創意寫手",
    description: "富有想像力的文案作家與故事創作者，協助完善靈感與小說文案。",
    systemInstruction: "你是一位富有創意的人文作家與故事創作者。請使用引人入勝的風格、豐富的手法與優雅的繁體中文詞彙。避免枯燥陳舊的定義，並全力協助用戶完善其敘事與靈感創意。",
    icon: "PenTool",
    color: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
    accentColor: "bg-fuchsia-600 hover:bg-fuchsia-500"
  },
  {
    id: "general",
    name: "智慧通才導師",
    description: "綜合型解答與分析知識庫，協助多元日常疑問與資訊歸納。",
    systemInstruction: "你是一位全能的智慧通才助手。請提供客觀、詳實、結構分明並以繁體中文撰寫的實用回答，協助解答用戶的一切日常知識與綜合學科問題。",
    icon: "Sparkles",
    color: "text-amber-400 bg-[#9b72cb]/10 border-[#9b72cb]/20",
    accentColor: "bg-amber-600 hover:bg-amber-500"
  }
];

function cleanUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanUndefined(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === "object") {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        newObj[key] = cleanUndefined(value);
      }
    }
    return newObj as T;
  }
  return obj;
}

// Helper function to safely extract server error message
async function parseFetchError(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json && typeof json.error === "string") {
        return json.error;
      }
    } catch {
      // not json
    }
    return text || fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Authentication states
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin access control lists
  const ADMIN_EMAILS = ["alankwok321@gmail.com"];
  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);

  // Synchronized user interface themes
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Global Dynamic Settings
  interface GlobalSettings {
    personalityId: string;
    useSearch: boolean;
    voiceId: string;
    responseLength: "short" | "medium" | "long";
    activeTextbookId: string;
    activeTextbookIds?: string[];
    onlyUseTextbook: boolean;
  }

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [isUploadingTextbook, setIsUploadingTextbook] = useState(false);

  // Admin Dashboard States
  const [showAdminDashboard, setShowAdminDashboard] = useState<boolean>(false);
  const [allStudentSessions, setAllStudentSessions] = useState<ChatSession[]>([]);
  const [selectedStudentSessionId, setSelectedStudentSessionId] = useState<string>("");
  const [isAdminSessionsLoading, setIsAdminSessionsLoading] = useState<boolean>(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>("");

  // Subscribe to all textbooks in general
  useEffect(() => {
    if (!user) {
      setTextbooks([]);
      return;
    }

    if (!db) return;

    const colRef = collection(db, "textbooks");
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: Textbook[] = [];
      snapshot.forEach((snap) => {
        list.push(snap.data() as Textbook);
      });
      // Sort by upload timeline
      list.sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setTextbooks(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "textbooks");
    });

    return () => unsubscribe();
  }, [user]);

  // Load and subscribe to global settings from Firestore
  useEffect(() => {
    if (!user) {
      setGlobalSettings(null);
      return;
    }

    if (!db) return;

    const docRef = doc(db, "settings", "global");
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      console.log("Global settings snapshot received:", docSnap.exists() ? "exists" : "none");
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data() as GlobalSettings);
      } else {
        const defaultSettings: GlobalSettings = {
          personalityId: "tutor",
          useSearch: false,
          voiceId: "Zephyr",
          responseLength: "medium",
          activeTextbookId: "none",
          activeTextbookIds: [],
          onlyUseTextbook: false
        };
        setGlobalSettings(defaultSettings);

        if (isAdmin) {
          setDoc(docRef, defaultSettings).catch((err) => {
            console.error("Failed to initialize global settings in Firestore:", err);
          });
        }
      }
    }, (err) => {
      console.error("Global settings subscription failed:", err);
      setGlobalSettings({
        personalityId: "tutor",
        useSearch: false,
        voiceId: "Zephyr",
        responseLength: "medium",
        activeTextbookId: "none",
        activeTextbookIds: [],
        onlyUseTextbook: false
      });
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Synchronized All Student Sessions for Administrators monitoring
  useEffect(() => {
    if (!user || !isAdmin || !db) {
      setAllStudentSessions([]);
      return;
    }

    setIsAdminSessionsLoading(true);
    // Unconstrained collectionGroup query -> 100% works without composite index requirements
    const q = query(collectionGroup(db, "sessions"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: ChatSession[] = [];
        snapshot.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...docSnap.data() } as ChatSession);
        });
        setAllStudentSessions(docs);
        setIsAdminSessionsLoading(false);
      },
      (err) => {
        console.error("Admin monitoring error:", err);
        setIsAdminSessionsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Speech (TTS) states
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSpeechLoading, setIsSpeechLoading] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Guard flag to prevent double welcome rendering on slow firebase coldstarts
  const creatingInitialRef = useRef(false);

  // Auth State Listener
  useEffect(() => {
    console.log("App mounted, starting onAuthStateChanged listener...");
    
    // Fallback: If auth takes too long, set loading to false to show login Screen
    const timeout = setTimeout(() => {
      setAuthLoading((prev) => {
        if (prev) {
           console.warn("Auth state took too long, forcing loading to false");
           return false;
        }
        return prev;
      });
    }, 2000);

    let unsubscribe: any;
    try {
      if (auth) {
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          console.log("Auth state changed:", currentUser ? currentUser.email : "No user");
          setUser(currentUser);
          setAuthLoading(false);
          setIsLoggingIn(false);
        });
      } else {
        console.error("Auth object is not available");
        setAuthLoading(false);
      }
    } catch (e) {
      console.error("Firebase auth listener failed:", e);
      setAuthLoading(false);
    }

    // Auto close sidebar on narrow screens initially
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    // Setup native Audio element for TTS playback
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setSpeakingMessageId(null);
    };

    return () => {
      if (unsubscribe) unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Firestore Sessions Sync Listener
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setActiveSessionId("");
      return;
    }

    if (!db) {
      console.error("Firestore DB instance is null or undefined.");
      setApiError("無法連接至資料庫，請檢查您的 Firebase 連線設定。");
      return;
    }

    const sessionsCol = collection(db, "users", user.uid, "sessions");
    const q = query(sessionsCol, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Sessions snapshot received:", snapshot.size, "documents");
      const docs: ChatSession[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as ChatSession);
      });

      setSessions(docs);

      // Verify or assign active session ID dynamically
      setActiveSessionId((prev) => {
        if (prev && docs.some((d) => d.id === prev)) {
          return prev;
        }
        return docs[0]?.id || "";
      });
    }, (error) => {
      console.error("Firestore sync subscription failed:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Auth triggered handlers
  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Sign-in failed: ", error);
      setLoginError(error.message || "登入過程中發生未預期錯誤，請重新再試。");
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    handleStopSpeech();
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out failed: ", error);
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    handleStopSpeech();
  };

  const handleCreateSession = async (personalityId = "tutor") => {
    if (!user) return;
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: `新對話空間 ${sessions.length + 1}`,
      ownerId: user.uid,
      ownerName: user.displayName || "自修學生",
      ownerEmail: user.email || "",
      ownerPhotoURL: user.photoURL || "",
      messages: [],
      personalityId,
      useSearch: sessions.find((s) => s.id === activeSessionId)?.useSearch || false,
      createdAt: new Date().toISOString(),
      voiceId: sessions.find((s) => s.id === activeSessionId)?.voiceId || "Zephyr"
    };

    try {
      await setDoc(doc(db, "users", user.uid, "sessions", newId), cleanUndefined(newSession));
      setActiveSessionId(newId);
      setApiError(null);
      handleStopSpeech();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sessions/${newId}`);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "sessions", id));
      handleStopSpeech();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/sessions/${id}`);
    }
  };

  const handleAdminDeleteSession = async (ownerId: string, sessionId: string) => {
    if (!user || !isAdmin) return;
    if (!confirm("確定要刪除這位學生的對話紀錄嗎？")) return;
    try {
      await deleteDoc(doc(db, "users", ownerId, "sessions", sessionId));
      if (selectedStudentSessionId === sessionId) {
        setSelectedStudentSessionId("");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${ownerId}/sessions/${sessionId}`);
    }
  };

  const handleRenameSession = async (id: string, title: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "sessions", id), { title });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/sessions/${id}`);
    }
  };

  const handleChangePersonality = async (id: string) => {
    if (!user) return;
    if (!isAdmin) {
      setApiError("權限不足：只有管理員才能變更 AI 角色個性設定。");
      return;
    }
    try {
      await setDoc(doc(db, "settings", "global"), { personalityId: id }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/global`);
    }
  };

  const handleToggleSearch = async (useSearch: boolean) => {
    if (!user) return;
    if (!isAdmin) {
      setApiError("權限不足：只有管理員才能變更 Google 搜尋設定。");
      return;
    }
    try {
      await setDoc(doc(db, "settings", "global"), { useSearch }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/global`);
    }
  };

  const handleChangeVoice = async (voiceId: string) => {
    if (!user) return;
    if (!isAdmin) {
      setApiError("權限不足：只有管理員才能變更 TTS 語音設定。");
      return;
    }
    try {
      await setDoc(doc(db, "settings", "global"), { voiceId }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/global`);
    }
  };

  const handleChangeResponseLength = async (responseLength: "short" | "medium" | "long") => {
    if (!user) return;
    if (!isAdmin) {
      setApiError("權限不足：只有管理員才能變更回應長度設定。");
      return;
    }
    try {
      await setDoc(doc(db, "settings", "global"), { responseLength }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/global`);
    }
  };

  const handleChangeActiveTextbook = async (id: string) => {
    if (!user) return;
    try {
      const isNone = id === "none";
      await setDoc(doc(db, "settings", "global"), { 
        activeTextbookId: id, 
        activeTextbookIds: isNone ? [] : [id] 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/global`);
    }
  };

  const handleToggleTextbook = async (id: string) => {
    if (!user) return;
    try {
      let currentActive = globalSettings?.activeTextbookIds || [];
      if (!globalSettings?.activeTextbookIds && globalSettings?.activeTextbookId && globalSettings.activeTextbookId !== "none") {
        currentActive = [globalSettings.activeTextbookId];
      }

      let newActive: string[];
      if (currentActive.includes(id)) {
        newActive = currentActive.filter((x) => x !== id);
      } else {
        newActive = [...currentActive, id];
      }

      // Preserve single fallback
      const primaryId = newActive.length > 0 ? newActive[0] : "none";

      await setDoc(doc(db, "settings", "global"), {
        activeTextbookIds: newActive,
        activeTextbookId: primaryId
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/global`);
    }
  };

  const handleToggleOnlyUseTextbook = async (val: boolean) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "settings", "global"), { onlyUseTextbook: val }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `settings/global`);
    }
  };

  const handleUploadTextbooks = async (files: File[]) => {
    if (!user) return;
    if (!isAdmin) {
      setApiError("權限不足：只有管理員才能上傳講義書籍。");
      return;
    }

    setIsUploadingTextbook(true);
    setApiError(null);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
    let errorMsgs: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errorMsgs.push(`檔案 "${file.name}" 大小超過系統上限 (10MB)`);
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const safeFileName = encodeURIComponent(file.name);
        const res = await fetch("/api/upload-textbook", {
          method: "POST",
          headers: { 
            "Content-Type": file.type || "application/octet-stream",
            "X-File-Name": safeFileName
          },
          body: arrayBuffer,
        });

        if (!res.ok) {
          let errMsg = await parseFetchError(res, `伺服器回應錯誤 (HTTP ${res.status})`);
          throw new Error(errMsg);
        }

        const data = await res.json();
        const text = data.text || "";

        if (!text.trim()) {
          throw new Error("解析結果為空（無可讀取文字）");
        }

        const chunkSize = 120000;
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += chunkSize) {
          chunks.push(text.slice(i, i + chunkSize));
        }

        const textbookId = "textbook_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
        const newTextbook: Textbook = {
          id: textbookId,
          name: file.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.uid,
          totalChars: text.length,
        };

        await setDoc(doc(db, "textbooks", textbookId), newTextbook);

        await setDoc(doc(db, "textbooks_contents", textbookId), {
          id: textbookId,
          chunks: chunks
        });
      } catch (err: any) {
        console.error(`Textbook Upload Error (${file.name}):`, err);
        errorMsgs.push(`檔案 "${file.name}" 處理失敗：${err.message || '未知錯誤'}`);
      }
    }

    if (errorMsgs.length > 0) {
      setApiError(`部分講義上傳遇到以下問題：\n${errorMsgs.join("\n")}`);
    }
    
    setIsUploadingTextbook(false);
  };

  const handleRenameTextbook = async (id: string, newName: string) => {
    if (!user) return;
    if (!isAdmin) {
      setApiError("權限不足：只有管理員才能重新命名講義。");
      return;
    }
    try {
      await updateDoc(doc(db, "textbooks", id), {
        name: newName,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `textbooks/${id}`);
    }
  };

  const handleDeleteTextbook = async (id: string) => {
    if (!user) return;
    if (!isAdmin) {
      setApiError("權限不足：只有管理員才能刪除講義。");
      return;
    }
    try {
      await deleteDoc(doc(db, "textbooks", id));
      await deleteDoc(doc(db, "textbooks_contents", id));
      
      let updatedIds = (globalSettings?.activeTextbookIds || []).filter((x) => x !== id);
      let updatedActiveId = globalSettings?.activeTextbookId || "none";
      if (updatedActiveId === id) {
        updatedActiveId = updatedIds.length > 0 ? updatedIds[0] : "none";
      }

      await setDoc(doc(db, "settings", "global"), {
        activeTextbookId: updatedActiveId,
        activeTextbookIds: updatedIds,
        onlyUseTextbook: updatedIds.length === 0 ? false : (globalSettings?.onlyUseTextbook ?? false)
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `textbooks/${id}`);
    }
  };

  // Scroll helper
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, isGenerating]);

  // Handle message processing
  const handleSendMessage = async (
    text: string,
    image?: { mimeType: string; data: string }
  ) => {
    if (!user) return;
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    if (!currentSession) return;

    setApiError(null);

    // Create prompt message item
    const userMessage: Message = {
      id: `m-${Date.now()}`,
      role: "user",
      text,
      image,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const updatedMessages = [...currentSession.messages, userMessage];
    
    const updatedTitle = (currentSession.messages.length === 0 || currentSession.title.startsWith("新對話空間"))
      ? text.slice(0, 24) + (text.length > 24 ? "..." : "")
      : currentSession.title;

    setIsGenerating(true);

    const stripLargeData = (msgs: Message[]) => msgs.map(m => {
      if (m.image && m.image.data && m.image.data.length > 1000) {
        return { ...m, image: { ...m.image, data: "[圖片內容太大，已省略]" } };
      }
      return m;
    });

    try {
      // Optimistically push user request to Firestore
      await updateDoc(doc(db, "users", user.uid, "sessions", activeSessionId), cleanUndefined({
        messages: stripLargeData(updatedMessages),
        title: updatedTitle
      }));

      const activePers = PERSONALITIES.find((p) => p.id === activePersonalityId) || PERSONALITIES[0];

      // Fetch textbook raw chunks on demand from textbooks_contents only if enabled
      let textbookText = "";
      const activeIds: string[] = [];
      if (globalSettings?.activeTextbookIds && Array.isArray(globalSettings.activeTextbookIds)) {
        activeIds.push(...globalSettings.activeTextbookIds);
      } else if (globalSettings?.activeTextbookId && globalSettings.activeTextbookId !== "none") {
        activeIds.push(globalSettings.activeTextbookId);
      }

      if (activeIds.length > 0) {
        try {
          const fetchPromises = activeIds.map(async (id) => {
            const contentSnap = await getDoc(doc(db, "textbooks_contents", id));
            if (contentSnap.exists()) {
              const data = contentSnap.data();
              if (data && data.chunks) {
                const bookMeta = textbooks.find((b) => b.id === id);
                const bookName = bookMeta ? bookMeta.name : "未知書籍";
                return `--- 【開始研讀教材: ${bookName}】 ---\n${data.chunks.join("\n")}\n--- 【結束研讀教材: ${bookName}】 ---`;
              }
            }
            return "";
          });
          const results = await Promise.all(fetchPromises);
          textbookText = results.filter((t) => t).join("\n\n");
        } catch (err) {
          console.error("Failed to load textbooks contents from Firestore:", err);
        }
      }

      // Request chat response from full-stack backend server
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          useSearch: globalSettings ? globalSettings.useSearch : (currentSession.useSearch || false),
          systemInstruction: activePers.systemInstruction,
          responseLength: globalSettings ? globalSettings.responseLength : "medium",
          textbookText,
          onlyUseTextbook: globalSettings?.onlyUseTextbook ?? false
        })
      });

      if (!response.ok) {
        let errMsg = await parseFetchError(response, `伺服器回應錯誤 (HTTP ${response.status})`);
        throw new Error(errMsg);
      }

      const botPayload = await response.json();

      const assistantMessage: Message = {
        id: `m-bot-${Date.now()}`,
        role: "assistant",
        text: botPayload.text,
        sources: botPayload.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      await updateDoc(doc(db, "users", user.uid, "sessions", activeSessionId), cleanUndefined({
        messages: stripLargeData([...updatedMessages, assistantMessage])
      }));
    } catch (e: any) {
      console.error(e);
      setApiError(e.message || "發生未預期網路錯誤，請重新再試或檢查您的 Secrets 設定。");
    } finally {
      setIsGenerating(false);
    }
  };

  // TTS Actions
  const handleSpeak = async (messageId: string, plainText: string) => {
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    if (!currentSession) return;

    if (speakingMessageId === messageId) {
      handleStopSpeech();
      return;
    }

    try {
      handleStopSpeech();
      setIsSpeechLoading(true);
      setSpeakingMessageId(messageId);

      const response = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: plainText,
          voice: globalSettings?.voiceId || currentSession.voiceId || "Zephyr"
        })
      });

      if (!response.ok) {
        let errMsg = await parseFetchError(response, `伺服器回應錯誤 (HTTP ${response.status})`);
        throw new Error(errMsg);
      }

      const data = await response.json();
      const audioDataUri = `data:audio/wav;base64,${data.audio}`;

      if (audioRef.current) {
        audioRef.current.src = audioDataUri;
        await audioRef.current.play();
      }
    } catch (e: any) {
      console.error("Speech playback error:", e);
      alert(`語音朗讀合成失敗: ${e.message}`);
      setSpeakingMessageId(null);
    } finally {
      setIsSpeechLoading(false);
    }
  };

  const handleStopSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSpeakingMessageId(null);
  };

  // Export current conversation log
  const handleExportChat = (format: "markdown" | "json") => {
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session || session.messages.length === 0) return;

    let blobContent = "";
    let mimeType = "text/plain";
    let extension = "txt";

    if (format === "markdown") {
      mimeType = "text/markdown";
      extension = "md";
      blobContent = `# 對話紀錄: ${session.title}\n匯出時間: ${new Date().toLocaleString()}\n\n`;
      session.messages.forEach((msg) => {
        const actor = msg.role === "user" ? "您" : "智能助理";
        blobContent += `### **${actor}** (${msg.timestamp})\n${msg.text}\n\n`;
        if (msg.sources && msg.sources.length > 0) {
          blobContent += `**網頁基底參考來源:**\n`;
          msg.sources.forEach((s) => {
            blobContent += `- [${s.title}](${s.uri})\n`;
          });
          blobContent += `\n`;
        }
      });
    } else {
      mimeType = "application/json";
      extension = "json";
      blobContent = JSON.stringify(session, null, 2);
    }

    const blob = new Blob([blobContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat_log_${session.title.toLowerCase().replace(/\s+/g, "_")}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Loading Screen Layout
  if (authLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-gemini-bg text-text-main select-none">
        <Sparkles className="w-12 h-12 text-[#9b72cb] animate-pulse mb-4" />
        <div className="flex flex-col items-center gap-2 animate-pulse">
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>正在連接智慧智慧核心...</span>
          </div>
          <p className="text-xs text-gray-500 font-mono">請稍候，正在同步雲端安全通訊...</p>
        </div>
        {/* Force entry button if stuck */}
        <button 
          onClick={() => setAuthLoading(false)}
          className="mt-8 px-4 py-1.5 text-xs text-text-muted border border-border-strong rounded-full hover:bg-gemini-hover transition-colors"
        >
          如果停留過久，請按此強制進入
        </button>
      </div>
    );
  }

  // Not logged in -> Show Login Card Screen
  if (!user) {
    return (
      <LoginScreen
        onSignIn={handleSignIn}
        isLoggingIn={isLoggingIn}
        loginError={loginError}
      />
    );
  }

  // Active configurations
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const activePersonalityId = globalSettings?.personalityId || activeSession?.personalityId || "tutor";
  const activePersonality = PERSONALITIES.find((p) => p.id === activePersonalityId) || PERSONALITIES[0];

  const filteredAdminSessions = allStudentSessions
    .filter((s) => {
      if (!s) return false;
      const q = adminSearchQuery.trim().toLowerCase();
      if (!q) return true;
      const titleMatch = s.title ? s.title.toLowerCase().includes(q) : false;
      const emailMatch = s.ownerEmail ? s.ownerEmail.toLowerCase().includes(q) : false;
      const nameMatch = s.ownerName ? s.ownerName.toLowerCase().includes(q) : false;
      return titleMatch || emailMatch || nameMatch;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

  const selectedStudentSession = allStudentSessions.find((s) => s.id === selectedStudentSessionId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gemini-bg font-sans text-text-main selection:bg-[#4285f4]/35 selection:text-white">
      {/* Sidebar drawer handles histories, tools toggling */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        personalities={PERSONALITIES}
        activePersonalityId={activePersonalityId}
        onChangePersonality={handleChangePersonality}
        useSearch={globalSettings?.useSearch ?? activeSession?.useSearch ?? false}
        onToggleSearch={handleToggleSearch}
        activeVoice={globalSettings?.voiceId ?? activeSession?.voiceId ?? "Zephyr"}
        onChangeVoice={handleChangeVoice}
        responseLength={globalSettings?.responseLength ?? "medium"}
        onChangeResponseLength={handleChangeResponseLength}
        textbooks={textbooks}
        activeTextbookId={globalSettings?.activeTextbookId || "none"}
        onChangeActiveTextbook={handleChangeActiveTextbook}
        activeTextbookIds={globalSettings?.activeTextbookIds || []}
        onToggleTextbook={handleToggleTextbook}
        onlyUseTextbook={globalSettings?.onlyUseTextbook ?? false}
        onToggleOnlyUseTextbook={handleToggleOnlyUseTextbook}
        onUploadTextbooks={handleUploadTextbooks}
        onDeleteTextbook={handleDeleteTextbook}
        onRenameTextbook={handleRenameTextbook}
        isUploadingTextbook={isUploadingTextbook}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        onSignOut={handleSignOut}
        isAdmin={!!isAdmin}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main chat center console */}
      <div className="flex-1 flex flex-col h-full bg-gemini-bg relative min-w-0">
        
        {/* Navigation Toolbar */}
        <header className="h-14 border-b border-border-subtle px-4 flex items-center justify-between shrink-0 bg-gemini-bg/60 backdrop-blur-xl z-2">
          <div className="flex items-center gap-3.5 min-w-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-title transition cursor-pointer"
                title="打開側邊欄"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`p-1.5 rounded-full hidden sm:flex shrink-0 border ${
                  isAdmin 
                    ? activePersonality.color 
                    : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                }`}
              >
                {!isAdmin ? (
                  <GraduationCap className="w-4 h-4" />
                ) : (
                  <>
                    {activePersonality.id === "coder" && <Terminal className="w-4 h-4" />}
                    {activePersonality.id === "general" && <Sparkles className="w-4 h-4" />}
                    {activePersonality.id === "writer" && <PenTool className="w-4 h-4" />}
                    {activePersonality.id === "tutor" && <GraduationCap className="w-4 h-4 text-purple-400" />}
                  </>
                )}
              </div>
              <div className="text-left min-w-0 font-sans">
                <h1 className="text-xs sm:text-sm font-semibold text-text-title truncate animate-fade-in">
                  {activeSession ? activeSession.title : "尚未啟動對話空間"}
                </h1>
                <p className="hidden sm:block text-[9px] text-[#9b72cb] truncate uppercase tracking-widest leading-none mt-0.5">
                  {globalSettings?.activeTextbookIds && globalSettings.activeTextbookIds.length > 0 ? (
                    <span className="text-blue-400 font-bold">
                      📖 研讀講義：{globalSettings.activeTextbookIds.map(id => textbooks.find(b => b.id === id)?.name || "載入中").join(", ")} 
                      {globalSettings.onlyUseTextbook ? " (僅依書本回答限縮)" : ""}
                    </span>
                  ) : globalSettings?.activeTextbookId && globalSettings.activeTextbookId !== "none" ? (
                    <span className="text-blue-400 font-bold">
                      📖 研讀講義：{textbooks.find((b) => b.id === globalSettings.activeTextbookId)?.name || "載入中"} 
                      {globalSettings.onlyUseTextbook ? " (僅依書本回答限縮)" : ""}
                    </span>
                  ) : (
                    isAdmin ? `智能設定: ${activePersonality.name}` : "學術思辨空間"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons on toolbar header (Export, clear) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdminDashboard(!showAdminDashboard)}
                className={`p-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showAdminDashboard 
                    ? "bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/35" 
                    : "bg-[#4285f4]/15 text-[#4285f4] border-[#4285f4]/25 hover:bg-[#4285f4]/25"
                }`}
                title="查看或監控全體學生提問歷程"
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>{showAdminDashboard ? "返回思辨導學" : "學生提問監控"}</span>
              </button>
            )}

            {!showAdminDashboard && activeSession && activeSession.messages.length > 0 && (
              <>
                <button
                  onClick={() => handleExportChat("markdown")}
                  className="p-1.5 md:px-2.5 md:py-1.5 text-xs text-slate-400 hover:text-white rounded-full hover:bg-white/5 flex items-center gap-1 transition-all cursor-pointer"
                  title="匯出對話紀錄為 Markdown"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">匯出對話</span>
                </button>
                <button
                  onClick={() => handleDeleteSession(activeSessionId)}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-full hover:bg-white/5 transition cursor-pointer"
                  title="刪除本日對話空間"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </header>

        {!showAdminDashboard && ((globalSettings?.activeTextbookIds && globalSettings.activeTextbookIds.length > 0) || (globalSettings?.activeTextbookId && globalSettings.activeTextbookId !== "none")) && (
          <div className="bg-[#4285f4]/5 border-b border-[#4285f4]/15 px-4 py-2 flex items-center gap-2 text-[11px] text-[#4285f4] animate-fade-in shrink-0">
            <span className="font-bold flex items-center gap-1 shrink-0 bg-[#4285f4]/15 text-blue-200 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
              📖 課程教材
            </span>
            <span className="truncate text-slate-400">
              已套用講義：<b>{
                globalSettings?.activeTextbookIds && globalSettings.activeTextbookIds.length > 0
                  ? globalSettings.activeTextbookIds.map(id => textbooks.find(b => b.id === id)?.name || "載入中").join("、 ")
                  : (textbooks.find((b) => b.id === globalSettings?.activeTextbookId)?.name || "載入中")
              }</b>
              {globalSettings?.onlyUseTextbook ? "，AI 將「嚴格且僅限」參考這些講義作答。" : "，AI 回答將以這些教材為首要參考脈絡。"}
            </span>
          </div>
        )}

        {showAdminDashboard ? (
          <div className="flex-1 flex overflow-hidden bg-gemini-bg animate-fade-in text-text-main">
            {/* Left sidebar: student session list */}
            <div className="w-80 md:w-96 border-r border-[#1a1c1e] flex flex-col h-full bg-[#1e2022] shrink-0">
              {/* Search and header info */}
              <div className="p-4 border-b border-[#1a1c1e] bg-[#2d2f31]/30 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <GraduationCap className="w-4 h-4 text-purple-400" />
                    <span>學生學習狀況與提問監控</span>
                  </h2>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                    {allStudentSessions.length} 個對話
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    placeholder="搜尋學生姓名、信箱或對話標題..."
                    className="w-full bg-[#131314] border border-[#2d2f31] rounded-xl pl-3 pr-3 py-2 text-xs text-text-main placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
                  />
                </div>
              </div>

              {/* Student sessions scrolling list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {isAdminSessionsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span>正在即時同步全體學生提問紀錄...</span>
                  </div>
                ) : filteredAdminSessions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-sans">
                    {adminSearchQuery ? "找不到符合搜尋條件的對話" : "暫無學生提問紀錄"}
                  </div>
                ) : (
                  filteredAdminSessions.map((session) => {
                    const isSelected = session.id === selectedStudentSessionId;
                    const lastMsg = session.messages && session.messages.length > 0 
                      ? session.messages[session.messages.length - 1] 
                      : null;
                    const count = session.messages ? session.messages.length : 0;
                    return (
                      <div
                        key={session.id}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedStudentSessionId(session.id);
                          }
                        }}
                        onClick={() => setSelectedStudentSessionId(session.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-2 relative group ${
                          isSelected
                            ? "bg-purple-500/15 border-purple-500/40 shadow-sm text-purple-300"
                            : "bg-transparent border-transparent hover:bg-bg-hover text-text-main"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1 flex gap-2 items-center font-sans">
                            {session.ownerPhotoURL ? (
                              <img src={session.ownerPhotoURL} alt="User Avatar" className="w-5 h-5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-[8px] shrink-0">
                                {session.ownerName?.charAt(0) || "U"}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-bold text-slate-300 block truncate tracking-widest leading-none mb-1">
                                {session.ownerName || "自修學生"}
                              </span>
                              <span className="text-[9px] text-[#9b72cb] block truncate leading-none">
                                {session.ownerEmail || "未登錄信箱"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] font-mono select-none px-1.5 py-0.5 rounded-full bg-[#131314] border border-[#2d2f31] font-medium text-slate-400">
                              {count} 則訊息
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdminDeleteSession(session.ownerId, session.id);
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded hover:bg-red-500/10 cursor-pointer"
                              title="刪除對話紀錄"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        <h3 className="text-xs font-semibold text-text-title truncate font-sans">
                          💬 {session.title || "未命名對話"}
                        </h3>
                        
                        {lastMsg && (
                          <p className="text-[10px] text-text-muted truncate line-clamp-1 italic font-sans select-none font-normal">
                            最新：{lastMsg.text}
                          </p>
                        )}
                        
                        <div className="text-[9px] text-text-muted flex items-center justify-between mt-1 font-mono">
                          <span>
                            {session.createdAt 
                              ? `${new Date(session.createdAt).toLocaleDateString([], { month: "2-digit", day: "2-digit" })} ${new Date(session.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` 
                              : "待定"}
                          </span>
                          <span className="text-[#a855f7] font-bold tracking-wider uppercase font-sans text-[8px] bg-purple-500/10 px-1.5 rounded-full">
                            {session.personalityId === "tutor" ? "智慧導學" : session.personalityId === "coder" ? "程式大師" : "一般問答"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right details content details */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gemini-bg relative">
              {selectedStudentSession ? (
                <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                  {/* Selected Session Subheader metadata details */}
                  <div className="p-4 border-b border-[#1a1c1e] bg-[#2d2f31]/10 shrink-0 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="space-y-1 font-sans">
                      <div className="flex items-center gap-2">
                        {selectedStudentSession.ownerPhotoURL ? (
                          <img src={selectedStudentSession.ownerPhotoURL} alt="User Avatar" className="w-6 h-6 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {selectedStudentSession.ownerName?.charAt(0) || "U"}
                          </div>
                        )}
                        <span className="font-bold text-text-title text-sm">{selectedStudentSession.ownerName || "自修學生"}</span>
                        <span className="text-[10px] text-slate-400">({selectedStudentSession.ownerEmail || "無信箱"})</span>
                      </div>
                      <div className="text-[10px] text-purple-300 font-medium font-sans ml-8">
                        學術對話軌跡：<b>{selectedStudentSession.title}</b>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-text-muted select-none">
                      <span>建立時間: {selectedStudentSession.createdAt ? new Date(selectedStudentSession.createdAt).toLocaleString() : "未知"}</span>
                      <span className="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase font-sans text-[9px] tracking-widest font-bold">
                        學徒問答追蹤
                      </span>
                    </div>
                  </div>

                  {/* Message Item log scrolling center container */}
                  <div className="flex-1 overflow-y-auto">
                    {!selectedStudentSession.messages || selectedStudentSession.messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-slate-500 text-xs text-center font-sans">
                        ⚠️ 該對話空間中目前沒有學生成長問答記錄。
                      </div>
                    ) : (
                      selectedStudentSession.messages.map((msg) => (
                        <MessageItem
                          key={msg.id}
                          message={msg}
                          isSpeaking={speakingMessageId === msg.id}
                          isSpeechLoading={isSpeechLoading && speakingMessageId === msg.id}
                          onSpeak={handleSpeak}
                          onStopSpeech={handleStopSpeech}
                          userPhotoUrl={selectedStudentSession.ownerPhotoURL}
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none space-y-4">
                  <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center border border-purple-500/20">
                    <GraduationCap className="w-8 h-8 text-purple-400 animate-pulse animate-bounce" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-sm font-bold text-text-title font-sans">請選擇學生的提問對話紀錄</h3>
                    <p className="text-xs text-text-muted leading-relaxed font-sans">
                      系統已從雲端 Firestore 即時獲取了全體學生的學習提問。請點擊左側學生列表，觀摩他們的學習提問細節與小老師的回應。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Messaging Container */}
            <div
              ref={scrollRef}
          className="flex-1 overflow-y-auto px-1 space-y-2 select-none"
        >
          {activeSession && activeSession.messages.length === 0 && (
            <div className="h-full flex flex-col justify-center max-w-3xl mx-auto py-16 px-6 space-y-12 animate-fade-in select-text">
              {/* Clean text gradient title */}
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] bg-clip-text text-transparent animate-fade-in font-sans">
                    您好，我是您的「智慧小老師」
                  </h1>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-muted select-none">
                    今天有什麼功課或知識想和我一起探索呢？
                  </h1>
                </div>

                {/* Benefits / Good Points Highlight Panel */}
                <div className="bg-gemini-card border border-border-subtle p-5 sm:p-6 rounded-2xl space-y-4 animate-fade-in backdrop-blur-sm shadow-sm select-none">
                  <h3 className="text-xs font-bold uppercase text-[#9b72cb] tracking-wider flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-4 h-4 text-[#9b72cb]" />
                    <span>「智慧小老師」核心功能與亮點特色</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 p-3.5 bg-bg-hover rounded-xl border border-border-subtle/70 transition hover:border-[#4285f4]/30 duration-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm select-none">🎙️</span>
                        <h4 className="font-bold text-text-title text-xs">語音聲控聽寫輸入</h4>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">提供語音聽寫 (STT)，點擊輸入框麥克風圖示即可輕巧完成提問。</p>
                    </div>
                    <div className="space-y-1 p-3.5 bg-bg-hover rounded-xl border border-border-subtle/70 transition hover:border-[#9b72cb]/30 duration-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm select-none">🔊</span>
                        <h4 className="font-bold text-text-title text-xs">高保真語音回應朗讀</h4>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">多款擬真語音回應播報，支援在訊息卡片直接點選朗讀或停止播放。</p>
                    </div>
                    <div className="space-y-1 p-3.5 bg-bg-hover rounded-xl border border-border-subtle/70 transition hover:border-[#d96570]/30 duration-200">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm select-none">📚</span>
                        <h4 className="font-bold text-text-title text-xs">教科書問答與搜尋</h4>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">整合最新網頁搜尋與教材知識庫 (PDF)，帶給您最精準無死角的解答。</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full pt-2">
                {activeSession.useSearch && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-lg text-xs justify-center font-sans tracking-wide">
                    <Globe className="w-4 h-4 shrink-0" />
                    <span>Google 搜尋背景整合：已為您自動載入</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSession?.messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isSpeaking={speakingMessageId === msg.id}
              isSpeechLoading={isSpeechLoading && speakingMessageId === msg.id}
              onSpeak={handleSpeak}
              onStopSpeech={handleStopSpeech}
              userPhotoUrl={user?.photoURL || undefined}
            />
          ))}

          {/* Prompt typing indicator */}
          {isGenerating && (
            <div className="flex w-full gap-4 md:gap-6 py-6 px-4 md:px-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center text-white border border-white/10 animate-pulse">
                <Sparkles className="w-4.5 h-4.5 animate-spin" style={{ animationDuration: "3s" }} />
              </div>
              <div className="flex-1 space-y-2 pt-1 text-left font-sans">
                <div className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase">智慧大腦正在構思回答</div>
                <div className="flex items-center gap-1.5 py-1 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-[#4285f4]" />
                  <span>正在連線搜尋背景並編輯格式...</span>
                </div>
              </div>
            </div>
          )}

          {/* Server API setup errors */}
          {apiError && (
            <div className="mx-4 md:mx-6 mb-4">
              {apiError.includes("Prepayment") || apiError.includes("預付點數") || apiError.includes("429") ? (
                <div className="flex flex-col gap-3 p-5 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-xl text-left shadow-lg animate-fade-in">
                  <div className="flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5 animate-pulse" />
                    <div className="space-y-1 flex-1">
                      <div className="font-bold text-xs uppercase tracking-wider text-amber-400">Google AI Studio 預付點數已耗盡</div>
                      <div className="text-xs leading-relaxed text-slate-300">
                        {apiError}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 items-center justify-start pl-8">
                    <a
                      href="https://ai.studio/projects"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-lg transition-all duration-200 shadow"
                    >
                      💳 前往 Google AI Studio 儲值點數 / 開啟付費帳單
                    </a>
                    <button
                      onClick={() => setApiError(null)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-slate-200 text-xs rounded-lg transition-all"
                    >
                      關閉提示
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 md:gap-4 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-left animate-fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-400 animate-bounce" />
                  <div className="space-y-1">
                    <div className="font-bold text-xs uppercase tracking-wider text-red-400">伺服器連線異常</div>
                    <div className="text-xs leading-relaxed">{apiError}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grounding/Search banner context alert */}
        {activeSession?.useSearch && !isSpeechLoading && (
          <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] md:text-xs font-medium flex items-center justify-center gap-1.5 border-t border-b border-emerald-500/10 font-display">
            <Globe className="w-3.5 h-3.5 animate-pulse text-emerald-400 shrink-0" />
            <span>搜尋基底已啟用。Gemini 將主動整合 Google 網路最新搜尋結果作為回覆事實依據。</span>
          </div>
        )}

        {/* Input area triggers */}
        <div className="p-4 bg-gradient-to-t from-gemini-bg/95 via-gemini-bg to-transparent shrink-0 font-sans">
          <div className="max-w-3xl mx-auto">
            <InputArea
              onSend={handleSendMessage}
              isGenerating={isGenerating}
              activePersonalityName={activePersonality.name}
            />
          </div>
        </div>
      </>
    )}

      </div>
    </div>
  );
}
