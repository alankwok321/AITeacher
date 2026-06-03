import { useState, useRef, useEffect } from "react";
import { Send, Image, X, Loader2, Mic, MicOff } from "lucide-react";

interface InputAreaProps {
  onSend: (text: string, image?: { mimeType: string, data: string }) => void;
  isGenerating: boolean;
  activePersonalityName: string;
}

export default function InputArea({
  onSend,
  isGenerating,
  activePersonalityName
}: InputAreaProps) {
  const [text, setText] = useState("");
  const [imageDraft, setImageDraft] = useState<{ mimeType: string; data: string; file: File } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "zh-TW";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const currentResultIndex = event.resultIndex;
        if (event.results && event.results[currentResultIndex]) {
          const transcript = event.results[currentResultIndex][0].transcript;
          if (event.results[currentResultIndex].isFinal) {
            setText((prev) => prev + transcript);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("您的瀏覽器不支援語音辨識服務。建議使用 Google Chrome 瀏覽器。");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    }
  };

  // Auto resize the textarea as user writes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const processFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        alert("請上傳小於 5MB 的圖片以優化連線速度。");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target?.result as string;
        setImageDraft({
          mimeType: file.type,
          data: base64Data,
          file
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // Check for supported text formats
    const isText =
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".xml") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".tsv") ||
      file.name.endsWith(".html") ||
      file.name.endsWith(".htm") ||
      file.name.endsWith(".js") ||
      file.name.endsWith(".ts") ||
      file.name.endsWith(".tsx") ||
      file.name.endsWith(".css");

    if (isText) {
      if (file.size > 2 * 1024 * 1024) {
        alert("請上傳小於 2MB 的文字檔以利處理。");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        setText((prev) => {
          const separator = prev ? "\n\n" : "";
          return `${prev}${separator}-------- [讀入檔案: ${file.name}] --------\n${fileContent}\n--------------------------------------`;
        });
      };
      reader.readAsText(file, "utf-8");
      return;
    }

    alert("僅支援上傳圖片檔案，或純文字 (.txt, .md, .json, .csv等) 檔案。");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearImageDraft = () => {
    setImageDraft(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (isGenerating) return;
    if (!text.trim() && !imageDraft) return;

    onSend(
      text.trim(),
      imageDraft ? { mimeType: imageDraft.mimeType, data: imageDraft.data } : undefined
    );

    // Reset input states
    setText("");
    clearImageDraft();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Check if anything is typed
  const hasContent = text.trim() || imageDraft;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full border border-border-subtle rounded-3xl bg-gemini-card shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-border-strong ${
        dragActive ? "ring-2 ring-[#4285f4] bg-gemini-card/95" : ""
      }`}
    >
      {/* Drag & Drop Overlay Hint */}
      {dragActive && (
        <div className="absolute inset-0 bg-bg-subtle backdrop-blur-xs rounded-3xl flex items-center justify-center text-xs font-semibold text-[#4285f4] pointer-events-none z-10">
          將圖片或文字檔 (.txt, .md, .json 等) 拖曳至此處附加
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,text/*,.txt,.md,.json,.js,.ts,.tsx,.css,.html,.htm,.csv"
        className="hidden"
      />

      {/* Draft attachment list */}
      {imageDraft && (
        <div className="p-3.5 border-b border-border-subtle flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gemini-bg border border-border-strong">
            <img
              src={imageDraft.data}
              alt="Draft"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <button
              onClick={clearImageDraft}
              className="absolute -top-1 -right-1 p-0.5 bg-black/60 hover:bg-red-500 rounded-full text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-text-main truncate max-w-[200px]">{imageDraft.file.name}</div>
            <div className="text-[10px] text-text-muted font-mono mt-0.5">{(imageDraft.file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
      )}

      {/* Main input trigger row */}
      <div className="p-2 md:p-3 flex items-end gap-2.5 shrink-0 rounded-3xl">
        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating}
          type="button"
          className="p-2.5 hover:text-text-title text-slate-400 rounded-full hover:bg-bg-hover transition disabled:opacity-40 cursor-pointer"
          title="上傳圖片或文字檔案 (Image / Text File)"
        >
          <Image className="w-5 h-5" />
        </button>

        {/* Mic / Speech to Text button */}
        <button
          onClick={toggleListening}
          disabled={isGenerating}
          type="button"
          className={`p-2.5 rounded-full transition cursor-pointer flex items-center justify-center ${
            isListening
              ? "text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse border border-red-500/20"
              : "text-slate-400 hover:text-text-title hover:bg-bg-hover"
          }`}
          title={isListening ? "停止錄音" : "語音輸入 (Speech to Text)"}
        >
          {isListening ? (
            <MicOff className="w-5 h-5 text-red-500" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {/* Text area with adaptive typography color */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyPress}
          placeholder={`與 ${activePersonalityName} 對話...`}
          rows={1}
          className="flex-grow bg-transparent border-0 text-text-title placeholder-slate-500 resize-none max-h-48 py-2 px-1 focus:outline-none focus:ring-0 text-sm md:text-[15px] leading-relaxed font-sans"
        />

        {/* Send Button */}
        <button
          onClick={handleSubmit}
          disabled={isGenerating || !hasContent}
          type="button"
          className={`p-2.5 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
            hasContent
              ? "bg-text-title text-gemini-card hover:scale-105 shadow-md"
              : "bg-bg-subtle text-slate-500 cursor-not-allowed"
          }`}
          title="發送訊息"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
