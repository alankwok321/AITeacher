import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Globe,
  CornerDownRight,
  Sparkles,
  Loader2
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Message } from "../types";

interface MessageItemProps {
  message: Message;
  isSpeaking: boolean;
  isSpeechLoading: boolean;
  onSpeak: (messageId: string, text: string) => void;
  onStopSpeech: () => void;
  userPhotoUrl?: string;
}

export default function MessageItem({
  message,
  isSpeaking,
  isSpeechLoading,
  onSpeak,
  onStopSpeech,
  userPhotoUrl
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanTextForSpeech = (rawText: string) => {
    // Strip markdown constructs for cleaner TTS reading
    return rawText
      .replace(/[*#_`~]/g, "") // strip markdown basic signs
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // strip links
      .replace(/&/g, "對") // common symbols transcription
      .replace(/<[^>]*>/g, ""); // strip HTML tags if any
  };

  const handleSpeakClick = () => {
    if (isSpeaking) {
      onStopSpeech();
    } else {
      onSpeak(message.id, cleanTextForSpeech(message.text));
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className="group flex w-full gap-4 md:gap-6 py-6 px-4 md:px-6 transition-all border-b border-border-subtle hover:bg-bg-subtle"
    >
      {/* Mentor/User Icon */}
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          userPhotoUrl ? (
            <img src={userPhotoUrl} alt="User avatar" className="w-8 h-8 rounded-full border border-border-strong object-cover select-none" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-bg-subtle border border-border-strong flex items-center justify-center font-bold text-xs text-text-main select-none">
              您
            </div>
          )
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center text-white shadow-sm border border-border-strong">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
        )}
      </div>

      {/* Message Content Area */}
      <div className="flex-1 space-y-3 min-w-0 text-left">
        {/* Author Label */}
        <div className="flex items-center gap-2 text-[11px] text-text-muted font-sans">
          <span className="font-semibold text-text-title">
            {isUser ? "您的問題" : "智慧小老師回答"}
          </span>
          <span>•</span>
          <span className="font-mono text-[10px]">{message.timestamp}</span>
        </div>

        {/* Uploaded attachments if any */}
        {message.image && (
          <div className="flex justify-start">
            <div className="relative max-w-sm rounded-xl overflow-hidden border border-border-subtle shadow-lg bg-gemini-panel">
              <img
                src={`data:${message.image.mimeType};base64,${message.image.data}`}
                alt="Image attachment"
                referrerPolicy="no-referrer"
                className="max-h-56 object-contain transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[9px] text-slate-300 px-2 py-0.5 rounded-full font-mono border border-border-subtle">
                {message.image.mimeType.split("/")[1].toUpperCase()}
              </div>
            </div>
          </div>
        )}

        {/* Message prose markdown body */}
        <div className="text-text-main leading-relaxed break-words font-sans selection:bg-[#4285f4]/30 selection:text-white">
          <div className="markdown-body select-text">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{message.text}</ReactMarkdown>
          </div>
        </div>

        {/* Grounding web resources / citation dividers */}
        {message.sources && message.sources.length > 0 && (
          <div className="pt-4 border-t border-border-subtle space-y-2 mt-4">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase text-text-muted">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>網頁基底參考來源</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10 transition-all font-sans duration-200"
                >
                  <CornerDownRight className="w-3 h-3 text-emerald-400" />
                  <span className="max-w-[180px] truncate">{source.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Hover elements & utilities bar */}
        <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Copy text action button */}
          <button
            onClick={handleCopy}
            className="p-1 px-2.5 text-[10px] text-text-muted hover:text-text-title rounded-full hover:bg-bg-hover border border-border-strong flex items-center gap-1 transition-all cursor-pointer font-sans"
            title="複製訊息全文"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold font-sans">已複製</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>複製</span>
              </>
            )}
          </button>

          {/* TTS trigger button */}
          {!isUser && (
            <button
              onClick={handleSpeakClick}
              disabled={isSpeechLoading}
              className={`p-1 px-2.5 text-[10px] text-text-main hover:text-text-title hover:bg-bg-hover border border-border-strong flex items-center gap-1 transition-all cursor-pointer font-sans ${
                isSpeaking ? "bg-[#4285f4]/15 text-[#4285f4] hover:bg-[#4285f4]/25 border-[#4285f4]/20 font-medium" : ""
              }`}
              title={isSpeaking ? "停止播放" : "語音朗讀"}
            >
              {isSpeechLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                  <span className="text-purple-400">語音合成中...</span>
                </>
              ) : isSpeaking ? (
                <>
                  <VolumeX className="w-3 h-3 text-[#4285f4]" />
                  <span className="text-[#4285f4]">停止</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3" />
                  <span>朗讀</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
