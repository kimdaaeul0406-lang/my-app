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

    useEffect(() => {
        // iOS 체크
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;

        // 이미 앱으로 설치됨
        if (isInStandaloneMode) {
            return;
        }

        // 이미 배너를 닫은 적이 있는지 확인
        const dismissed = localStorage.getItem("pwa-banner-dismissed");
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            // 7일 이내면 표시하지 않음
            if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
                return;
            }
        }

        // 🆕 첫 방문이면 표시하지 않고, 서비스 이용 기록이 있을 때만 표시
        // lumen_history_v2 키에 기록이 있거나, lumen_used 플래그가 있으면 표시
        const hasUsedService = localStorage.getItem("lumen_history_v2") || localStorage.getItem("lumen_used");
        if (!hasUsedService) {
            // 서비스 미이용자에게는 15초 후에 표시 (충분한 탐색 시간 제공)
            // 그래도 첫 방문자에게는 방해가 될 수 있으므로 조건 완화
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
            // Android/Chrome: beforeinstallprompt 이벤트 감지
            const handler = (e: Event) => {
                e.preventDefault();
                setDeferredPrompt(e as BeforeInstallPromptEvent);
                // 5초 후에 배너 표시 (서비스 이용자)
                setTimeout(() => setShowBanner(true), 5000);
            };

            window.addEventListener("beforeinstallprompt", handler);
            return () => window.removeEventListener("beforeinstallprompt", handler);
        }
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === "accepted") {
                setShowBanner(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
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
                    🌙
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        LUMEN 앱 설치하기
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.4 }}>
                        {isIOS
                            ? "홈 화면에 추가하여 앱처럼 사용하세요"
                            : "홈 화면에 추가하여 더 빠르게 접속하세요"}
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

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                {isIOS ? (
                    <div
                        style={{
                            flex: 1,
                            fontSize: 11,
                            opacity: 0.7,
                            lineHeight: 1.5,
                        }}
                    >
                        Safari 하단의 <strong>공유 버튼</strong> → <strong>홈 화면에 추가</strong>를 눌러주세요
                    </div>
                ) : (
                    <>
                        <button
                            onClick={handleDismiss}
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
                            나중에
                        </button>
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
                    </>
                )}
            </div>
        </div>
    );
}
