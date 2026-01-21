"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function TalkContent() {
    const searchParams = useSearchParams();
    const tagsParam = searchParams.get('tags');
    const tarotName = searchParams.get('tarotName');
    const horoscopeName = searchParams.get('horoscope');
    const context = searchParams.get('context'); // saju

    // 상황별 맞춤 첫인사 생성
    const getInitialMessage = () => {
        if (tarotName) {
            return `방금 **'${tarotName}'** 카드를 뽑으셨군요..\n이 카드가 당신의 고민과 어떤 관련이 있을까요? 카드가 주는 메시지에 대해 같이 이야기해봐요.`;
        }
        if (horoscopeName) {
            return `오늘 **${horoscopeName}** 운세는 어떠셨나요?\n별들의 이야기가 마음에 걸린다면, 저에게 조금 더 자세히 들려주세요.`;
        }
        if (context === 'saju') {
            const tags = tagsParam ? tagsParam.split(',') : [];
            const tagStr = tags.length > 0 ? ` [ ${tags.map(t => `#${t}`).join(' ')} ]` : "";
            return `사주 흐름을 보고 오셨군요.${tagStr}\n당신의 타고난 기운과 오늘의 흐름에 대해 더 깊이 이야기해볼까요?`;
        }
        if (tagsParam) {
            return `어서오세요. 오늘의 흐름이 [ ${tagsParam.split(',').map(t => `#${t}`).join(' ')} ] 이군요.\n이 키워드들과 관련해서 마음에 걸리는 게 있다면 천천히 들려주세요.`;
        }
        return "어서오세요. 당신의 이야기를 기다리고 있었어요.\n오늘 마음에 걸리는 게 있다면 천천히 들려주세요.";
    };

    const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
        { role: 'ai', text: getInitialMessage() }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const aiTextBuffer = useRef("");

    // 자동 스크롤
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");

        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);
        aiTextBuffer.current = "";

        try {
            const res = await fetch('/api/talk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages
                })
            });

            if (!res.ok) throw new Error("Network response was not ok");
            if (!res.body) throw new Error("No response body");

            setMessages(prev => [...prev, { role: 'ai', text: "" }]);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: DONE } = await reader.read();
                done = DONE;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    aiTextBuffer.current += chunk;

                    setMessages(prev => {
                        const newHistory = [...prev];
                        const lastIndex = newHistory.length - 1;
                        newHistory[lastIndex] = { role: 'ai', text: aiTextBuffer.current };
                        return newHistory;
                    });
                }
            }

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'ai', text: "죄송합니다. 잠시 연결이 불안정해요. 마음을 가다듬고 다시 말씀해 주시겠어요?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="talkPage" style={{
            minHeight: "100vh",
            background: "#f9f9f7",
            display: "flex",
            flexDirection: "column",
            fontFamily: "inherit",
            position: "relative",
            overflow: "hidden"
        }}>

            {/* 배경: 은은한 오로라 효과 */}
            <div className={`auroraBg ${isLoading ? 'thinking' : ''}`} />

            {/* HEADER */}
            <header style={{
                padding: "20px",
                textAlign: "center",
                position: "sticky",
                top: 0,
                zIndex: 10,
                background: "rgba(249, 249, 247, 0.85)", // 투명도 조절
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid rgba(0,0,0,0.03)"
            }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#2c3e50", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.8 }}>LUMEN Insight</div>
                <Link href="/?returnFrom=talk" style={{
                    position: "absolute",
                    left: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#888",
                    fontSize: "24px",
                    textDecoration: "none",
                    padding: "10px",
                    lineHeight: 0
                }}>
                    &times;
                </Link>
            </header>

            {/* CHAT AREA */}
            <main style={{
                flex: 1,
                padding: "20px 24px 20px", // 상단 여백 원복
                maxWidth: "600px",
                width: "100%",
                margin: "0 auto",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
                paddingBottom: "120px",
                position: "relative",
                zIndex: 1
            }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        alignSelf: msg.role === 'user' ? "flex-end" : "flex-start",
                        maxWidth: "88%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: msg.role === 'user' ? "flex-end" : "flex-start",
                        animation: "fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)"
                    }}>
                        {/* 화자 이름 */}
                        {msg.role === 'ai' && (
                            <div style={{ fontSize: "10px", color: "#aaa", marginBottom: "4px", paddingLeft: "6px", letterSpacing: "0.05em" }}>LUMEN</div>
                        )}

                        {/* 말풍선 */}
                        <div style={{
                            background: msg.role === 'user' ? "#2d3436" : "rgba(255,255,255,0.9)",
                            color: msg.role === 'user' ? "rgba(255,255,255,0.95)" : "#2d3436",
                            padding: "16px 20px",
                            borderRadius: msg.role === 'user' ? "18px 2px 18px 18px" : "2px 18px 18px 18px",
                            boxShadow: msg.role === 'ai' ? "0 4px 20px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)" : "0 4px 15px rgba(45, 52, 54, 0.2)",
                            fontSize: "15px",
                            lineHeight: "1.75",
                            letterSpacing: "0.01em",
                            whiteSpace: "pre-wrap",
                            wordBreak: "keep-all",
                            backdropFilter: msg.role === 'ai' ? "blur(4px)" : "none"
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}

                {/* 로딩 인디케이터 (생각하는 루멘 Orb) */}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div style={{
                        alignSelf: "flex-start",
                        padding: "10px 0",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        animation: "fadeIn 0.5s ease"
                    }}>
                        <div className="lumenOrb thinking-small">
                            <div className="orbCore" />
                            <div className="orbGlow" />
                        </div>
                        <span style={{ fontSize: "13px", color: "#888", letterSpacing: "0.05em" }}>
                            LUMEN이 깊이 생각하고 있습니다...
                        </span>
                    </div>
                )}

                <div ref={bottomRef} />
            </main>

            {/* INPUT AREA */}
            <footer style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(20px)",
                borderTop: "1px solid rgba(0,0,0,0.05)",
                padding: "16px 20px 24px",
                zIndex: 20
            }}>
                <div style={{ maxWidth: "600px", margin: "0 auto", position: "relative" }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                        placeholder="마음 속 이야기를 건네보세요..."
                        disabled={isLoading}
                        style={{
                            width: "100%",
                            padding: "16px 54px 16px 22px",
                            borderRadius: "28px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            fontSize: "15px",
                            outline: "none",
                            background: "rgba(255,255,255,0.9)",
                            color: "#333",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                            transition: "all 0.3s",
                            fontFamily: "inherit"
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        style={{
                            position: "absolute",
                            right: "6px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: isLoading || !input.trim() ? "transparent" : "#2d3436",
                            color: isLoading || !input.trim() ? "#ccc" : "#fff",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                            transition: "all 0.3s"
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5"></line>
                            <polyline points="5 12 12 5 19 12"></polyline>
                        </svg>
                    </button>
                </div>
            </footer>

            {/* Styles & Animations */}
            <style jsx>{`
        /* 배경 오로라 */
        .auroraBg {
          position: fixed;
          top: -20%;
          left: -20%;
          right: -20%;
          bottom: -20%;
          background: radial-gradient(circle at 50% 30%, rgba(200, 210, 255, 0.4), transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(255, 230, 200, 0.3), transparent 40%);
          filter: blur(60px);
          z-index: 0;
          opacity: 0.6;
          transition: all 2s ease;
        }
        .auroraBg.thinking {
          opacity: 0.8;
          transform: scale(1.1);
          filter: blur(50px) hue-rotate(15deg);
        }

        /* LUMEN ORB (본체) */
        .lumenOrb {
          width: 60px;
          height: 60px;
          position: relative;
          transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        /* 채팅창 내 작은 생각 모드 */
        .lumenOrb.thinking-small {
          width: 30px;
          height: 30px;
        }
        .lumenOrb.thinking-small .orbCore {
          background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
          animation: orbThink 1.5s linear infinite; /* 조금 더 빠르게 */
          box-shadow: 0 0 15px rgba(142, 197, 252, 0.5);
        }
        .lumenOrb.thinking-small .orbGlow {
          inset: -8px; /* 글로우 범위 축소 */
          background: radial-gradient(circle, rgba(142, 197, 252, 0.4) 0%, transparent 70%);
          animation: glowPulse 1s ease-in-out infinite alternate;
        }
        
        .orbCore {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #fff 0%, #e2e8ff 100%);
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(255,255,255,0.8), inset 0 0 10px rgba(255,255,255,1);
          z-index: 2;
        }
        
        .orbGlow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(100, 150, 255, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          z-index: 1;
        }

        /* 상태별 애니메이션 */
        .lumenOrb.breathing .orbCore {
          animation: orbBreath 4s ease-in-out infinite;
        }
        .lumenOrb.breathing .orbGlow {
          animation: glowPulse 4s ease-in-out infinite alternate;
        }

        .lumenOrb.thinking {
          width: 70px;
          height: 70px;
        }
        .lumenOrb.thinking .orbCore {
          background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
          animation: orbThink 2s linear infinite;
          box-shadow: 0 0 30px rgba(142, 197, 252, 0.6);
        }
        .lumenOrb.thinking .orbGlow {
          background: radial-gradient(circle, rgba(142, 197, 252, 0.4) 0%, transparent 70%);
          animation: glowPulse 1s ease-in-out infinite alternate;
        }

        /* 키프레임 */
        @keyframes orbBreath {
          0%, 100% { transform: scale(0.95); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 25px rgba(255,255,255,0.9); }
        }
        @keyframes glowPulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.2); opacity: 0.8; }
        }
        @keyframes orbThink {
          0% { transform: rotate(0deg) scale(0.95); }
          50% { transform: rotate(180deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(0.95); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); } 
          50% { transform: translateY(-3px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

export default function TalkPage() {
    return (
        <Suspense fallback={<div></div>}>
            <TalkContent />
        </Suspense>
    );
}
