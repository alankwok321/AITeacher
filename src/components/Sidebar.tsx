import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  Globe,
  Volume2,
  Settings,
  MessageSquare,
  X,
  LogOut,
  Sparkles,
  BookOpen,
  Upload,
  Book,
  FileText,
  AlertCircle,
  Loader2,
  Sun,
  Moon
} from "lucide-react";
import { ChatSession, ChatPersonality, Textbook } from "../types";
import { motion } from "motion/react";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: (personalityId?: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  personalities: ChatPersonality[];
  activePersonalityId: string;
  onChangePersonality: (id: string) => void;
  useSearch: boolean;
  onToggleSearch: (val: boolean) => void;
  activeVoice: string;
  onChangeVoice: (voice: string) => void;
  responseLength: "short" | "medium" | "long";
  onChangeResponseLength: (val: "short" | "medium" | "long") => void;
  textbooks: Textbook[];
  activeTextbookId: string;
  onChangeActiveTextbook: (id: string) => void;
  activeTextbookIds?: string[];
  onToggleTextbook?: (id: string) => void;
  onlyUseTextbook: boolean;
  onToggleOnlyUseTextbook: (val: boolean) => void;
  onUploadTextbooks: (files: File[]) => Promise<void>;
  onDeleteTextbook: (id: string) => Promise<void>;
  onRenameTextbook?: (id: string, newName: string) => Promise<void>;
  isUploadingTextbook: boolean;
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSignOut: () => void;
  isAdmin: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  personalities,
  activePersonalityId,
  onChangePersonality,
  useSearch,
  onToggleSearch,
  activeVoice,
  onChangeVoice,
  responseLength,
  onChangeResponseLength,
  textbooks,
  activeTextbookId,
  onChangeActiveTextbook,
  activeTextbookIds = [],
  onToggleTextbook,
  onlyUseTextbook,
  onToggleOnlyUseTextbook,
  onUploadTextbooks,
  onDeleteTextbook,
  onRenameTextbook,
  isUploadingTextbook,
  isOpen,
  onClose,
  user,
  onSignOut,
  isAdmin,
  theme,
  onToggleTheme
}: SidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingTextbookId, setEditingTextbookId] = useState<string | null>(null);
  const [editingTextbookName, setEditingTextbookName] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [showTextbookSection, setShowTextbookSection] = useState(true);

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const saveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      saveRename(id);
    }
  };

  const startEditingTextbook = (book: Textbook, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTextbookId(book.id);
    setEditingTextbookName(book.name);
  };

  const saveTextbookRename = async (id: string) => {
    if (editingTextbookName.trim() && onRenameTextbook) {
      await onRenameTextbook(id, editingTextbookName.trim());
    }
    setEditingTextbookId(null);
  };

  const handleTextbookKeyPress = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      saveTextbookRename(id);
    }
  };

  const activePersonality = personalities.find((p) => p.id === activePersonalityId) || personalities[0];

  const userInitials = user?.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "用戶";

  return (
    <div
      className={`h-full flex flex-col bg-gemini-sidebar text-text-main border-r border-border-subtle transition-all duration-300 ${
        isOpen ? "w-[260px] md:w-[280px]" : "w-0 overflow-hidden border-r-0"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <span className="font-sans font-semibold text-base text-text-title tracking-tight">智慧小老師</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden lg:hidden p-1.5 text-slate-400 hover:text-text-title rounded-full hover:bg-bg-hover transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Action Button: New Chat */}
      <div className="px-4 py-3">
        <button
          onClick={() => onCreateSession(activePersonalityId)}
          className="w-full flex items-center gap-3 py-3 px-5 bg-bg-subtle hover:bg-bg-hover active:bg-bg-active border border-border-strong text-xs font-semibold rounded-full text-text-title shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#9b72cb]" />
          <span>開啟新對話</span>
        </button>
      </div>

      {/* Scrollable Middle Viewport containing Histories and Parametric Panels */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col divide-y divide-border-subtle custom-scrollbar">
        
        {/* Chat Sessions List */}
        <div className="px-3 space-y-1 py-3 flex-shrink-0">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500 select-none">
            歷史對話清單
          </div>
          {sessions.length === 0 ? (
            <div className="text-center p-8 text-xs text-slate-500 italic">尚無對話紀錄</div>
          ) : (
            <div className="space-y-0.5">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isEditing = session.id === editingSessionId;

                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`group relative flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs select-none transition-all cursor-pointer ${
                      isActive
                        ? "bg-gemini-hover text-text-title font-medium"
                        : "text-text-muted hover:bg-bg-hover hover:text-text-main"
                    }`}
                    id={`session-item-${session.id}`}
                  >
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#9b72cb]" : "text-text-muted"}`} />

                    {isEditing ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => saveRename(session.id)}
                        onKeyDown={(e) => handleKeyPress(e, session.id)}
                        autoFocus
                        className="flex-grow bg-gemini-bg text-text-title rounded px-1.5 py-0.5 text-xs border border-[#9b72cb] focus:outline-none"
                      />
                    ) : (
                      <span className="flex-grow truncate pr-8">{session.title}</span>
                    )}

                    {/* Rename and Delete Actions */}
                    {!isEditing && (
                      <div className="absolute right-3.5 top-1.5 hidden group-hover:flex items-center gap-1.5 bg-gemini-sidebar md:bg-transparent px-1 rounded-full">
                        <button
                          onClick={(e) => startEditing(session, e)}
                          className="p-1 hover:text-text-title hover:bg-bg-hover rounded-full text-text-muted transition"
                          title="重新命名對話"
                          id={`rename-btn-${session.id}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="p-1 hover:text-red-400 hover:bg-bg-hover rounded-full text-text-muted transition"
                          title="刪除對話"
                          id={`delete-btn-${session.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveRename(session.id);
                        }}
                        className="absolute right-3 p-1 text-emerald-400 hover:bg-bg-hover rounded-full"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Personalities and Configuration Panel Toggle */}
        {isAdmin && (
          <div className="py-3 px-4 space-y-3 bg-bg-subtle">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="w-full flex items-center justify-between text-xs text-text-muted hover:text-text-main py-1.5 cursor-pointer"
              id="bot-config-toggle-btn"
            >
              <div className="flex items-center gap-1.5 font-medium">
                <Settings className="w-4 h-4 text-[#9b72cb]" />
                <span>AI 角色個性與參數</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{showConfig ? "收合" : "展開"}</span>
            </button>

            {/* Configuration settings */}
            {(showConfig || sessions.length === 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3.5 pt-1.5 overflow-hidden text-xs text-text-main"
              >
                {/* Personality choosing selection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <span>角色智能性格</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-bg-hover p-1 rounded-xl transition-all">
                    {personalities.map((pers) => {
                      const isSelected = pers.id === activePersonalityId;
                      return (
                        <button
                          key={pers.id}
                          onClick={() => onChangePersonality(pers.id)}
                          className={
                            isSelected
                              ? "py-1.5 px-2 rounded-lg text-left transition text-[11px] truncate cursor-pointer bg-gradient-to-tr from-[#4285f4] to-[#9b72cb] text-white font-medium shadow"
                              : "py-1.5 px-2 rounded-lg text-left transition text-[11px] truncate cursor-pointer text-text-muted hover:text-text-main hover:bg-bg-hover"
                          }
                          title={`${pers.name}: ${pers.description}`}
                          id={`personality-select-${pers.id}`}
                        >
                          {pers.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Google Search Grounding toggle */}
                <div className="flex items-center justify-between border-t border-border-subtle pt-3">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-title text-[11px]">整合 Google 搜尋</span>
                      <span className="text-[9px] text-text-muted leading-tight">Gemini 將參考最新搜尋結果</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleSearch(!useSearch)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      useSearch ? "bg-[#4285f4]" : "bg-bg-hover"
                    }`}
                    id="search-grounding-toggle"
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        useSearch ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Text to Speech choice */}
                <div className="space-y-1.5 border-t border-border-subtle pt-3">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-semibold text-text-title text-[11px]">TTS 語音回應播報</span>
                  </div>
                  <select
                    value={activeVoice}
                    onChange={(e) => onChangeVoice(e.target.value)}
                    className="w-full bg-gemini-card border border-border-strong rounded-lg px-2.5 py-1.5 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    id="voice-select"
                  >
                    <option value="Zephyr">Zephyr (溫慢平衡)</option>
                    <option value="Kore">Kore (明亮專業)</option>
                    <option value="Puck">Puck (活潑生動)</option>
                    <option value="Charon">Charon (深沉權威)</option>
                    <option value="Fenrir">Fenrir (沉穩敘事)</option>
                  </select>
                </div>

                {/* Response Length choice */}
                <div className="space-y-1.5 border-t border-border-subtle pt-3">
                  <div className="flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span className="font-semibold text-text-title text-[11px]">AI 回應長度控制</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-bg-hover p-1 rounded-xl">
                    {(["short", "medium", "long"] as const).map((len) => {
                      const isSelectedVal = responseLength === len;
                      const lenLabel = len === "short" ? "精簡" : len === "medium" ? "適中" : "詳細";
                      return (
                        <button
                          key={len}
                          type="button"
                          onClick={() => onChangeResponseLength(len)}
                          className={`py-1 rounded-lg text-center transition text-[10px] truncate cursor-pointer uppercase ${
                            isSelectedVal
                              ? "bg-gradient-to-tr from-[#4285f4] to-[#9b72cb] text-white font-medium shadow"
                              : "text-text-muted hover:text-text-main hover:bg-bg-hover"
                          }`}
                          id={`length-select-${len}`}
                        >
                          {lenLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Textbook Configuration Panel (Only Admins can manage/view) */}
        {isAdmin && (
          <div className="py-3 px-4 space-y-3 bg-bg-subtle flex-shrink-0">
            <button
              onClick={() => setShowTextbookSection(!showTextbookSection)}
              className="w-full flex items-center justify-between text-xs text-text-muted hover:text-text-main py-1.5 cursor-pointer"
              id="textbook-config-toggle-btn"
            >
              <div className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-4 h-4 text-[#4285f4]" />
                <span>教科書知識庫設定</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{showTextbookSection ? "收合" : "展開"}</span>
            </button>

            {showTextbookSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-1.5 overflow-hidden text-xs text-text-main"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    選擇研讀教科書 (可複選)
                  </label>
                  
                  {textbooks.length === 0 ? (
                    <div className="text-[11px] text-text-muted bg-bg-subtle/50 px-3 py-2.5 rounded-xl border border-border-subtle text-center">
                      📚 尚未上傳任何教科書
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[160px] overflow-y-auto bg-gemini-card/30 border border-border-subtle rounded-xl p-1.5">
                      {textbooks.map((book) => {
                        const isSelected = activeTextbookIds 
                          ? activeTextbookIds.includes(book.id)
                          : (activeTextbookId === book.id);
                        return (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => {
                              if (onToggleTextbook) {
                                onToggleTextbook(book.id);
                              } else {
                                onChangeActiveTextbook(isSelected ? "none" : book.id);
                              }
                            }}
                            className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs transition-colors duration-200 cursor-pointer ${
                              isSelected 
                                ? "bg-[#4285f4]/10 text-[#4285f4] border border-[#4285f4]/30 font-medium" 
                                : "bg-transparent text-text-main hover:bg-bg-hover border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {/* Custom checkbox box */}
                              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                                isSelected 
                                  ? "bg-[#4285f4] border-[#4285f4] text-white" 
                                  : "border-border-strong bg-gemini-card"
                              }`}>
                                {isSelected && (
                                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                                    <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" fill="white" />
                                  </svg>
                                )}
                              </div>
                              <span className="truncate" title={book.name}>📘 {book.name}</span>
                            </div>
                            <span className="text-[9px] text-text-muted shrink-0 font-mono">
                              {Math.round(book.totalChars / 1000)}k字
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Strict restriction toggle */}
                {((activeTextbookIds && activeTextbookIds.length > 0) || (activeTextbookId && activeTextbookId !== "none")) && (
                  <div className="flex items-center justify-between bg-bg-subtle p-2 rounded-xl border border-border-subtle">
                    <div className="flex items-center gap-1.5 max-w-[70%]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-title text-[11px]">僅限依教科書回答</span>
                        <span className="text-[9px] text-text-muted leading-tight">若問題非書中知識則拒答</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleOnlyUseTextbook(!onlyUseTextbook)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        onlyUseTextbook ? "bg-amber-500" : "bg-bg-hover"
                      }`}
                      id="only-use-textbook-toggle"
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                          onlyUseTextbook ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Quick Access to Google AI Studio Billing and Pricing */}
                <div className="space-y-1.5 border-t border-border-subtle pt-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
                    <span>帳單與點數設定</span>
                  </span>
                  <a
                    href="https://ai.studio/projects"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between bg-bg-subtle hover:bg-bg-hover p-2.5 rounded-xl border border-border-subtle transition group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-1.5 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500/20 transition text-xs">💳</span>
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-text-title text-[11px]">AI Studio 儲值與額度</span>
                        <span className="text-[9px] text-text-muted leading-tight">管理預付帳單與查詢剩餘點數</span>
                      </div>
                    </div>
                    <span className="text-slate-500 group-hover:text-amber-400 font-bold transition text-xs">&rarr;</span>
                  </a>
                </div>

                {/* Admin Upload and Delete Zone */}
                {isAdmin && (
                  <div className="space-y-2 border-t border-border-subtle pt-3">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
                      <span>教學講義管理 (Admin)</span>
                      {isUploadingTextbook && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                    </div>

                    {/* Upload Action */}
                    <label className="flex flex-col items-center justify-center border border-dashed border-border-strong hover:border-blue-500/50 hover:bg-bg-hover rounded-xl p-3 text-center cursor-pointer transition-all duration-200">
                      <Upload className="w-4 h-4 text-slate-400 mb-1" />
                      <span className="text-[11px] text-slate-300 font-semibold">上傳 PDF / 文字講義與教科書</span>
                      <span className="text-[9px] text-text-muted mt-0.5">限制 10MB 以內（支援 PDF、TXT、MD、JSON、CSV 等，將解析為純文字）</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.txt,.md,.json,.csv"
                        disabled={isUploadingTextbook}
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            await onUploadTextbooks(Array.from(files));
                            e.target.value = ""; // Reset
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    {/* Textbooks list with delete */}
                    {textbooks.length > 0 && (
                      <div className="bg-bg-subtle rounded-xl border border-border-subtle divide-y divide-border-subtle max-h-[140px] overflow-y-auto w-full">
                        {textbooks.map((book) => {
                          const isEditingTextbook = editingTextbookId === book.id;
                          return (
                            <div key={book.id} className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-text-main group min-h-[32px]">
                              {isEditingTextbook ? (
                                <input
                                  type="text"
                                  value={editingTextbookName}
                                  onChange={(e) => setEditingTextbookName(e.target.value)}
                                  onBlur={() => saveTextbookRename(book.id)}
                                  onKeyDown={(e) => handleTextbookKeyPress(e, book.id)}
                                  autoFocus
                                  className="flex-grow bg-gemini-bg text-text-title rounded px-1.5 py-0.5 text-[11px] border border-[#9b72cb] focus:outline-none w-full"
                                />
                              ) : (
                                <span className="truncate pr-2 max-w-[80%]" title={book.name}>
                                  {book.name}
                                </span>
                              )}
                              
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                {isEditingTextbook ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveTextbookRename(book.id);
                                    }}
                                    className="p-1 text-emerald-400 hover:bg-bg-hover rounded transition cursor-pointer"
                                    title="儲存"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => startEditingTextbook(book, e)}
                                      className="text-text-muted hover:text-text-title p-1 rounded hover:bg-bg-hover transition cursor-pointer md:opacity-0 group-hover:opacity-100"
                                      title="重新命名"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteTextbook(book.id)}
                                      className="text-text-muted hover:text-red-400 p-1 rounded hover:bg-bg-hover transition cursor-pointer md:opacity-0 group-hover:opacity-100"
                                      title="刪除教科書"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}

      </div>

      {/* User / Foot Profile Card */}
      <div className="p-4 border-t border-border-subtle bg-gemini-bg flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-2.5 min-w-0">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Avatar"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-border-strong"
            />
          ) : (
            <div className="w-8 h-8 bg-bg-subtle text-text-main rounded-full flex items-center justify-center font-bold border border-border-strong select-none">
              {userInitials}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-text-title truncate max-w-[120px]" title={user?.displayName || "用戶"}>
              {user?.displayName || "使用中的使用者"}
            </div>
            <div className="text-[10px] text-text-muted truncate max-w-[120px]" title={user?.email || ""}>
              {user?.email || "安全驗證連線"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Accent-enhanced Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-1 px-1.5 hover:bg-bg-hover rounded-xl text-slate-400 hover:text-amber-400 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center"
            title={theme === "dark" ? "切換至淺色模式 (Light Theme)" : "切換至深色模式 (Dark Theme)"}
            id="theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '12s' }} />
            ) : (
              <Moon className="w-4 h-4 text-[#a855f7]" />
            )}
          </button>
          <button
            onClick={onSignOut}
            className="p-2 hover:text-red-400 hover:bg-bg-hover rounded-full transition cursor-pointer"
            title="登出系統"
            id="logout-btn"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
