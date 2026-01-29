"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  /** 타로 기록일 때 카드 이미지 표시용 */
  cardId?: number;
  cardName?: string;
  isReversed?: boolean;
  /** 모달 전체 보기용 (연애·직장·조언 등) */
  message?: string;
  overview?: string;
  personality?: string;
  love?: string;
  career?: string;
  money?: string;
  advice?: string;
  thisYear?: string;
  luckyElement?: string;
  luckyColor?: string;
  luckyNumber?: number;
  keywords?: string[];
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

// 전역 변수로 페이지 리로드(F5) 여부 감지 (Client Side Navigation 시에는 false 유지)
let isFreshLoad = true;

// 메인 컴포넌트 로직 (useSearchParams 사용)
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnFromParam = searchParams.get("returnFrom");

  const flowRef = useRef<HTMLElement | null>(null);
  const subscribeRef = useRef<HTMLElement | null>(null);
  const historyRef = useRef<HTMLElement | null>(null);

  const [modal, setModal] = useState<ModalType>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [pendingSaveItem, setPendingSaveItem] = useState<HistoryItem | null>(null);
  const [stibeeModalOpen, setStibeeModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  // 현재 시간 (Flow Card용)
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // 포맷 예시: "1월 21일, 오전 11:30 기준"
      const datePart = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
      const timePart = now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
      setTimeString(`${datePart}, ${timePart} 기준`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000); // 1초마다 갱신 (즉각 반영)
    return () => clearInterval(timer);
  }, []);

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

  // 로딩 상태 플래그 (복귀 시 애니메이션 스킵용 - 초기값 false로 통일하여 Hydration 에러 방지)
  const [isFastMode, setIsFastMode] = useState(false);

  // [Fast Mode 로직 개선]
  // URL 파라미터가 있거나, 혹은 이미 FastMode로 진입했다면 계속 유지시키는 state
  const [forcedFastMode, setForcedFastMode] = useState(false);

  // 렌더링 시점에 즉시 계산
  // (초기값 isFastMode가 true면 계속 true 유지)
  const isEffectiveFastMode = isFastMode || forcedFastMode;

  // 클라이언트 마운트 확인 (Hydration 오류 방지)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 통합된 진입 로직
  useEffect(() => {
    if (!isMounted) return;

    // FastMode 여부 판단 (초기 state 혹은 파라미터)
    // 우리는 이미 초기값에서 referrer까지 체크했으므로 isFastMode 하나면 충분하지만,
    // useEffect 시점의 로직 일관성을 위해 체크
    const params = new URLSearchParams(window.location.search);
    const returnFromParam = params.get("returnFrom");
    const referrer = document.referrer || "";
    // referrer 체크는 이미 useState에서 했지만, 여기서도 로직 트리거를 위해 사용
    const isInternalReturn = referrer.includes("/saju") || referrer.includes("/tarot") || referrer.includes("/zodiac") || referrer.includes("/talk");

    // Reveal elements
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

    // [로직 1] 서비스 복귀 (홈으로 가기, 뒤로가기 포함)
    if (returnFromParam || isInternalReturn) {
      // ★ 상태 고정
      setForcedFastMode(true);

      // 텍스트 즉시 완성
      setTypingStarted(true);
      setTypingComplete(true);
      setTypedText(heroTitleText);

      // ★ 추가: 복귀 시 "머릿속 복잡한 건?" 질문(intro) 스킵하고 바로 카드(card) 보여주기
      setFlowScene("card");

      setTimeout(() => {
        // 즉시 위치 이동
        flowRef.current?.scrollIntoView({ behavior: "auto", block: "center" });

        // 3. 구독 제안 팝업 표시 (무조건 뜨게 v4로 키 변경)
        // 단, "오늘 하루 안 보기" 체크
        const hideDate = localStorage.getItem("lumen_popup_hide_date");
        const today = new Date().toDateString();
        const suggestionClosed = sessionStorage.getItem("lumen_suggestion_v4"); // 영구 닫기 체크

        if (!suggestionClosed && hideDate !== today) {
          setTimeout(() => setShowSubscribeSuggestion(true), 500);
        }
      }, 50);

      // URL 파라미터 있으면 청소
      if (returnFromParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      isFreshLoad = false;

    } else {
      // [로직 2] 일반 진입 (새로고침, 첫주소)
      // setIsFastMode(false); // 애니메이션 모드 (isFastMode는 이제 파생된 값)

      window.scrollTo(0, 0);

      if (isFreshLoad) {
        // [F5] 타자기 실행
        setTimeout(() => {
          setTypingStarted(true);
          setTypedText(""); // 초기화
          // 실제 타이핑은 아래 useEffect가 담당
        }, 100);
        isFreshLoad = false;
      } else {
        // [단순 이동] 이미 봤으니 스킵
        setTypingStarted(true);
        setTypingComplete(true);
        setTypedText(heroTitleText);
      }
    }

    return () => io.disconnect();
  }, [isMounted]);

  // ★ [수정된 타자기 로직] 안정적인 slice 방식 사용
  useEffect(() => {
    if (typingStarted && !typingComplete) {
      if (isEffectiveFastMode) return; // FastMode면 실행 안 함

      let currentIndex = 0;
      const fullText = heroTitleText;

      const interval = setInterval(() => {
        currentIndex++;
        setTypedText(fullText.slice(0, currentIndex));

        if (currentIndex >= fullText.length) {
          clearInterval(interval);
          setTypingComplete(true);
        }
      }, 100); // 속도 100ms (여유롭게)

      return () => clearInterval(interval);
    }
  }, [typingStarted, typingComplete, isFastMode]);

  // 구독 제안 모달 상태
  const [showSubscribeSuggestion, setShowSubscribeSuggestion] = useState(false);

  const closeSubscribeSuggestion = (neverShowAgain = false) => {
    setShowSubscribeSuggestion(false);
    if (neverShowAgain) {
      sessionStorage.setItem("lumen_suggestion_v4", "true");
    }
  };

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

  // Flow Section Scene Management
  const [flowScene, setFlowScene] = useState<'initial' | 'intro' | 'card'>('initial');

  useEffect(() => {
    // 모바일 감지 (768px 이하)
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    // 모바일: threshold 0.5, 인트로 1.8초 / PC: threshold 0.8, 인트로 2.5초
    const threshold = isMobile ? 0.5 : 0.8;
    const introDelay = isMobile ? 1800 : 2500;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && flowScene === 'initial') {
          setFlowScene('intro');
          setTimeout(() => {
            setFlowScene('card');
          }, introDelay);
        }
      });
    }, { threshold });

    if (flowRef.current) {
      observer.observe(flowRef.current);
    }
    return () => observer.disconnect();
  }, [flowScene]);

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
  // 최근 기록 상세 팝업 (카드 클릭 시 전체 확인)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);

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
      if (data.success && data.email) {
        // 이메일이 있으면 히스토리 로드 (저장 여부와 무관하게 기록은 보여줌)
        loadHistoryFromDB(data.email);

        // 이메일 저장하기가 체크된 경우에만 자동 입력을 위해 상태 업데이트
        if (data.saveEmail) {
          setUserEmail(data.email);
        }
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
      const response = await fetch(`/api/readings?email=${encodeURIComponent(email)}&t=${Date.now()}`);
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

    // DB에 세션별 이메일 업데이트 (항상 수행, history 기능 작동을 위해 필요)
    try {
      const saveResponse = await fetch("/api/user-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId,
          email: email,
          saveEmail: saveEmail,
        }),
      });
      if (!saveResponse.ok) {
        console.warn("Failed to save email to DB (non-critical):", await saveResponse.json().catch(() => ({})));
      }
    } catch (error) {
      console.warn("Failed to save email to DB (non-critical):", error);
    }

    if (saveEmail) {
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
    const next = history.filter((h) => h.id !== id);

    // DB에서 불러온 기록(UUID)이면 API로 삭제 요청 (새로고침 후에도 반영되도록)
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    if (sessionId && isUuid) {
      try {
        const res = await fetch("/api/readings/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          showToast(data.error || "삭제에 실패했어요. 다시 시도해주세요.");
          return;
        }
      } catch (err) {
        console.error("Remove history error:", err);
        showToast("삭제에 실패했어요. 다시 시도해주세요.");
        return;
      }
    }

    setHistory(next);
    // localStorage에도 반영 (이메일 없이 로컬만 쓰는 경우)
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
    <main className={`mainWrap ${isEffectiveFastMode ? 'fast-mode' : ''}`}>
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

            <div className={`heroTitle stagger d3 ${typingStarted && !typingComplete ? 'typing' : ''} ${typingComplete ? 'typing-complete' : ''}`} style={{ whiteSpace: "pre-line" }}>
              {typedText}
            </div>

            <div className="heroDivider" />

            <div className="heroCtaRow">
              <button
                className="btn btnPrimary btnWide"
                onClick={() => scrollTo(flowRef)}
              >
                지금 바로 시작하기
              </button>
              <button
                className="heroLink"
                onClick={() => scrollTo(subscribeRef)}
              >
                매일 아침, 나를 위한 흐름을 받으세요
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
          <div className="container center" style={{ display: "flex", justifyContent: "center", position: "relative", minHeight: "500px", alignItems: "center" }}>
            {/* SCENE 1: INTRO */}
            {flowScene === 'intro' && (
              <div className="flowIntro cinematicFadeUp">
                지금 당신의 머릿속에서<br className="pc-only" /> 가장 복잡한 건 무엇인가요?
              </div>
            )}

            {/* SCENE 2: CARD */}
            {flowScene === 'card' && (
              <div className="flowCard cinematicFadeUp">
                <div className="flowDecoLine" />

                <div className="flowCardContent" style={{ flexDirection: "column", gap: 32, alignItems: "center", width: "100%", padding: "20px 0" }}>

                  {/* 1. Date & Title */}
                  <div className="flowHeaderGroup" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <div className="flowDate stagger d2">
                      오늘의 흐름 <span className="sep">|</span> {timeString}
                    </div>
                    <h2 className="flowTitle stagger d2" style={{ marginBottom: 0 }}>오늘의 흐름</h2>
                  </div>

                  {/* 3. Services (Centered Grid - Mobile: 세로, PC: 가로) */}
                  <div className="flowServices stagger d4">
                    <Link href="/saju" className="serviceCardItem serviceItemAppear delay-1">
                      <div className="icon"><SajuIcon size={20} /></div>
                      <div className="label">사주</div>
                      <div className="sub">나의 본질</div>
                      <div className="arrow">&gt;</div>
                    </Link>
                    <Link href="/zodiac" className="serviceCardItem serviceItemAppear delay-2">
                      <div className="icon"><ZodiacIconSmall size={20} /></div>
                      <div className="label">별자리</div>
                      <div className="sub">오늘의 흐름</div>
                      <div className="arrow">&gt;</div>
                    </Link>
                    <Link href="/tarot" className="serviceCardItem serviceItemAppear delay-3">
                      <div className="icon"><TarotIcon size={20} /></div>
                      <div className="label">타로</div>
                      <div className="sub">선택과 조언</div>
                      <div className="arrow">&gt;</div>
                    </Link>
                  </div>

                  {/* AI 상담소 진입 버튼 (반응형: 모바일 2줄 / PC 1줄) */}
                  <Link
                    href={`/talk?tags=${todayFlow.tags.join(',')}`}
                    className="serviceItemAppear lumen-insight-link"
                    style={{
                      marginTop: 32,
                      animationDelay: "0.8s",
                      animationFillMode: "both",
                      opacity: 1 // 강제로 보이게 설정
                    }}>
                    <span style={{ fontSize: "13px", color: "#888", letterSpacing: "0.01em" }}>
                      더 깊은 해석과 조언이 필요하다면?
                    </span>
                    <span style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#444",
                      letterSpacing: "0.03em",
                      borderBottom: "1px solid #bbb",
                      paddingBottom: "2px"
                    }}>
                      LUMEN 인사이트
                    </span>
                  </Link>

                </div>
              </div>

            )}

          </div>
        </section>

        {/* 해석 원칙 (FLOW 아래, 밝은 배경 - 텍스트만) */}
        <section className="sectionTight reveal" style={{ background: "var(--bg)", padding: "56px 0" }}>
          <div className="container center">
            <h3 className="stagger d1" style={{
              fontSize: "clamp(22px, 5vw, 28px)",
              fontWeight: 800,
              marginBottom: "12px",
              color: "var(--navy-dark)",
              letterSpacing: "-0.02em"
            }}>
              LUMEN의 해석 원칙
            </h3>
            <p className="principleSubtitle stagger d2" style={{
              marginBottom: "48px",
              color: "var(--muted)",
              fontSize: "clamp(14px, 3.5vw, 16px)"
            }}>
              우리는 이런 기준으로 해석해요
            </p>

            <div className="principlesTextGrid stagger d3">
              <div>
                <div className="principleItemTitle" style={{
                  fontWeight: 700,
                  fontSize: "clamp(16px, 4vw, 18px)",
                  color: "var(--navy-dark)",
                  marginBottom: "8px"
                }}>
                  공포·불안 조장 없음
                </div>
                <div style={{
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  color: "var(--muted)",
                  lineHeight: 1.7
                }}>
                  마음을 흔드는 말 대신, 흐름을 정리하는 문장으로만 전해요.
                </div>
              </div>

              <div>
                <div className="principleItemTitle" style={{
                  fontWeight: 700,
                  fontSize: "clamp(16px, 4vw, 18px)",
                  color: "var(--navy-dark)",
                  marginBottom: "8px"
                }}>
                  행동으로 이어지는 조언
                </div>
                <div style={{
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  color: "var(--muted)",
                  lineHeight: 1.7
                }}>
                  "그래서 오늘 뭘 하면 좋을지"가 남도록 방향을 정리해요.
                </div>
              </div>

              <div>
                <div className="principleItemTitle" style={{
                  fontWeight: 700,
                  fontSize: "clamp(16px, 4vw, 18px)",
                  color: "var(--navy-dark)",
                  marginBottom: "8px"
                }}>
                  짧고 명확한 문장
                </div>
                <div style={{
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  color: "var(--muted)",
                  lineHeight: 1.7
                }}>
                  필요한 만큼만. 읽고 나면 마음이 가벼워지게 구성해요.
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
                    onClick={() => setStibeeModalOpen(true)}
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
            <h2 className="h2 stagger d1" style={{ fontSize: 16, fontWeight: 700, opacity: 0.5, marginBottom: 8 }}>최근 기록</h2>
            <p className="stagger d2" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 24 }}>
              카드를 누르면 전체 내용을 볼 수 있어요
            </p>

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
                  <div
                    className="historyCard"
                    key={h.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedHistoryItem(h)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedHistoryItem(h)}
                    style={{ cursor: "pointer" }}
                  >
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
                    <div
                      className="historyText"
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {h.text}
                    </div>
                    <div className="chipRow">
                      {h.tags.slice(0, 3).map((t) => (
                        <span className="chip" key={t} style={{ fontSize: 11, padding: "4px 8px" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div
                      className="chipRow historyCardActions"
                      style={{
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 12,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btnTiny"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHistoryItem(h);
                        }}
                      >
                        전체 보기
                      </button>
                      <button
                        type="button"
                        className="btnTiny"
                        onClick={() => removeHistory(h.id)}
                      >
                        삭제
                      </button>
                      <button
                        type="button"
                        className="btnTiny"
                        onClick={() => {
                          navigator.clipboard?.writeText(`${h.title}\n${h.text}`);
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

        {/* 최근 기록 상세 팝업 (카드 클릭 시 전체 확인) */}
        {selectedHistoryItem && (
          <div
            className="modalOverlay"
            onClick={() => setSelectedHistoryItem(null)}
            style={{ zIndex: 9998 }}
          >
            <div
              className="modalSheet"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
            >
              <div className="modalHeader">
                <div className="modalTitle" style={{ fontSize: 14, fontWeight: 700 }}>
                  {selectedHistoryItem.type === "SAJU"
                    ? "사주"
                    : selectedHistoryItem.type === "ZODIAC"
                      ? "별자리"
                      : "타로"}{" "}
                  기록
                </div>
                <button
                  className="closeBtn"
                  onClick={() => setSelectedHistoryItem(null)}
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>
              <div
                className="modalBody"
                style={{
                  overflowY: "auto",
                  flex: 1,
                  padding: "16px 20px",
                }}
              >
                <div className="muted" style={{ marginBottom: 8 }}>
                  {formatKoreanDate(selectedHistoryItem.createdAt)}
                </div>
                {selectedHistoryItem.type === "TAROT" && selectedHistoryItem.cardId != null && (
                  <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={`/tarot/${selectedHistoryItem.cardId}.png`}
                      alt={selectedHistoryItem.cardName || "타로 카드"}
                      style={{
                        width: 80,
                        height: 140,
                        objectFit: "contain",
                        borderRadius: 8,
                        transform: selectedHistoryItem.isReversed ? "scaleY(-1)" : undefined,
                      }}
                    />
                    <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>
                      {selectedHistoryItem.cardName}
                      {selectedHistoryItem.isReversed ? " (역방향)" : ""}
                    </span>
                  </div>
                )}
                <div className="historyTitle" style={{ marginBottom: 12 }}>
                  {selectedHistoryItem.title}
                </div>
                {/* 전체 기록: 연애·직장·금전·조언 등 섹션별 표시 */}
                <div
                  className="historyText"
                  style={{
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {selectedHistoryItem.type === "SAJU" &&
                  (selectedHistoryItem.overview || selectedHistoryItem.personality) ? (
                    <>
                      {selectedHistoryItem.overview && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>오늘의 흐름</div>
                          <div>{selectedHistoryItem.overview}</div>
                        </div>
                      )}
                      {selectedHistoryItem.personality && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>성격</div>
                          <div>{selectedHistoryItem.personality}</div>
                        </div>
                      )}
                      {selectedHistoryItem.love && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>연애</div>
                          <div>{selectedHistoryItem.love}</div>
                        </div>
                      )}
                      {selectedHistoryItem.career && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>직장</div>
                          <div>{selectedHistoryItem.career}</div>
                        </div>
                      )}
                      {selectedHistoryItem.money && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>금전</div>
                          <div>{selectedHistoryItem.money}</div>
                        </div>
                      )}
                      {selectedHistoryItem.thisYear && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>올해의 흐름</div>
                          <div>{selectedHistoryItem.thisYear}</div>
                        </div>
                      )}
                      {selectedHistoryItem.advice && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>조언</div>
                          <div>{selectedHistoryItem.advice}</div>
                        </div>
                      )}
                      {(selectedHistoryItem.luckyElement || selectedHistoryItem.luckyColor) && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>행운</div>
                          <div>
                            {selectedHistoryItem.luckyElement && <span>요소: {selectedHistoryItem.luckyElement}</span>}
                            {selectedHistoryItem.luckyElement && selectedHistoryItem.luckyColor && " · "}
                            {selectedHistoryItem.luckyColor && <span>색상: {selectedHistoryItem.luckyColor}</span>}
                          </div>
                        </div>
                      )}
                    </>
                  ) : selectedHistoryItem.type === "ZODIAC" &&
                    (selectedHistoryItem.message || selectedHistoryItem.love) ? (
                    <>
                      {selectedHistoryItem.message && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>오늘의 메시지</div>
                          <div>{selectedHistoryItem.message}</div>
                        </div>
                      )}
                      {selectedHistoryItem.love && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>연애</div>
                          <div>{selectedHistoryItem.love}</div>
                        </div>
                      )}
                      {selectedHistoryItem.career && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>직장</div>
                          <div>{selectedHistoryItem.career}</div>
                        </div>
                      )}
                      {selectedHistoryItem.money && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>금전</div>
                          <div>{selectedHistoryItem.money}</div>
                        </div>
                      )}
                      {selectedHistoryItem.advice && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>조언</div>
                          <div>{selectedHistoryItem.advice}</div>
                        </div>
                      )}
                      {(selectedHistoryItem.luckyNumber != null || selectedHistoryItem.luckyColor) && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>행운</div>
                          <div>
                            {selectedHistoryItem.luckyNumber != null && (
                              <span>숫자: {selectedHistoryItem.luckyNumber}</span>
                            )}
                            {selectedHistoryItem.luckyNumber != null && selectedHistoryItem.luckyColor && " · "}
                            {selectedHistoryItem.luckyColor && <span>색상: {selectedHistoryItem.luckyColor}</span>}
                          </div>
                        </div>
                      )}
                    </>
                  ) : selectedHistoryItem.type === "TAROT" &&
                    (selectedHistoryItem.message || selectedHistoryItem.love) ? (
                    <>
                      {selectedHistoryItem.message && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>오늘의 메시지</div>
                          <div>{selectedHistoryItem.message}</div>
                        </div>
                      )}
                      {selectedHistoryItem.love && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>연애</div>
                          <div>{selectedHistoryItem.love}</div>
                        </div>
                      )}
                      {selectedHistoryItem.money && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>금전</div>
                          <div>{selectedHistoryItem.money}</div>
                        </div>
                      )}
                      {selectedHistoryItem.career && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>직장</div>
                          <div>{selectedHistoryItem.career}</div>
                        </div>
                      )}
                      {selectedHistoryItem.advice && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--navy-dark)" }}>조언</div>
                          <div>{selectedHistoryItem.advice}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    selectedHistoryItem.text
                  )}
                </div>
                {selectedHistoryItem.tags.length > 0 && (
                  <div className="chipRow" style={{ marginTop: 12 }}>
                    {selectedHistoryItem.tags.map((t) => (
                      <span className="chip" key={t} style={{ fontSize: 11, padding: "4px 8px" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <button
                    className="btnTiny"
                    onClick={() => {
                      removeHistory(selectedHistoryItem.id);
                      setSelectedHistoryItem(null);
                    }}
                  >
                    삭제
                  </button>
                  <button
                    className="btnTiny"
                    onClick={() => {
                      const lines: string[] = [selectedHistoryItem.title, ""];
                      if (selectedHistoryItem.type === "SAJU") {
                        if (selectedHistoryItem.overview) lines.push("오늘의 흐름\n", selectedHistoryItem.overview, "\n");
                        if (selectedHistoryItem.personality) lines.push("성격\n", selectedHistoryItem.personality, "\n");
                        if (selectedHistoryItem.love) lines.push("연애\n", selectedHistoryItem.love, "\n");
                        if (selectedHistoryItem.career) lines.push("직장\n", selectedHistoryItem.career, "\n");
                        if (selectedHistoryItem.money) lines.push("금전\n", selectedHistoryItem.money, "\n");
                        if (selectedHistoryItem.thisYear) lines.push("올해의 흐름\n", selectedHistoryItem.thisYear, "\n");
                        if (selectedHistoryItem.advice) lines.push("조언\n", selectedHistoryItem.advice, "\n");
                        if (selectedHistoryItem.luckyElement || selectedHistoryItem.luckyColor) {
                          lines.push("행운: ", [selectedHistoryItem.luckyElement, selectedHistoryItem.luckyColor].filter(Boolean).join(" · "), "\n");
                        }
                      } else if (selectedHistoryItem.type === "ZODIAC" || selectedHistoryItem.type === "TAROT") {
                        if (selectedHistoryItem.message) lines.push("오늘의 메시지\n", selectedHistoryItem.message, "\n");
                        if (selectedHistoryItem.love) lines.push("연애\n", selectedHistoryItem.love, "\n");
                        if (selectedHistoryItem.career) lines.push("직장\n", selectedHistoryItem.career, "\n");
                        if (selectedHistoryItem.money) lines.push("금전\n", selectedHistoryItem.money, "\n");
                        if (selectedHistoryItem.advice) lines.push("조언\n", selectedHistoryItem.advice, "\n");
                        if (selectedHistoryItem.luckyNumber != null || selectedHistoryItem.luckyColor) {
                          lines.push("행운: ", [selectedHistoryItem.luckyNumber, selectedHistoryItem.luckyColor].filter(Boolean).join(" · "), "\n");
                        }
                      }
                      if (lines.length === 2) lines.push(selectedHistoryItem.text);
                      navigator.clipboard?.writeText(lines.join(""));
                      showToast("결과를 복사했어요");
                    }}
                  >
                    복사
                  </button>
                  <button
                    className="btnTiny"
                    onClick={() => setSelectedHistoryItem(null)}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* PWA 설치 유도 배너 (복귀 여부와 관계없이 표시 - 로컬/배포 동일 동작) */}
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
      {/* 구독 제안 모달 */}
      {showSubscribeSuggestion && (
        <div className="modalOverlay" style={{ zIndex: 9999 }} onClick={() => closeSubscribeSuggestion()}>
          <div className="modalSheet" style={{ maxWidth: "340px", textAlign: "center", padding: "32px 24px" }} onClick={(e) => e.stopPropagation()}>
            {/* 이모지 삭제됨 */}
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "#2c3e50" }}>
              LUMEN이 마음에 드셨나요?
            </h3>
            <p style={{ fontSize: "14px", color: "#666", lineHeight: "1.6", marginBottom: "24px" }}>
              매일 아침, 당신을 위한 오늘의 흐름을<br />
              이메일로 무료로 받아보세요.
            </p>

            <button
              className="btn btnPrimary btnWide"
              onClick={() => {
                closeSubscribeSuggestion(true);
                scrollTo(subscribeRef);
              }}
              style={{ marginBottom: "12px", height: "48px", borderRadius: "12px" }}
            >
              매일 아침 받아보기
            </button>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px" }}>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#999",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: "8px"
                }}
                onClick={() => {
                  localStorage.setItem("lumen_popup_hide_date", new Date().toDateString());
                  setShowSubscribeSuggestion(false);
                }}
              >
                오늘 하루 안 보기
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#999",
                  fontSize: "13px",
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: "8px"
                }}
                onClick={() => closeSubscribeSuggestion(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 구독 모달 */}
      {stibeeModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setStibeeModalOpen(false)}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1a2332 0%, #2d3a4f 100%)",
              borderRadius: "20px",
              padding: "40px 32px",
              maxWidth: "400px",
              width: "100%",
              position: "relative",
              color: "#fff"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setStibeeModalOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
                opacity: 0.7
              }}
            >
              ×
            </button>

            {/* 모달 콘텐츠 */}
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#d4a574", marginBottom: "8px" }}>
                LUMEN
              </h2>
              <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "32px" }}>
                매일 아침, 오늘의 흐름을 받아보세요
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const form = e.target as HTMLFormElement
                  const emailInput = form.elements.namedItem('subscribeEmail') as HTMLInputElement
                  const email = emailInput?.value?.trim()

                  if (!email) {
                    showToast("이메일을 입력해주세요")
                    return
                  }

                  try {
                    const res = await fetch('/api/subscribers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    })

                    if (res.ok) {
                      showToast("구독 완료! 환영 이메일을 확인해주세요")
                      setStibeeModalOpen(false)
                    } else {
                      const data = await res.json()
                      showToast(data.error || "구독에 실패했습니다")
                    }
                  } catch (err) {
                    showToast("네트워크 오류가 발생했습니다")
                  }
                }}
              >
                <input
                  type="email"
                  name="subscribeEmail"
                  placeholder="이메일 주소를 입력하세요"
                  style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "16px",
                    border: "none",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    marginBottom: "16px",
                    outline: "none"
                  }}
                  required
                />
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "16px",
                    fontWeight: 700,
                    border: "none",
                    borderRadius: "12px",
                    background: "#d4a574",
                    color: "#1a2332",
                    cursor: "pointer"
                  }}
                >
                  구독하기
                </button>
              </form>

              <p style={{ fontSize: "12px", opacity: 0.5, marginTop: "16px" }}>
                스팸 없이, 오직 운세만 보내드려요
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Suspense Boundary로 감싼 진짜 Page 컴포넌트
export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
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

