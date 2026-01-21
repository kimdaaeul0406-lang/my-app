"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PWAInstallBanner from "./components/PWAInstallBanner";
import EmailInputModal from "./components/EmailInputModal";
import SearchParamsHandler from "./components/SearchParamsHandler";


// 사주 아이콘 SVG 컴포넌트
function SajuIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.34 6.34L8.93 8.93M15.07 15.07L17.66 17.66M17.66 6.34L15.07 8.93M8.93 15.07L6.34 17.66" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 타로 아이콘 SVG 컴포넌트
function TarotIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
      <rect x="4" y="6" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M8 10H16M8 14H16M8 18H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
    </svg>
  );
}

// 별자리 아이콘 SVG 컴포넌트 (간단한 버전)
function ZodiacIconSmall({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 4V12M12 12V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 12H12M12 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

type ModalType = "tarot" | null;

type Review = { name: string; text: string };

type HistoryItem = {
  id: string;
  type: "SAJU" | "TAROT" | "ZODIAC";
  title: string;
  text: string;
  tags: string[];
  createdAt: number;
  isPremium?: boolean;
};

const HISTORY_KEY = "lumen_history_v2";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatKoreanDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(
    d.getDate()
  )} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function Page() {
  const router = useRouter();
  const flowRef = useRef<HTMLElement | null>(null);
  const subscribeRef = useRef<HTMLElement | null>(null);
  const historyRef = useRef<HTMLElement | null>(null);

  const [modal, setModal] = useState<ModalType>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [pendingSaveItem, setPendingSaveItem] = useState<HistoryItem | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  // 타자기 효과를 위한 상태
  const [typedText, setTypedText] = useState("");
  const heroTitleText = "오늘,\n당신의 흐름은\n어디로 가고 있나요?";
  const [typingStarted, setTypingStarted] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);

  // 별 위치와 애니메이션을 고정 (리렌더링 시 재생성 방지)
  const starsData = useMemo(() => {
    return Array.from({ length: 35 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2,
    }));
  }, []);

  // 클라이언트 마운트 확인 (Hydration 오류 방지)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 타자기 효과 애니메이션
  useEffect(() => {
    if (!isMounted) return;

    // 바로 타이핑 시작
    const startDelay = setTimeout(() => {
      setTypingStarted(true);
      setTypedText("");
    }, 100);

    return () => clearTimeout(startDelay);
  }, [isMounted]);

  useEffect(() => {
    if (!typingStarted) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex < heroTitleText.length) {
        setTypedText(heroTitleText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setTypingComplete(true);
      }
    }, 80); // 각 글자마다 80ms 간격

    return () => clearInterval(typingInterval);
  }, [typingStarted, heroTitleText]);

  // 맨 위로 가기 버튼 표시 상태
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 스크롤 위치 감지
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reveal
  useEffect(() => {
    // 페이지 로드 시 최상단으로 스크롤
    window.scrollTo(0, 0);

    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) (e.target as HTMLElement).classList.add("on");
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // 오늘의 흐름(데모)
  const todayFlow = useMemo(() => {
    const items = [
      {
        kicker: "TODAY FLOW",
        statement: "오늘은 결론보다 '정리'가 먼저인 날이에요.",
        desc: "급하게 답을 찾기보다, 마음의 순서를 정돈하면 흐름이 편해져요.",
        tags: ["정리", "호흡", "선택"],
      },
      {
        kicker: "TODAY FLOW",
        statement: "오늘은 '확신'보다 '감각'을 믿는 편이 좋아요.",
        desc: "작은 신호를 놓치지 않으면, 방향이 자연스럽게 잡혀요.",
        tags: ["직감", "흐름", "균형"],
      },
      {
        kicker: "TODAY FLOW",
        statement: "오늘은 작은 용기가 큰 방향을 바꿔요.",
        desc: "완벽한 준비보다, 한 걸음이 흐름을 열어줘요.",
        tags: ["용기", "시작", "집중"],
      },
    ];
    // 날짜 기반으로 고정된 인덱스 생성 (서버/클라이언트 동일, Hydration 오류 방지)
    const today = new Date();
    const dayIndex = today.getDate() % items.length;
    return items[dayIndex];
  }, []);

  // 리뷰(지그재그)
  const reviews: Review[] = [
    {
      name: "김민지",
      text: "과장된 말이 아니라 정리해주는 느낌이라 좋았어요. 마음이 덜 흔들려요.",
    },
    {
      name: "이수현",
      text: "아침에 확인하면 하루의 방향이 잡혀요. 문장이 짧고 정확해서 부담이 없어요.",
    },
    {
      name: "박지훈",
      text: "괜히 불안하게 만드는 표현이 없어서 마음이 편해요. 계속 보게 돼요.",
    },
    {
      name: "최서연",
      text: "톤이 고요해서 좋고, 결과가 딱 필요한 만큼만 있어서 믿음이 가요.",
    },
    {
      name: "정다은",
      text: "매일 아침 확인하는 게 습관이 됐어요. 하루를 시작하는 마음가짐이 달라져요.",
    },
    {
      name: "윤태영",
      text: "불필요한 걱정을 줄여주고, 실용적인 조언만 주는 게 좋아요.",
    },
  ];

  // 구독
  const [subscribeEmailModalOpen, setSubscribeEmailModalOpen] = useState(false);

  const handleSubscribeEmail = async (email: string, saveEmail: boolean) => {
    if (!sessionId) {
      showToast("세션이 없어요. 페이지를 새로고침해주세요.");
      return;
    }

    try {
      // DB에 세션별 이메일 저장 (이메일 저장하기를 선택한 경우)
      if (saveEmail) {
        try {
          const saveResponse = await fetch("/api/user-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId: sessionId,
              email: email,
              saveEmail: true,
            }),
          });
          if (!saveResponse.ok) {
            console.warn("Failed to save email to DB (non-critical):", await saveResponse.json().catch(() => ({})));
          } else {
            setUserEmail(email);
          }
        } catch (error) {
          console.warn("Failed to save email to DB (non-critical):", error);
        }
      }

      // subscribers 테이블에 저장 (구독 처리)
      const subscriberResponse = await fetch("/api/subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      if (!subscriberResponse.ok) {
        const errorData = await subscriberResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || "구독 저장에 실패했어요";
        console.error("Subscribe API error:", errorData);
        throw new Error(errorMessage);
      }

      // 성공
      showToast("구독이 완료되었어요! 매일 아침 이메일을 확인해주세요.");
      setSubscribeEmailModalOpen(false);

      // 외부 페이지로 리다이렉트하지 않음 - 내부에서 처리 완료
    } catch (error) {
      console.error("Subscribe error:", error);
      const errorMessage = error instanceof Error ? error.message : "구독에 실패했어요";
      showToast(errorMessage);
      // 에러가 발생해도 모달은 열어둠 (사용자가 재시도할 수 있도록)
    }
  };

  // 기록
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 세션 ID 생성/로드
  useEffect(() => {
    let session = localStorage.getItem("lumen_session_id");
    if (!session) {
      session = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem("lumen_session_id", session);
    }
    setSessionId(session);

    // DB에서 세션별 이메일 로드
    if (session) {
      loadUserEmailFromDB(session);
    }
  }, []);

  // DB에서 세션별 이메일 로드
  const loadUserEmailFromDB = async (session: string) => {
    try {
      const response = await fetch(`/api/user-email?sessionId=${encodeURIComponent(session)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Failed to load user email from DB:", errorData.error || "Unknown error");
        // 이메일 로드 실패는 이메일 전송을 막지 않음 (단순히 저장된 이메일이 없는 것)
        // localStorage에서 로드 (하위 호환성)
        try {
          const raw = localStorage.getItem(HISTORY_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw) as HistoryItem[];
          setHistory(Array.isArray(parsed) ? parsed : []);
        } catch {
          /* ignore */
        }
        return;
      }
      const data = await response.json();
      if (data.success && data.email && data.saveEmail) {
        // 이메일이 저장되어 있으면 사용
        setUserEmail(data.email);
        // DB에서 히스토리 로드
        loadHistoryFromDB(data.email);
      } else {
        // 이메일이 저장되지 않았으면 localStorage에서 로드 (하위 호환성)
        try {
          const raw = localStorage.getItem(HISTORY_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw) as HistoryItem[];
          setHistory(Array.isArray(parsed) ? parsed : []);
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      console.warn("Error loading user email from DB (non-critical):", error);
      // 에러가 발생해도 이메일 전송은 계속 가능하도록 함
    }
  };

  // DB에서 히스토리 로드
  const loadHistoryFromDB = async (email: string) => {
    try {
      const response = await fetch(`/api/readings?email=${encodeURIComponent(email)}`);
      if (!response.ok) {
        console.error("Failed to load history from DB");
        return;
      }
      const data = await response.json();
      if (data.success && data.readings) {
        setHistory(data.readings);
      }
    } catch (error) {
      console.error("Error loading history from DB:", error);
    }
  };

  // 저장 후 히스토리 섹션으로 스크롤 (SearchParamsHandler에서 호출)
  const handleSavedParam = useCallback((saved: string) => {
    setTimeout(() => {
      scrollTo(historyRef);
      if (saved === "tarot") {
        showToast("타로 결과를 기록에 저장했어");
      } else if (saved === "zodiac") {
        showToast("별자리 결과를 기록에 저장했어");
      } else if (saved === "saju") {
        showToast("사주 결과를 기록에 저장했어");
      }
    }, 100);
  }, []);

  // 이메일 전송 (기록 저장은 선택적)
  const handleSendEmail = async (email: string, saveToHistory: boolean, saveEmail: boolean, item?: HistoryItem) => {
    const itemToSend = item || pendingSaveItem;
    if (!itemToSend || !sessionId) return;

    // DB에 세션별 이메일 저장 (이메일 저장하기를 선택한 경우)
    // 실패해도 이메일 전송은 계속 진행
    if (saveEmail) {
      try {
        const saveResponse = await fetch("/api/user-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: sessionId,
            email: email,
            saveEmail: true,
          }),
        });
        if (!saveResponse.ok) {
          console.warn("Failed to save email to DB (non-critical):", await saveResponse.json().catch(() => ({})));
        }
      } catch (error) {
        console.warn("Failed to save email to DB (non-critical):", error);
        // 에러가 발생해도 이메일 전송은 계속 진행
      }
      setUserEmail(email);
    }

    try {
      // 이메일 전송 (전체 결과 포함)
      const fullData = (itemToSend as any).fullData;
      let emailText = "";
      let emailTitle = itemToSend.title;

      if (fullData) {
        // 전체 결과 포맷팅
        if (itemToSend.type === "TAROT") {
          emailTitle = `[타로] ${fullData.cardName}${fullData.isReversed ? " (역방향)" : ""}`;
          emailText = `오늘의 메시지\n${fullData.message}\n\n`;
          emailText += `연애\n${fullData.love}\n\n`;
          emailText += `금전\n${fullData.money}\n\n`;
          emailText += `직장\n${fullData.career}\n\n`;
          emailText += `조언\n${fullData.advice}`;
        } else if (itemToSend.type === "SAJU") {
          emailText = `오늘의 흐름\n${fullData.overview}\n\n`;
          emailText += `성격\n${fullData.personality}\n\n`;
          emailText += `연애\n${fullData.love}\n\n`;
          emailText += `직장\n${fullData.career}\n\n`;
          emailText += `금전\n${fullData.money}\n\n`;
          emailText += `올해의 흐름\n${fullData.thisYear}\n\n`;
          emailText += `조언\n${fullData.advice}\n\n`;
          emailText += `행운의 요소: ${fullData.luckyElement}\n`;
          emailText += `행운의 색상: ${fullData.luckyColor}`;
        } else if (itemToSend.type === "ZODIAC") {
          emailText = `오늘의 메시지\n${fullData.message}\n\n`;
          if (fullData.love) {
            emailText += `연애\n${fullData.love}\n\n`;
          }
          if (fullData.career) {
            emailText += `직장\n${fullData.career}\n\n`;
          }
          if (fullData.money) {
            emailText += `금전\n${fullData.money}\n\n`;
          }
          if (fullData.advice) {
            emailText += `조언\n${fullData.advice}\n\n`;
          }
          if (fullData.luckyNumber) {
            emailText += `행운의 숫자: ${fullData.luckyNumber}\n`;
          }
          if (fullData.luckyColor) {
            emailText += `행운의 색상: ${fullData.luckyColor}`;
          }
        }
      } else {
        // fullData가 없으면 기존 text 사용
        emailText = itemToSend.text;
      }

      const emailResponse = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          type: itemToSend.type,
          title: emailTitle,
          text: emailText,
          tags: itemToSend.tags,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || "이메일 전송에 실패했어요";
        console.error("Email send failed:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      // 기록에도 저장하기를 선택한 경우에만 DB에 저장
      if (saveToHistory) {
        const typeMap: Record<string, string> = {
          SAJU: "saju",
          TAROT: "tarot",
          ZODIAC: "zodiac",
        };

        const saveResponse = await fetch("/api/readings/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            type: typeMap[itemToSend.type] || "saju",
            result_json: {
              title: itemToSend.title,
              text: itemToSend.text,
              tags: itemToSend.tags,
              isPremium: itemToSend.isPremium || false,
            },
          }),
        });

        if (!saveResponse.ok) {
          console.error("Failed to save to history, but email sent");
        } else {
          // DB에서 최신 히스토리 다시 로드
          await loadHistoryFromDB(email);
        }
      }

      showToast(saveToHistory ? "이메일을 보냈고 기록에 저장했어요" : "이메일을 보냈어요");
      if (saveToHistory) {
        scrollTo(historyRef);
      }
      setPendingSaveItem(null);
    } catch (error) {
      console.error("Send email error:", error);
      throw error;
    }
  };

  const sendEmail = async (item: HistoryItem) => {
    // 항상 모달 표시 (이메일 저장 여부를 선택할 수 있도록)
    setPendingSaveItem(item);
    setEmailModalOpen(true);
  };

  const removeHistory = async (id: string) => {
    // DB에서 삭제하는 API가 없으므로 일단 로컬에서만 삭제
    // TODO: DB 삭제 API 추가 필요
    const next = history.filter((h) => h.id !== id);
    setHistory(next);

    // localStorage에도 저장 (하위 호환성)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    showToast("기록 삭제 완료");
  };

  // 타로(모달)
  const tarotDeck = useMemo(() => {
    return [
      {
        name: "THE MOON",
        title: "흐림 속에서도 길은 있어요.",
        text: "오늘은 모든 걸 확정하기보다, 감정을 관찰하는 쪽이 좋아요. 불확실함은 '정보 부족'일 수 있어요.",
        tags: ["관찰", "직감", "유예"],
      },
      {
        name: "THE SUN",
        title: "정답이 아니라 '확신'이 자라요.",
        text: "오늘은 작은 성취가 큰 자신감으로 이어져요. 시작을 미루지 말고, 가볍게 움직여봐요.",
        tags: ["성취", "기쁨", "시작"],
      },
      {
        name: "TEMPERANCE",
        title: "균형이 답을 더 빨리 데려와요.",
        text: "오늘은 한쪽으로 치우치기 쉬워요. 속도 조절만 해도 관계와 일정이 부드러워져요.",
        tags: ["균형", "조율", "호흡"],
      },
    ];
  }, []);

  const [picked, setPicked] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);

  const resetTarot = () => {
    setPicked(null);
    setFlipped(false);
  };

  const pickTarot = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    window.setTimeout(() => setFlipped(true), 220);
  };

  const tarotResult = useMemo(() => {
    if (picked === null) return null;
    return tarotDeck[picked];
  }, [picked, tarotDeck]);

  const saveTarot = async () => {
    if (!tarotResult) return;
    const item: HistoryItem = {
      id: uid(),
      type: "TAROT",
      title: `[타로] ${tarotResult.title}`,
      text: tarotResult.text,
      tags: tarotResult.tags,
      createdAt: Date.now(),
    };
    await sendEmail(item);
  };

  useEffect(() => {
    if (modal === "tarot") resetTarot();
  }, [modal]);

  return (
    <main className="mainWrap">
      <div className="bgFX" />
      {/* SearchParams 처리 (Suspense 경계 필수) */}
      <Suspense fallback={null}>
        <SearchParamsHandler onSavedParam={handleSavedParam} />
      </Suspense>
      <div className="content">
        {/* HERO - Night Sky */}
        <section className="section reveal on nightSky">
          {/* 별 파티클 - 클라이언트에서만 렌더링 (Hydration 오류 방지) */}
          {isMounted && (
            <div className="starField">
              {starsData.map((star, i) => (
                <div
                  key={i}
                  className="star"
                  style={{
                    left: `${star.left}%`,
                    top: `${star.top}%`,
                    animationDelay: `${star.delay}s`,
                    '--star-duration': `${star.duration}s`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          <div className="container center">
            <h1 className="brand stagger d1">LUMEN</h1>
            <p className="tagline stagger d2">
              과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리
            </p>

            <div className="heroEyebrow stagger d3">
              <span>사주</span>
              <span className="heroDot" />
              <span>타로</span>
              <span className="heroDot" />
              <span>별자리</span>
            </div>

            <div className={`heroTitle stagger d4 ${typingStarted && !typingComplete ? 'typing' : ''} ${typingComplete ? 'typing-complete' : ''}`}>
              {typedText.split('\n').map((line, index, array) => (
                <React.Fragment key={index}>
                  {line}
                  {index < array.length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>

            <div className="heroSub stagger d5">
              사주는 본질을, 타로는 선택을, 별자리는 흐름을.
              <br />
              하루의 방향을 조용히 정리해요.
            </div>

            <div className="identityLine stagger d5">
              <span className="identityBadge">사주</span>
              <span>본질·정리</span>
              <span className="heroDot" />
              <span className="identityBadge">타로</span>
              <span>선택·메시지</span>
              <span className="heroDot" />
              <span className="identityBadge">별자리</span>
              <span>흐름·보조</span>
            </div>

            <div className="heroDivider" />

            <div className="heroCtaRow">
              <button
                className="btn btnPrimary btnWide"
                onClick={() => scrollTo(flowRef)}
              >
                지금 바로 시작하기
              </button>
              <Link
                href="/tarot"
                className="btn btnGhost btnWide"
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                타로 카드 뽑기
              </Link>
              <button
                className="heroLink"
                onClick={() => scrollTo(subscribeRef)}
              >
                구독 혜택 확인하기
              </button>
            </div>

            <div className="miniRow" style={{ justifyContent: "center" }}>
              <span>10만+</span>
              <span>·</span>
              <span>4.8</span>
              <span>·</span>
              <span>99%</span>
            </div>
          </div>
        </section>

        {/* FLOW (별자리 세계: 밝음) */}
        <section className="sectionTight reveal" ref={flowRef as any}>
          <div className="container center">
            <h2 className="h2 stagger d1">오늘의 흐름</h2>
            <p className="p stagger d2">
              마음을 흔드는 말 대신, 오늘을 정리하는 문장으로만 전해요.
            </p>

            {/* 모바일: 기존 레이아웃 */}
            <div className="flowMobile">
              <div className="flowKicker stagger d3">{todayFlow.kicker}</div>
              <div className="flowStatement stagger d4">
                {todayFlow.statement}
              </div>
              <div className="flowDesc stagger d5">{todayFlow.desc}</div>

              {/* 키워드에 의미 부여 - 오늘의 힌트 */}
              <div className="stagger d4" style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 8 }}>
                {todayFlow.tags.map((t) => (
                  <span key={t} style={{
                    padding: "8px 18px",
                    background: "rgba(255, 255, 255, 0.45)",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    color: "var(--navy-dark)",
                    borderRadius: "24px",
                    fontSize: 14,
                    fontWeight: 600,
                    backdropFilter: "blur(4px)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                  }}>
                    #{t}
                  </span>
                ))}
              </div>
              <div className="stagger d4" style={{ display: "none", marginTop: 24, flexDirection: "column", gap: 12, width: "100%", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
                {todayFlow.tags.map((t, index) => {
                  const descriptions: Record<string, string> = {
                    // 첫 번째 세트
                    "정리": "마음의 순서를 정돈해보세요",
                    "호흡": "잠시 멈추고 깊게 숨을 쉬어보세요",
                    "선택": "직감을 믿고 결단해보세요",
                    // 두 번째 세트
                    "직감": "내면의 목소리를 들어보세요",
                    "흐름": "자연스러운 흐름을 따르세요",
                    "균형": "균형을 찾으면 방향이 보입니다",
                    // 세 번째 세트
                    "용기": "작은 도전이 큰 변화를 만듭니다",
                    "시작": "완벽하지 않아도 지금 시작하세요",
                    "집중": "한 가지에 집중하면 흐름이 열립니다",
                    // 추가 키워드
                    "성취": "오늘의 작은 성취가 내일의 자신감입니다",
                    "기쁨": "작은 순간에도 기쁨을 찾아보세요",
                  };
                  return (
                    <div key={t} style={{
                      padding: "12px 16px",
                      background: "rgba(26, 35, 50, 0.03)",
                      borderRadius: "12px",
                      border: "1px solid rgba(26, 35, 50, 0.08)",
                      textAlign: "center"
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy-dark)", marginBottom: 4 }}>
                        {t}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(26, 35, 50, 0.65)", lineHeight: 1.5 }}>
                        {descriptions[t] || "오늘의 흐름을 이끄는 힌트입니다"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 메인 CTA - 오늘 바로 행동하게 만드는 버튼 */}
              <div className="flowCtas stagger d5" style={{ marginTop: 32 }}>
                <Link
                  href="/saju"
                  className="btn btnPrimary btnWide"
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  오늘의 흐름 시작하기
                </Link>
              </div>

              {/* 서비스 카드 그리드 (버튼 대체) */}
              <div className="stagger d6" style={{ marginTop: 40 }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                  width: "100%",
                  maxWidth: "360px",
                  margin: "0 auto"
                }}>
                  <Link href="/saju" className="serviceCard" style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "20px 12px", background: "rgba(255, 255, 255, 0.65)", borderRadius: "20px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)", textDecoration: "none",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)", transition: "all 0.3s ease"
                  }}>
                    <div style={{ color: "var(--navy-dark)", marginBottom: 8 }}><SajuIcon size={24} /></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy-dark)" }}>사주</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>나의 본질</div>
                  </Link>
                  <Link href="/zodiac" className="serviceCard" style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "20px 12px", background: "rgba(255, 255, 255, 0.65)", borderRadius: "20px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)", textDecoration: "none",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)", transition: "all 0.3s ease"
                  }}>
                    <div style={{ color: "var(--navy-dark)", marginBottom: 8 }}><ZodiacIconSmall size={24} /></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy-dark)" }}>별자리</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>오늘의 흐름</div>
                  </Link>
                  <Link href="/tarot" className="serviceCard" style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "20px 12px", background: "rgba(255, 255, 255, 0.65)", borderRadius: "20px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)", textDecoration: "none",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)", transition: "all 0.3s ease"
                  }}>
                    <div style={{ color: "var(--navy-dark)", marginBottom: 8 }}><TarotIcon size={24} /></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy-dark)" }}>타로</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>선택과 조언</div>
                  </Link>
                </div>
              </div>
            </div>

            {/* PC: 모바일과 동일한 세로 스택 구조 */}
            <div className="flowDesktop">
              <div className="flowKicker stagger d3">{todayFlow.kicker}</div>
              <div className="flowStatement stagger d4">
                {todayFlow.statement}
              </div>
              <div className="flowDesc stagger d5">{todayFlow.desc}</div>

              {/* 키워드에 의미 부여 - 오늘의 힌트 */}
              <div className="stagger d4" style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 8 }}>
                {todayFlow.tags.map((t) => (
                  <span key={t} style={{
                    padding: "8px 18px",
                    background: "rgba(255, 255, 255, 0.45)",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    color: "var(--navy-dark)",
                    borderRadius: "24px",
                    fontSize: 14,
                    fontWeight: 600,
                    backdropFilter: "blur(4px)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                  }}>
                    #{t}
                  </span>
                ))}
              </div>
              <div className="stagger d4" style={{ display: "none", marginTop: 24, flexDirection: "column", gap: 12, width: "100%", maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
                {todayFlow.tags.map((t, index) => {
                  const descriptions: Record<string, string> = {
                    // 첫 번째 세트
                    "정리": "마음의 순서를 정돈해보세요",
                    "호흡": "잠시 멈추고 깊게 숨을 쉬어보세요",
                    "선택": "직감을 믿고 결단해보세요",
                    // 두 번째 세트
                    "직감": "내면의 목소리를 들어보세요",
                    "흐름": "자연스러운 흐름을 따르세요",
                    "균형": "균형을 찾으면 방향이 보입니다",
                    // 세 번째 세트
                    "용기": "작은 도전이 큰 변화를 만듭니다",
                    "시작": "완벽하지 않아도 지금 시작하세요",
                    "집중": "한 가지에 집중하면 흐름이 열립니다",
                    // 추가 키워드
                    "성취": "오늘의 작은 성취가 내일의 자신감입니다",
                    "기쁨": "작은 순간에도 기쁨을 찾아보세요",
                  };
                  return (
                    <div key={t} style={{
                      padding: "12px 16px",
                      background: "rgba(26, 35, 50, 0.03)",
                      borderRadius: "12px",
                      border: "1px solid rgba(26, 35, 50, 0.08)",
                      textAlign: "center"
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy-dark)", marginBottom: 4 }}>
                        {t}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(26, 35, 50, 0.65)", lineHeight: 1.5 }}>
                        {descriptions[t] || "오늘의 흐름을 이끄는 힌트입니다"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 메인 CTA - 오늘 바로 행동하게 만드는 버튼 */}
              <div className="flowCtas stagger d5" style={{ marginTop: 32 }}>
                <Link
                  href="/saju"
                  className="btn btnPrimary btnWide"
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  오늘의 흐름 시작하기
                </Link>
              </div>

              {/* 서비스 카드 그리드 (버튼 대체) */}
              <div className="stagger d6" style={{ marginTop: 40 }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                  width: "100%",
                  maxWidth: "360px",
                  margin: "0 auto"
                }}>
                  <Link href="/saju" className="serviceCard" style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "20px 12px", background: "rgba(255, 255, 255, 0.65)", borderRadius: "20px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)", textDecoration: "none",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)", transition: "all 0.3s ease"
                  }}>
                    <div style={{ color: "var(--navy-dark)", marginBottom: 8 }}><SajuIcon size={24} /></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy-dark)" }}>사주</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>나의 본질</div>
                  </Link>
                  <Link href="/zodiac" className="serviceCard" style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "20px 12px", background: "rgba(255, 255, 255, 0.65)", borderRadius: "20px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)", textDecoration: "none",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)", transition: "all 0.3s ease"
                  }}>
                    <div style={{ color: "var(--navy-dark)", marginBottom: 8 }}><ZodiacIconSmall size={24} /></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy-dark)" }}>별자리</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>오늘의 흐름</div>
                  </Link>
                  <Link href="/tarot" className="serviceCard" style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: "16px 8px", background: "white", borderRadius: "16px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)", textDecoration: "none",
                    border: "1px solid rgba(0,0,0,0.05)", transition: "transform 0.2s"
                  }}>
                    <div style={{ color: "var(--navy-dark)", marginBottom: 8 }}><TarotIcon size={24} /></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy-dark)" }}>타로</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>선택과 조언</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TARO / TRUST / REVIEWS (타로 세계: 어두움 + 골드 소량) */}
        <section className="sectionTight reveal taroSection">
          <div className="container center">
            <h2 className="h2 stagger d1">믿고 볼 수 있도록</h2>
            <p className="p stagger d2">
              공포·불안 조장 없이, 오늘의 선택을 "정리"하는 서비스예요.
            </p>

            <div className="trustRow stagger d3">
              <div className="trustPill">
                <span className="trustNum">10만+</span>
                <span className="trustLabel">누적 이용자</span>
              </div>
              <div className="trustPill">
                <span className="trustNum">4.8</span>
                <span className="trustLabel">평균 평점</span>
              </div>
              <div className="trustPill">
                <span className="trustNum">99%</span>
                <span className="trustLabel">만족도</span>
              </div>
            </div>

            <div className="principles stagger d4" aria-label="해석 원칙">
              <div className="principleCard">
                <div className="principleTop">
                  <div className="principleTitle">공포·불안 조장 없음</div>
                </div>
                <div className="principleDesc">
                  마음을 흔드는 말 대신, 흐름을 정리하는 문장으로만 전해요. 과장된 말은 쓰지 않아요.
                </div>
              </div>

              <div className="principleCard">
                <div className="principleTop">
                  <div className="principleTitle">행동으로 이어지는 조언</div>
                </div>
                <div className="principleDesc">
                  "그래서 오늘 뭘 하면 좋을지"가 남도록 방향을 정리해요.
                </div>
              </div>

              <div className="principleCard">
                <div className="principleTop">
                  <div className="principleTitle">짧고 명확한 문장</div>
                </div>
                <div className="principleDesc">
                  필요한 만큼만. 읽고 나면 마음이 가벼워지게 구성해요. 오늘의 선택을 정리해드릴 뿐, 스스로 판단하시면 돼요.
                </div>
              </div>
            </div>

            {/* ✅ 리뷰: 지그재그 + 스크롤 떠오름 */}
            <div
              className="reviewZig"
              style={{ marginTop: 18 }}
              aria-label="리뷰 목록"
            >
              {reviews.map((r, i) => {
                const side = i % 2 === 0 ? "left" : "right";
                const initial = r.name.charAt(0); // 이름의 첫 글자
                return (
                  <div
                    key={`${r.name}-${i}`}
                    className={`reviewItem ${side} reveal`}
                  >
                    <div className="reviewCardZ">
                      <div className="reviewTop">
                        <div
                          className="avatar"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "linear-gradient(135deg, var(--gold-bright), var(--gold-main))",
                            color: "var(--navy-dark)",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {initial}
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div className="name">{r.name}</div>
                          <div className="stars">★★★★★</div>
                        </div>
                      </div>
                      <p className="reviewText">{r.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="chipRow"
              style={{ justifyContent: "center" }}
            >
              <span className="chip chipGold">프리미엄</span>
              <span className="chip">과장 없음</span>
              <span className="chip">정리 중심</span>
            </div>
          </div>
        </section>

        {/* SUBSCRIBE - 구독 기능만 (메시지 중복 제거) */}
        {/* SUBSCRIBE - 디자인 개선 (Dark Premium Card) */}
        <section className="reveal" ref={subscribeRef as any} style={{ padding: "40px var(--pad)" }}>
          <div className="container center">
            <div style={{
              background: "linear-gradient(145deg, var(--navy-dark), #2d3561)",
              borderRadius: "24px",
              padding: "40px 24px",
              color: "white",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(26, 35, 50, 0.2)"
            }}>
              {/* 배경 장식 */}
              <div style={{
                position: "absolute", top: -20, right: -20,
                width: 120, height: 120, background: "var(--gold-main)",
                opacity: 0.1, borderRadius: "50%", filter: "blur(40px)"
              }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  textTransform: "uppercase", fontSize: 12, fontWeight: 700, letterSpacing: "1px",
                  color: "var(--gold-main)", marginBottom: 12, opacity: 0.9
                }}>
                  Premium Newsletter
                </div>
                <h2 className="stagger d1" style={{ fontSize: 24, fontFamily: "var(--font-serif)", marginBottom: 16 }}>
                  매일 아침,<br />나를 위한 흐름을 받으세요
                </h2>
                <p className="stagger d2" style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6, maxWidth: "280px", margin: "0 auto" }}>
                  오늘의 키워드, 한 줄 조언, 주의할 점까지.<br />
                  과장 없이 깔끔하게 정리해드립니다.
                </p>

                <div className="stagger d3" style={{ marginTop: 32 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      window.open("https://page.stibee.com/subscriptions/467092", "_blank");
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "280px",
                      padding: "16px",
                      background: "var(--gold-main)",
                      color: "var(--navy-dark)",
                      fontSize: 16,
                      fontWeight: 700,
                      borderRadius: "12px",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(212, 165, 116, 0.3)"
                    }}
                  >
                    이메일로 받아보기
                  </button>
                  <div style={{ marginTop: 12, fontSize: 12, opacity: 0.5 }}>
                    스팸 없이, 오직 운세만 보내드려요
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HISTORY - 행동을 유도하는 영역 */}
        {/* HISTORY - 더 깔끔하게 정리 */}
        <section className="sectionTight reveal" ref={historyRef as any}>
          <div className="container center">
            <h2 className="h2 stagger d1" style={{ fontSize: 16, fontWeight: 700, opacity: 0.5, marginBottom: 24 }}>최근 기록</h2>

            <div className="historyWrap stagger d3">
              {history.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "40px 24px",
                  background: "rgba(26, 35, 50, 0.02)",
                  borderRadius: "16px",
                  border: "1px dashed rgba(26, 35, 50, 0.1)"
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>
                    아직 기록이 없어요
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
                    사주, 타로, 별자리 결과를 저장해보세요
                  </div>
                </div>
              ) : (
                history.map((h) => (
                  <div className="historyCard" key={h.id}>
                    <div className="historyTop">
                      <span className="badge">
                        {h.type === "SAJU"
                          ? "사주"
                          : h.type === "ZODIAC"
                            ? "별자리"
                            : "타로"}
                      </span>
                      <span className="muted">
                        {formatKoreanDate(h.createdAt)}
                      </span>
                    </div>
                    <div className="historyTitle">{h.title}</div>
                    <div className="historyText" style={{ fontSize: 13, color: "var(--text-secondary)" }}>{h.text}</div>
                    <div className="chipRow">
                      {h.tags.slice(0, 3).map((t) => (
                        <span className="chip" key={t} style={{ fontSize: 11, padding: "4px 8px" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 12
                      }}
                    >
                      <button
                        className="btnTiny"
                        onClick={() => removeHistory(h.id)}
                      >
                        삭제
                      </button>
                      <button
                        className="btnTiny"
                        onClick={() => {
                          navigator.clipboard?.writeText(
                            `${h.title}\n${h.text}`
                          );
                          showToast("결과를 복사했어요");
                        }}
                      >
                        복사
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <footer className="footer reveal">
          © LUMEN · 문의 · 약관 · 개인정보처리방침
        </footer>

        {/* MODALS */}
        {modal === "tarot" && (
          <Modal
            title="타로 한 장(데모)"
            onClose={() => setModal(null)}
          >
            <TarotModal
              picked={picked}
              flipped={flipped}
              onPick={pickTarot}
              onReset={resetTarot}
              result={tarotResult}
              onSave={saveTarot}
              onClose={() => setModal(null)}
            />
          </Modal>
        )}

        {toast && <div className="toast">{toast}</div>}

        {/* 맨 위로 가기 버튼 */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--navy-dark)",
              color: "var(--cream)",
              border: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              zIndex: 1000,
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
            aria-label="맨 위로 가기"
          >
            ↑
          </button>
        )}

        {/* PWA 설치 유도 배너 */}
        <PWAInstallBanner />

        {/* 이메일 입력 모달 */}
        <EmailInputModal
          isOpen={emailModalOpen}
          onClose={() => {
            setEmailModalOpen(false);
            setPendingSaveItem(null);
          }}
          onConfirm={(email, saveToHistory, saveEmail) => handleSendEmail(email, saveToHistory, saveEmail)}
          title="이메일을 입력해주세요"
          description="결과를 이메일로 받아보실 수 있어요."
        />

        {/* 구독 이메일 입력 모달 */}
        <EmailInputModal
          isOpen={subscribeEmailModalOpen}
          onClose={() => {
            setSubscribeEmailModalOpen(false);
          }}
          onConfirm={async (email, saveToHistory, saveEmail) => {
            // 구독에서는 saveToHistory는 사용하지 않음
            await handleSubscribeEmail(email, saveEmail);
          }}
          title="구독하기"
          description="매일 아침 오늘의 흐름을 이메일로 받아보세요."
        />
      </div>
    </main>
  );
}

/* ===== Modal Shell ===== */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalSheet" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="closeBtn" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}

/* ===== TAROT Modal (PC: hover 살짝 / click 완전 뒤집힘, Mobile: 선택 후 바탕 탭하면 초기화) ===== */
function TarotModal({
  picked,
  flipped,
  onPick,
  onReset,
  result,
  onSave,
  onClose,
}: {
  picked: number | null;
  flipped: boolean;
  onPick: (i: number) => void;
  onReset: () => void;
  result: { name: string; title: string; text: string; tags: string[] } | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setCanHover(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);

  const [hovered, setHovered] = useState<number | null>(null);

  // 모바일에서 "빈 바탕 탭"으로 초기화(카드/버튼 제외)
  const onEmptyTapReset = (e: React.PointerEvent<HTMLDivElement>) => {
    if (canHover) return; // PC는 굳이 바탕탭 리셋 없음
    const el = e.target as HTMLElement;
    if (el.closest("button")) return;
    if (picked !== null) onReset();
  };

  return (
    <div onPointerDown={onEmptyTapReset}>
      <p className="p" style={{ marginTop: 0 }}>
        카드 3장 중 1장을 선택하면 메시지가 열려요.
      </p>

      <div className="tarotArea">
        <div className="tarotPickRow" aria-label="타로 카드 선택">
          {[0, 1, 2].map((i) => {
            const isPicked = picked === i;
            const showFlip = isPicked && flipped;

            // PC: hover는 살짝만, 클릭(선택)하면 완전 뒤집힘
            const preview = canHover && picked === null && hovered === i;

            return (
              <button
                key={i}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => onPick(i)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
                aria-label={`카드 ${i + 1} 선택`}
              >
                <div className="tarotFlip">
                  <div
                    className={[
                      "tarotInner",
                      preview ? "preview" : "",
                      showFlip ? "flipped" : "",
                    ].join(" ")}
                  >
                    <div className="tarotFace tarotBack" />
                    <div className="tarotFace tarotFront">
                      {showFlip ? "OPEN" : "LUMEN"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!canHover && picked !== null && (
          <div className="tapHint">
            * 카드 주변 빈 공간을 탭하면 초기화돼요.
          </div>
        )}
      </div>

      {result ? (
        <div className="card cardPad lift" style={{ marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900 }}>{result.name}</div>
            <div className="muted">오늘의 메시지</div>
          </div>

          <div style={{ marginTop: 10, fontWeight: 900, letterSpacing: -0.01 }}>
            {result.title}
          </div>
          <div className="p">{result.text}</div>

          <div className="chipRow">
            {result.tags.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <button className="btn btnPrimary btnWide" onClick={onSave}>
              기록에 저장하기
            </button>

            <button className="btn btnGhost btnWide" onClick={onReset}>
              카드 다시 뽑기
            </button>

            <button className="btn btnGhost btnWide" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: "rgba(43,38,42,0.62)",
            lineHeight: 1.6,
          }}
        >
          * 아직 선택하지 않았어요. 한 장을 눌러서 열어봐.
        </div>
      )}
    </div>
  );
}

