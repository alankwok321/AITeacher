import { Bot, LogIn, Loader2, Sparkles, Terminal, PenTool, GraduationCap } from "lucide-react";

interface LoginScreenProps {
  onSignIn: () => void;
  isLoggingIn: boolean;
  loginError: string | null;
}

export default function LoginScreen({
  onSignIn,
  isLoggingIn,
  loginError
}: LoginScreenProps) {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gemini-bg text-text-main font-sans p-4 relative overflow-hidden select-none">
      {/* Dynamic ambient backgrounds resembling Gemini's aurora/glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#4285f4]/15 via-[#9b72cb]/10 to-transparent blur-3xl pointer-events-none animate-gemini-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#d96570]/10 via-[#9b72cb]/12 to-transparent blur-3xl pointer-events-none animate-gemini-glow" style={{ animationDelay: "-3s" }} />

      {/* Login Card */}
      <div className="relative w-full max-w-md bg-gemini-card/90 backdrop-blur-xl border border-border-subtle p-8 rounded-2xl shadow-2xl text-center space-y-8 z-10 animate-fade-in">
        
        {/* Brand Header */}
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-purple-500/10 transition-all hover:scale-105 duration-300">
            {/* Elegant Sparkles Icon as the main Gemini star */}
            <GraduationCap className="w-9 h-9 animate-pulse text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-title font-sans">
              智慧小老師
            </h1>
            <p className="text-text-muted text-xs sm:text-sm">
              智慧課業啟發導學 • 多教材研讀協同增強 • 雙多模態學習
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid - Detailing actual advantages of this app */}
        <div className="grid grid-cols-2 gap-3 text-left py-4 text-xs text-text-main border-t border-b border-border-subtle">
          <div className="flex gap-2 items-start p-1.5 hover:bg-bg-hover rounded-lg transition col-span-2">
            <GraduationCap className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-text-title">啟發式導學 (Socratic Tutor)</div>
              <div className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                不直接餵養標準答案！而是扮演「智慧小老師」策略提問，運用豐富譬喻與漸進引導，建立批判思考與理解力。
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-start p-1.5 hover:bg-bg-hover rounded-lg transition">
            <Sparkles className="w-4 h-4 text-[#4285f4] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-text-title">多講義精準對位</div>
              <div className="text-[10px] text-text-muted mt-0.5 leading-normal">
                支援同時勾選、研讀多本自訂教材 (PDF/TXT/MD 等)，精確對齊。
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-start p-1.5 hover:bg-bg-hover rounded-lg transition">
            <PenTool className="w-4 h-4 text-[#d96570] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-text-title">雙模式多模態</div>
              <div className="text-[10px] text-text-muted mt-0.5 leading-normal">
                結合圖片(算式/圖表)與文字檔，全方位提供即時解答和拆解。
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="space-y-4">
          <button
            onClick={onSignIn}
            disabled={isLoggingIn}
            className="w-full h-11 bg-text-title text-gemini-card font-medium text-sm rounded-full flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer disabled:opacity-50 font-sans hover:brightness-110 active:scale-98"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gemini-card" />
                <span>正在登入安全帳戶...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4.5 h-4.5 text-gemini-card" />
                <span>使用 Google 帳戶登入</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-text-muted max-w-[280px] mx-auto leading-relaxed">
            採用 Firebase 儲存與認證協定，雲端對話資料均獲得高強度安全性保護。
          </p>
        </div>

        {/* Error State display */}
        {loginError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs text-left">
            <strong>登入失敗：</strong>{loginError}
          </div>
        )}

      </div>
    </div>
  );
}
