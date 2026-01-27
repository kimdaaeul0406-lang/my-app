"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [dismissFor7Days, setDismissFor7Days] = useState(false);

    useEffect(() => {
        // 세션 ID 생성/로드
        let session = localStorage.getItem("lumen_session_id");
        if (!session) {
            session = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            localStorage.setItem("lumen_session_id", session);
        }
        setSessionId(session);

        // iOS 체크
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;

        // 이미 앱으로 설치됨
        if (isInStandaloneMode) {
            return;
        }

        // DB에서 배너 표시 여부 확인
        const checkBannerStatus = async () => {
            if (!session) return;

            const runLoadBanner = () => {
                loadBanner();
            };

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                const response = await fetch(
                    `/api/pwa-banner?sessionId=${encodeURIComponent(session)}`,
                    { signal: controller.signal }
                );
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && !data.showBanner) {
                        return;
                    }
                }
            } catch (error) {
                if ((error as Error)?.name !== "AbortError") {
                    console.warn("Failed to check banner status from DB:", error);
                }
            }

            runLoadBanner();
        };

        const loadBanner = () => {

            // 🆕 첫 방문이면 표시하지 않고, 서비스 이용 기록이 있을 때만 표시
            // lumen_history_v2 키에 기록이 있거나, lumen_used 플래그가 있으면 표시
            const hasUsedService = localStorage.getItem("lumen_history_v2") || localStorage.getItem("lumen_used");
            if (!hasUsedService) {
                // 서비스 미이용자에게는 15초 후에 표시 (충분한 탐색 시간 제공)
                const timer = setTimeout(() => {
                    // 다시 확인 (사용자가 그 사이에 서비스를 이용했을 수 있음)
                    const usedNow = localStorage.getItem("lumen_history_v2") || localStorage.getItem("lumen_used");
                    if (usedNow) {
                        if (isIOSDevice) {
                            setIsIOS(true);
                        }
                        setShowBanner(true);
                    }
                }, 15000);
                return () => clearTimeout(timer);
            }

            if (isIOSDevice) {
                setIsIOS(true);
                // iOS는 5초 후에 배너 표시 (서비스 이용자)
                setTimeout(() => setShowBanner(true), 5000);
            } else {
                let hasPrompt = false;
                
                // Android/Chrome/PC: beforeinstallprompt 이벤트 감지
                const handler = (e: Event) => {
                    e.preventDefault();
                    setDeferredPrompt(e as BeforeInstallPromptEvent);
                    hasPrompt = true;
                    // 5초 후에 배너 표시 (서비스 이용자)
                    setTimeout(() => setShowBanner(true), 5000);
                };

                window.addEventListener("beforeinstallprompt", handler);
                
                // PC에서도 beforeinstallprompt가 없을 수 있으므로, 서비스 이용자에게는 일정 시간 후 표시
                const fallbackTimer = setTimeout(() => {
                    // beforeinstallprompt가 발생하지 않았지만 서비스를 이용한 경우에도 배너 표시
                    if (!hasPrompt && hasUsedService) {
                        setShowBanner(true);
                    }
                }, 5000);
                
                return () => {
                    window.removeEventListener("beforeinstallprompt", handler);
                    clearTimeout(fallbackTimer);
                };
            }
        };

        checkBannerStatus();
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setShowBanner(false);
            }
            setDeferredPrompt(null);
        } else {
            // PC에서 beforeinstallprompt가 없는 경우, 브라우저 설치 안내
            // Chrome/Edge: 주소창의 설치 아이콘 클릭 안내
            alert("브라우저 주소창의 설치 아이콘을 클릭하여 설치할 수 있습니다.");
        }
    };

    const handleDismiss = async () => {
        // X 버튼: 이번에만 닫기 (DB 저장 안 함, 새로고침하면 다시 나옴)
        setShowBanner(false);
        
        // DB에 저장하지 않음 (새로고침하면 다시 표시)
    };

    const handleDismissFor7Days = async () => {
        // "7일 동안 안 보기" 체크박스가 체크되어 있을 때만 DB에 저장
        if (!sessionId) {
            setShowBanner(false);
            return;
        }

        if (dismissFor7Days) {
            // DB에 7일 동안 안 보이게 저장
            try {
                await fetch("/api/pwa-banner", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        dismissFor7Days: true,
                    }),
                });
            } catch (error) {
                console.warn("Failed to save banner dismiss to DB:", error);
            }
        }
        
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div
            style={{
                position: "fixed",
                bottom: 80,
                left: 16,
                right: 16,
                maxWidth: 360,
                margin: "0 auto",
                background: "var(--navy-dark)",
                color: "var(--cream)",
                borderRadius: 16,
                padding: 16,
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                zIndex: 1000,
                animation: "fadeSlideUp 0.4s ease-out",
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "linear-gradient(135deg, var(--gold-bright), var(--gold-main))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        flexShrink: 0,
                    }}
                >
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        LUMEN 앱 설치하기
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.4 }}>
                        {isIOS
                            ? "홈 화면에 추가하여 앱처럼 사용하세요"
                            : typeof window !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                            ? "홈 화면에 추가하여 더 빠르게 접속하세요"
                            : "브라우저에 설치하여 더 빠르게 접속하세요"}
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--cream)",
                        opacity: 0.6,
                        cursor: "pointer",
                        fontSize: 20,
                        padding: 4,
                    }}
                    aria-label="닫기"
                >
                    ×
                </button>
            </div>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {/* 설치 방법 설명 */}
                <div
                    style={{
                        fontSize: 11,
                        opacity: 0.7,
                        lineHeight: 1.5,
                        marginBottom: 4,
                    }}
                >
                    {isIOS ? (
                        <>Safari 하단의 <strong>공유 버튼</strong> → <strong>홈 화면에 추가</strong>를 눌러주세요</>
                    ) : typeof window !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                        <>설치하기 버튼을 누르거나, Chrome 메뉴 → <strong>홈 화면에 추가</strong>를 눌러주세요</>
                    ) : (
                        <>설치하기 버튼을 누르거나, 브라우저 주소창의 <strong>설치 아이콘</strong>을 클릭해주세요</>
                    )}
                </div>

                {/* 7일 동안 안 보기 체크박스 */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, opacity: 0.9 }}>
                    <input
                        type="checkbox"
                        checked={dismissFor7Days}
                        onChange={(e) => setDismissFor7Days(e.target.checked)}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    <span>7일 동안 안 보기</span>
                </label>

                {/* 버튼들 */}
                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={handleDismissFor7Days}
                        style={{
                            flex: 1,
                            padding: "10px 16px",
                            background: "rgba(255,255,255,0.1)",
                            border: "none",
                            borderRadius: 8,
                            color: "var(--cream)",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        닫기
                    </button>
                    {!isIOS && (
                        <button
                            onClick={handleInstall}
                            style={{
                                flex: 1,
                                padding: "10px 16px",
                                background: "linear-gradient(135deg, var(--gold-bright), var(--gold-main))",
                                border: "none",
                                borderRadius: 8,
                                color: "var(--navy-dark)",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            설치하기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
