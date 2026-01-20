"use client";

// 타로 카드 아이콘 SVG 컴포넌트
function TarotIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="4" y="6" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M8 10H16M8 14H16M8 18H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
    </svg>
  );
}

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import tarotCardsData from "../data/tarot-cards.json";
import { MAJOR_ARCANA } from "../utils/constants";
import { shareResult, formatTarotShare } from "../utils/share";
import EmailInputModal from "../components/EmailInputModal";

const HISTORY_KEY = "lumen_history_v2";

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type HistoryItem = {
  id: string;
  type: "SAJU" | "TAROT";
  title: string;
  text: string;
  tags: string[];
  createdAt: number;
  isPremium?: boolean;
};

type TarotCategory = "love" | "money" | "work" | "advice";

type TarotInterpretation = {
  title: string;
  text: string;
  tags: string[];
};

type TarotCard = {
  id: number;
  name: string;
  title: string;
  interpretations: {
    love: TarotInterpretation;
    money: TarotInterpretation;
    work: TarotInterpretation;
    advice: TarotInterpretation;
  };
};

// 셔플 애니메이션 타로 카드 피커
type ShuffleStage =
  | "waiting" // 버튼 클릭 대기 (카드 안 보임)
  | "intro" // 카드들이 중앙으로 모이는 애니메이션
  | "stacked" // 덱이 쌓여있는 상태 (클릭 대기)
  | "shuffling" // 셔플 애니메이션
  | "spread" // 3장 펼쳐진 상태
  | "selecting" // 카드 선택 중
  | "flipping" // 카드 뒤집기
  | "result"; // 결과 표시

// 순수 랜덤으로 3장의 카드 인덱스 반환
function getRandomCardIndices(totalCards: number): number[] {
  const indices: number[] = [];
  const available = Array.from({ length: totalCards }, (_, i) => i);

  // 3장 선택
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    indices.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }

  return indices;
}

function TarotShufflePicker({
  cards,
  onCardSelect,
  stage,
  selectedCardIndex,
  selectedSpreadIndex,
  shufflePhase = 0,
  onCardImageClick,
  isReversed = false,
}: {
  cards: TarotCard[];
  onCardSelect?: (cardIndex: number, spreadIndex: number) => void;
  stage: ShuffleStage;
  selectedCardIndex: number | null;
  selectedSpreadIndex: number | null;
  shufflePhase?: number;
  onCardImageClick?: () => void;
  isReversed?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // 모바일 감지

  // 터치 이벤트 추적 (스크롤과 클릭 구분)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );

  // 랜덤으로 선택된 3장의 카드 인덱스
  const [spreadCards, setSpreadCards] = useState<number[]>([]);

  // 미리 계산된 랜덤 위치값들 (hydration 에러 방지) - 인트로 제거
  const [randomPositions, setRandomPositions] = useState<{
    stacked: { offset: number; rotation: number }[];
    shuffle: { x: number; y: number; rotation: number }[];
  }>({ stacked: [], shuffle: [] });

  // 클라이언트에서만 랜덤값 생성 및 모바일 감지
  useEffect(() => {
    setIsClient(true);

    // 실제 모바일 디바이스 감지 (터치 지원 + 작은 화면)
    const checkMobile = () => {
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    setRandomPositions({
      stacked: cards.map((_, i) => ({
        offset: (i - cards.length / 2) * 0.4,
        rotation: 0, // 정면으로 보이도록 회전 없음
      })),
      shuffle: cards.map(() => ({
        // 기본값 사용 (실제 거리는 transform에서 isMobile 체크하여 조정)
        x: (Math.random() - 0.5) * 150,
        y: (Math.random() - 0.5) * 60,
        rotation: (Math.random() - 0.5) * 20,
      })),
    });

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, [cards.length]);

  // spread 단계로 넘어갈 때마다 새로운 랜덤 카드 3장 선택
  useEffect(() => {
    if (stage === "spread" && isClient && spreadCards.length === 0) {
      const randomIndices = getRandomCardIndices(cards.length);
      setSpreadCards(randomIndices);
    }
  }, [stage, cards.length, isClient, spreadCards.length]);

  // 셔플마다 새로운 랜덤 위치 생성 (더 자연스러운 애니메이션)
  // shufflePhase가 변경될 때마다 새로운 랜덤 위치 생성
  useEffect(() => {
    if (stage === "shuffling" && isClient && shufflePhase > 0) {
      setRandomPositions((prev) => ({
        ...prev,
        shuffle: cards.map(() => ({
          x: (Math.random() - 0.5) * 150,
          y: (Math.random() - 0.5) * 60,
          rotation: (Math.random() - 0.5) * 20,
        })),
      }));
    }
  }, [stage, shufflePhase, cards.length, isClient]);

  const handleSpreadCardClick = (spreadIndex: number, cardIndex: number) => {
    if (stage === "spread" && onCardSelect) {
      onCardSelect(cardIndex, spreadIndex);
    }
  };

  // hydration 에러 방지: 서버와 클라이언트에서 동일한 구조 렌더링
  // isClient가 false여도 동일한 구조를 렌더링하되, 위치값은 기본값 사용

  return (
    <div ref={containerRef} className="tarotShuffleContainer">
      {/* 인트로/스택/셔플 단계의 모든 카드 */}
      {(stage === "stacked" || stage === "shuffling") &&
        cards.map((card, i) => {
          let transform = "";
          let opacity = 1;
          let zIndex = i;
          let transition = "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";

          if (stage === "stacked") {
            const pos = randomPositions.stacked[i] || {
              offset: 0,
              rotation: 0,
            };
            // 정면으로 보이도록 모든 회전 제거 (rotateX, rotateY, rotateZ 모두 0)
            transform = `translate(calc(-50% + ${pos.offset
              }px), calc(-50% + ${-pos.offset}px)) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
            opacity = 1;
            zIndex = i;
          } else if (stage === "shuffling") {
            // hydration 에러 방지: 서버와 클라이언트에서 항상 동일한 기본값 사용
            // isClient가 false일 때는 항상 기본값(0)을 사용하여 서버와 클라이언트 일치 보장
            const pos =
              isClient && randomPositions.shuffle[i]
                ? randomPositions.shuffle[i]
                : { x: 0, y: 0, rotation: 0 };

            // shufflePhase에 따라 좌우로 번갈아 흩어지기
            const direction = shufflePhase % 2 === 0 ? 1 : -1;
            const groupIndex = i % 3;
            let xMove = 0;
            let yMove = 0;

            // hydration 에러 방지: isClient가 false면 항상 PC 버전으로 렌더링
            // 서버와 클라이언트 초기 렌더링에서 동일한 값 사용
            if (isClient && isMobile) {
              if (groupIndex === 0) {
                xMove = direction * 50;
                yMove = -8;
              } else if (groupIndex === 1) {
                xMove = direction * -40;
                yMove = 12;
              } else {
                xMove = direction * 25;
                yMove = -20;
              }
            } else {
              // PC는 기존 거리 유지 (서버에서도 동일)
              if (groupIndex === 0) {
                xMove = direction * 120;
                yMove = -20;
              } else if (groupIndex === 1) {
                xMove = direction * -100;
                yMove = 30;
              } else {
                xMove = direction * 60;
                yMove = -50;
              }
            }

            // 중앙 기준으로 이동
            // hydration 에러 방지: isClient가 false면 항상 PC 버전으로 렌더링
            const isMobileForTransform = isClient && isMobile;
            // pos 값이 undefined일 수 있으므로 안전하게 처리
            const posX = pos.x ?? 0;
            const posY = pos.y ?? 0;
            const posRotation = pos.rotation ?? 0;
            // 회전 각도를 제한하여 카드 뒷면이 보이지 않도록 (최대 ±15도)
            const rotationValue =
              posRotation * direction * (isMobileForTransform ? 0.7 : 1);
            const maxRotation = isMobileForTransform ? 10 : 15;
            // 명시적으로 처리하여 서버와 클라이언트에서 동일한 결과 보장
            let rotationAngle = rotationValue;
            if (rotationValue > maxRotation) rotationAngle = maxRotation;
            if (rotationValue < -maxRotation) rotationAngle = -maxRotation;
            transform = `translate(calc(-50% + ${xMove + posX * (isMobileForTransform ? 0.1 : 0.3)
              }px), calc(-50% + ${yMove + posY * (isMobileForTransform ? 0.08 : 0.2)
              }px)) rotate(${rotationAngle}deg)`;
            // 모바일에서는 transition 시간과 delay를 조정하여 부드럽게
            const transitionDuration = isMobileForTransform ? 0.3 : 0.25;
            const cardDelay = i * (isMobileForTransform ? 0.005 : 0.008);
            transition = `all ${transitionDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${cardDelay}s`;
            // zIndex를 더 안정적으로 관리
            zIndex = i + (shufflePhase % 2 === 0 ? 0 : 100);
          }

          return (
            <div
              key={card.id}
              className={`tarotShuffleCard stage-${stage}`}
              style={{
                transform,
                opacity,
                zIndex,
                transition,
                cursor: stage === "stacked" ? "pointer" : "default",
              }}
            >
              {/* 단순화된 카드 뒷면 */}
              <div className="tarotCardBack">
                <span className="tarotCardMoon"></span>
                <span className="tarotCardLogo">LUMEN</span>
              </div>
            </div>
          );
        })}

      {/* 스프레드 단계: 3장 일렬 배치 */}
      {(stage === "spread" ||
        stage === "selecting" ||
        stage === "flipping" ||
        stage === "result") &&
        spreadCards.map((cardIndex, spreadIndex) => {
          const card = cards[cardIndex];
          const isSelected = selectedSpreadIndex === spreadIndex;

          let transform = "";
          let opacity = 1;
          let zIndex = spreadIndex;

          if (stage === "spread") {
            // 3장 일렬 배치 (회전 없이, 중앙 기준) - 모바일에서는 간격 좁게
            // hydration 에러 방지: isClient가 false면 항상 PC 버전으로 렌더링
            const cardWidth = 92; // 카드 너비
            const cardGap = isClient && isMobile ? 120 : 200; // 모바일: 120px, PC: 200px
            const xOffset = (spreadIndex - 1) * cardGap;
            transform = `translate(calc(-50% + ${xOffset}px), -50%)`;
            opacity = 1;
            zIndex = spreadIndex;
          } else if (stage === "selecting") {
            if (isSelected) {
              transform = `translate(-50%, calc(-50% - 20px)) scale(1.1)`;
              opacity = 1;
              zIndex = 100;
            } else {
              // hydration 에러 방지: isClient가 false면 항상 PC 버전으로 렌더링
              const cardGap = isClient && isMobile ? 120 : 200; // 모바일: 120px, PC: 200px
              const xOffset = (spreadIndex - 1) * cardGap;
              transform = `translate(calc(-50% + ${xOffset}px), -50%) scale(0.95)`;
              opacity = 0.4;
              zIndex = spreadIndex;
            }
          } else if (stage === "flipping") {
            if (isSelected) {
              transform = `translate(-50%, calc(-50% - 20px)) scale(1.1)`;
              opacity = 1;
              zIndex = 100;
            } else {
              opacity = 0;
              transform = `translate(-50%, -50%) scale(0.5)`;
              zIndex = 0;
            }
          } else if (stage === "result") {
            if (isSelected) {
              // result 단계에서만 크게 표시 (PC는 작게, 모바일은 고정 크기)
              // 모바일에서는 CSS에서 !important로 고정되므로 transform은 최소한만 설정
              if (isClient && isMobile) {
                // 모바일: CSS에서 고정되므로 기본 transform만 설정
                transform = `translate(-50%, -50%)`;
              } else {
                // PC: 기존대로
                transform = `translate(-50%, calc(-50% - 20px)) scale(1.3)`;
              }
              opacity = 1;
              zIndex = 100;
            } else {
              opacity = 0;
              transform = `translate(-50%, -50%) scale(0.5)`;
              zIndex = 0;
            }
          }

          const isFlipped =
            (stage === "flipping" || stage === "result") && isSelected;

          // spread 단계에서는 hover 효과를 위한 xOffset을 CSS 변수로 저장
          const cardStyle: React.CSSProperties = {
            transform,
            opacity,
            zIndex,
            transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            cursor: stage === "spread" ? "pointer" : "default",
          };

          // spread 단계에서만 hover 시 사용할 xOffset 추가
          if (stage === "spread") {
            // hydration 에러 방지: isClient가 false면 항상 PC 버전으로 렌더링
            const cardGap = isClient && isMobile ? 120 : 200; // 모바일: 120px, PC: 200px
            const xOffset = (spreadIndex - 1) * cardGap;
            (cardStyle as any)["--hover-x-offset"] = `${xOffset}px`;
          }

          return (
            <div
              key={card.id}
              className={`tarotShuffleCard spread stage-${stage} ${isSelected ? "selected" : ""
                }`}
              style={cardStyle}
              onClick={() => {
                // spread 단계에서만 카드 선택
                if (stage === "spread") {
                  handleSpreadCardClick(spreadIndex, cardIndex);
                }
              }}
              onTouchStart={(e) => {
                // 모바일에서 터치 시작 위치 저장
                if (isClient && isMobile && stage === "result" && isSelected) {
                  const touch = e.touches[0];
                  touchStartRef.current = {
                    x: touch.clientX,
                    y: touch.clientY,
                    time: Date.now(),
                  };
                }
              }}
              onTouchEnd={(e) => {
                // 모바일에서 터치 종료 시 스크롤인지 클릭인지 구분
                if (
                  isClient &&
                  isMobile &&
                  stage === "result" &&
                  isSelected &&
                  touchStartRef.current
                ) {
                  const touch = e.changedTouches[0];
                  const deltaX = Math.abs(
                    touch.clientX - touchStartRef.current.x
                  );
                  const deltaY = Math.abs(
                    touch.clientY - touchStartRef.current.y
                  );
                  const deltaTime = Date.now() - touchStartRef.current.time;

                  // 이동 거리가 작고 시간이 짧으면 클릭으로 간주
                  if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
                    // 클릭 이벤트는 이미지에서만 처리
                    e.preventDefault();
                  }
                  touchStartRef.current = null;
                }
              }}
            >
              {/* 카드 플립 컨테이너 */}
              <div className="tarotCardFlip">
                <div
                  className={`tarotCardFlipInner ${isFlipped ? "flipped" : ""}`}
                >
                  {/* 뒷면 */}
                  <div className="tarotCardBack tarotCardFace">
                    <span className="tarotCardMoon"></span>
                    <span className="tarotCardLogo">LUMEN</span>
                  </div>
                  {/* 앞면 */}
                  <div className="tarotCardFront tarotCardFace">
                    <div className="tarotCardFrontContent">
                      <img
                        src={`/tarot/${card.id}.png`}
                        alt={card.name}
                        className="tarotCardImage"
                        loading="eager"
                        onClick={(e) => {
                          // result 단계에서 이미지를 직접 클릭했을 때만 모달 열기
                          if (stage === "result" && isSelected) {
                            e.stopPropagation();
                            if (onCardImageClick) {
                              onCardImageClick();
                            }
                          }
                        }}
                        onTouchStart={(e) => {
                          // 모바일에서 이미지 터치 시작
                          if (stage === "result" && isSelected) {
                            e.stopPropagation();
                            const touch = e.touches[0];
                            touchStartRef.current = {
                              x: touch.clientX,
                              y: touch.clientY,
                              time: Date.now(),
                            };
                          }
                        }}
                        onTouchEnd={(e) => {
                          // 모바일에서 이미지 터치 종료 시 클릭 처리
                          if (
                            stage === "result" &&
                            isSelected &&
                            touchStartRef.current
                          ) {
                            e.stopPropagation();
                            const touch = e.changedTouches[0];
                            const deltaX = Math.abs(
                              touch.clientX - touchStartRef.current.x
                            );
                            const deltaY = Math.abs(
                              touch.clientY - touchStartRef.current.y
                            );
                            const deltaTime =
                              Date.now() - touchStartRef.current.time;

                            // 이동 거리가 작고 시간이 짧으면 클릭으로 간주
                            if (deltaX < 15 && deltaY < 15 && deltaTime < 400) {
                              if (onCardImageClick) {
                                onCardImageClick();
                              }
                            }
                            touchStartRef.current = null;
                          }
                        }}
                        style={{
                          cursor:
                            stage === "result" && isSelected
                              ? "pointer"
                              : "default",
                          touchAction: "manipulation", // 모바일 터치 최적화
                          transform: isSelected && isReversed ? "rotate(180deg)" : "none",
                          transition: "transform 0.3s ease",
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (
                            parent &&
                            !parent.querySelector(".tarotCardFallback")
                          ) {
                            const fallback = document.createElement("div");
                            fallback.className = "tarotCardFallback";
                            fallback.textContent = card.name;
                            parent.appendChild(fallback);
                          }
                        }}
                        onLoad={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.opacity = "1";
                          target.style.display = "block";
                          // fallback 제거
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback =
                              parent.querySelector(".tarotCardFallback");
                            if (fallback) {
                              fallback.remove();
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

      {/* 덱 클릭 안내 오버레이 */}
      {stage === "stacked" && (
        <div className="deckClickOverlay">
          <span>탭하여 셔플</span>
        </div>
      )}
    </div>
  );
}

export default function TarotPage() {
  const router = useRouter();
  const [picked, setPicked] = useState<number | null>(null);
  const [pickedSpreadIndex, setPickedSpreadIndex] = useState<number | null>(
    null
  );
  const [flipped, setFlipped] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCardImageModal, setShowCardImageModal] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<TarotCategory>("advice");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [apiResult, setApiResult] = useState<{
    message: string;
    love: string;
    career: string;
    money: string;
    advice: string;
    keywords: string[];
  } | null>(null);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isReversed, setIsReversed] = useState(false);

  // 토스트 메시지
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // 이메일 전송 모달
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [pendingSaveItem, setPendingSaveItem] = useState<HistoryItem | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

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
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.email) {
          setUserEmail(data.email);
        }
      }
    } catch (error) {
      console.error("Error loading user email from DB:", error);
    }
  };

  // 이메일 로드 (localStorage에서)
  useEffect(() => {
    const savedEmail = localStorage.getItem("lumen_user_email");
    if (savedEmail) {
      setUserEmail(savedEmail);
    }
  }, []);

  // 단계별 상태 관리 (새로운 셔플 방식) - 인트로 제거, stacked에서 시작
  // 초기에는 카드가 보이지 않도록 "waiting" 단계 추가
  const [stage, setStage] = useState<ShuffleStage>("waiting");

  useEffect(() => {
    const m = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setCanHover(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);

  // 인트로 단계 제거됨 - 바로 stacked로 시작

  // 셔플 카운터 (여러 번 반복)
  const [shuffleCount, setShuffleCount] = useState(0);

  // 타로 뽑기 버튼 클릭 시 셔플 시작
  const startShuffle = () => {
    if (stage !== "waiting" && stage !== "stacked") return;
    setShuffleCount(0);
    // waiting에서 시작하면 먼저 stacked로 이동
    if (stage === "waiting") {
      setStage("stacked");
      // stacked 단계로 이동한 후 바로 셔플 시작
      setTimeout(() => {
        setStage("shuffling");
      }, 100);
    } else {
      setStage("shuffling");
    }
  };

  // 모바일 감지 (셔플 속도 조정용)
  const [isMobileForShuffle, setIsMobileForShuffle] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileForShuffle(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 셔플 애니메이션 반복 (3번 섞기)
  // 모바일에서는 더 빠르게 반복
  useEffect(() => {
    if (stage === "shuffling") {
      if (shuffleCount < 3) {
        // transition 시간 + 마지막 카드 delay + 여유시간 계산
        // PC와 모바일의 delay 간격이 다르므로 각각 계산
        const transitionTime = isMobileForShuffle ? 300 : 250;
        const delayInterval = isMobileForShuffle ? 0.005 : 0.008; // 각각의 delay 간격
        const maxDelay = (21 - 1) * delayInterval; // 마지막 카드의 delay
        const totalTime = Math.ceil(
          transitionTime + maxDelay * 1000 + (isMobileForShuffle ? 80 : 60)
        );

        const timer = setTimeout(() => {
          setShuffleCount((c) => c + 1);
        }, totalTime);
        return () => clearTimeout(timer);
      } else {
        // 셔플 완료 후 스프레드 (transition 시간 + 마지막 delay 고려)
        const transitionTime = isMobileForShuffle ? 300 : 250;
        const delayInterval = isMobileForShuffle ? 0.005 : 0.008;
        const maxDelay = (21 - 1) * delayInterval;
        const totalTime = Math.ceil(
          transitionTime + maxDelay * 1000 + (isMobileForShuffle ? 50 : 40)
        );
        const timer = setTimeout(() => {
          setStage("spread");
        }, totalTime);
        return () => clearTimeout(timer);
      }
    }
  }, [stage, shuffleCount, isMobileForShuffle]);

  // 타로 카드 데이터 (JSON에서 로드)
  const tarotDeck = useMemo(() => {
    return tarotCardsData as TarotCard[];
  }, []);

  // 부채꼴 덱용 카드 21장 (임시)
  const fanDeckCards = useMemo(() => {
    return tarotDeck.slice(0, 21);
  }, [tarotDeck]);

  const resetTarot = () => {
    setPicked(null);
    setPickedSpreadIndex(null);
    setFlipped(false);
    setStage("waiting"); // 초기 상태로 리셋 (카드 안 보임)
    setSelectedCategory("advice");
    setCurrentCardIndex(0);
    setShuffleCount(0); // 셔플 카운터도 리셋
    setApiResult(null);
    setApiError(null);
    setLoadingApi(false);
    setIsReversed(false);
  };

  const pickTarot = async (cardIndex: number, spreadIndex: number) => {
    // 중복 호출 방지: 이미 선택했거나 로딩 중이면 무시
    if (picked !== null || loadingApi) return;

    setPicked(cardIndex);
    setPickedSpreadIndex(spreadIndex);
    setCurrentCardIndex(cardIndex);
    setApiResult(null);
    setApiError(null);
    setLoadingApi(true);

    // 2단계: 카드 선택 (나머지 fade out)
    setStage("selecting");

    const selectedCard = tarotDeck[cardIndex];

    // MAJOR_ARCANA에서 nameKo 찾기
    const cardInfo = MAJOR_ARCANA.find((c) => c.id === selectedCard.id);
    const nameKo = cardInfo?.nameKo || selectedCard.title;

    // 랜덤으로 역방향 결정 (50% 확률)
    const reversed = Math.random() < 0.5;
    setIsReversed(reversed);

    // API 호출
    try {
      let response;
      try {
        response = await fetch("/api/tarot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardName: selectedCard.name,
            cardNameKo: nameKo,
            isReversed: reversed,
          }),
        });
      } catch (fetchError) {
        // 네트워크 오류 (모바일에서 자주 발생)
        console.error("Network fetch error:", fetchError);
        throw new Error("네트워크 연결을 확인해주세요. 잠시 후 다시 시도해주세요");
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ success: false, error: "API 오류" }));
        throw new Error(
          errorData.error ||
          "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요"
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "API 호출 실패");
      }

      // API 응답을 interpretations 형식으로 변환
      const data = result.data;
      setApiResult({
        message: data.message || "",
        love: data.love || "",
        career: data.career || "",
        money: data.money || "",
        advice: data.advice || "",
        keywords: data.keywords || [],
      });
    } catch (err) {
      console.error(`❌ [Tarot] Error:`, err);
      setApiError(
        err instanceof Error
          ? err.message
          : "별들이 잠시 쉬고 있어요. 조금 후 다시 시도해주세요 🌙"
      );
    } finally {
      setLoadingApi(false);
    }

    // 3단계: 카드 뒤집기 (0.5초 후)
    setTimeout(() => {
      setStage("flipping");
      setFlipped(true);

      // 4단계: 해석 표시 (뒤집기 완료 후)
      setTimeout(() => {
        setStage("result");
      }, 700); // flip 애니메이션 시간
    }, 500); // selecting 애니메이션 시간
  };

  const tarotResult = useMemo(() => {
    if (picked === null) return null;
    return tarotDeck[picked];
  }, [picked, tarotDeck]);

  const currentInterpretation = useMemo(() => {
    if (!tarotResult || !apiResult) return null;

    // API 응답을 interpretations 형식으로 변환
    const categoryMap: Record<
      TarotCategory,
      { title: string; text: string; tags: string[] }
    > = {
      love: {
        title: "연애운",
        text: apiResult.love,
        tags: apiResult.keywords.filter(
          (k) =>
            k.toLowerCase().includes("love") ||
            k.toLowerCase().includes("연애") ||
            k.toLowerCase().includes("사랑")
        ),
      },
      money: {
        title: "금전운",
        text: apiResult.money,
        tags: apiResult.keywords.filter(
          (k) =>
            k.toLowerCase().includes("money") ||
            k.toLowerCase().includes("금전") ||
            k.toLowerCase().includes("재물")
        ),
      },
      work: {
        title: "직장/학업운",
        text: apiResult.career,
        tags: apiResult.keywords.filter(
          (k) =>
            k.toLowerCase().includes("career") ||
            k.toLowerCase().includes("직장") ||
            k.toLowerCase().includes("학업") ||
            k.toLowerCase().includes("업무")
        ),
      },
      advice: {
        title: "조언",
        text: apiResult.advice,
        tags: apiResult.keywords.filter(
          (k) =>
            k.toLowerCase().includes("advice") ||
            k.toLowerCase().includes("조언") ||
            k.toLowerCase().includes("가이드")
        ),
      },
    };

    return (
      categoryMap[selectedCategory] || {
        title: "메시지",
        text: apiResult.message,
        tags: apiResult.keywords,
      }
    );
  }, [tarotResult, apiResult, selectedCategory]);

  // 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart) return;
    const deltaX = e.touches[0].clientX - swipeStart.x;
    const deltaY = e.touches[0].clientY - swipeStart.y;

    // 수평 스와이프만 처리
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeStart) return;

    const threshold = 50; // 스와이프 임계값
    let newIndex = currentCardIndex;

    if (swipeOffset > threshold && currentCardIndex > 0) {
      // 오른쪽으로 스와이프 (이전 카드)
      newIndex = currentCardIndex - 1;
      setCurrentCardIndex(newIndex);
    } else if (
      swipeOffset < -threshold &&
      currentCardIndex < tarotDeck.length - 1
    ) {
      // 왼쪽으로 스와이프 (다음 카드)
      newIndex = currentCardIndex + 1;
      setCurrentCardIndex(newIndex);
    }

    // 스와이프가 끝나면 자동으로 중앙 카드 선택
    if (
      picked === null &&
      (swipeOffset > threshold || swipeOffset < -threshold)
    ) {
      setTimeout(() => {
        setPicked(newIndex);
        window.setTimeout(() => setFlipped(true), 220);
      }, 300); // 스와이프 애니메이션 후 선택
    }

    setSwipeStart(null);
    setSwipeOffset(0);
  };

  // 마우스 드래그 지원
  const handleMouseDown = (e: React.MouseEvent) => {
    setSwipeStart({ x: e.clientX, y: e.clientY });
    setSwipeOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!swipeStart) return;
    const deltaX = e.clientX - swipeStart.x;
    const deltaY = e.clientY - swipeStart.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffset(deltaX);
    }
  };

  const handleMouseUp = () => {
    if (!swipeStart) return;

    const threshold = 50;
    let newIndex = currentCardIndex;

    if (swipeOffset > threshold && currentCardIndex > 0) {
      newIndex = currentCardIndex - 1;
      setCurrentCardIndex(newIndex);
    } else if (
      swipeOffset < -threshold &&
      currentCardIndex < tarotDeck.length - 1
    ) {
      newIndex = currentCardIndex + 1;
      setCurrentCardIndex(newIndex);
    }

    // 스와이프가 끝나면 자동으로 중앙 카드 선택
    if (
      picked === null &&
      (swipeOffset > threshold || swipeOffset < -threshold)
    ) {
      setTimeout(() => {
        setPicked(newIndex);
        window.setTimeout(() => setFlipped(true), 220);
      }, 300); // 스와이프 애니메이션 후 선택
    }

    setSwipeStart(null);
    setSwipeOffset(0);
  };

  // 이메일 전송 (기록 저장은 선택적)
  const handleSendEmail = async (email: string, saveToHistory: boolean, saveEmail: boolean) => {
    if (!pendingSaveItem || !sessionId) return;

    // DB에 세션별 이메일 저장 (이메일 저장하기를 선택한 경우)
    if (saveEmail) {
      try {
        await fetch("/api/user-email", {
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
      } catch (error) {
        console.error("Failed to save email to DB:", error);
      }
      setUserEmail(email);
    }

    try {
      // 이메일 전송 (전체 결과 포함)
      const fullData = (pendingSaveItem as any).fullData;
      let emailText = "";
      let emailTitle = pendingSaveItem.title;

      if (fullData) {
        // 전체 결과 포맷팅
        emailTitle = `[타로] ${fullData.cardName}${fullData.isReversed ? " (역방향)" : ""}`;
        emailText = `오늘의 메시지\n${fullData.message}\n\n`;
        emailText += `연애\n${fullData.love}\n\n`;
        emailText += `금전\n${fullData.money}\n\n`;
        emailText += `직장\n${fullData.career}\n\n`;
        emailText += `조언\n${fullData.advice}`;
      } else {
        emailText = pendingSaveItem.text;
      }

      const emailResponse = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          type: pendingSaveItem.type,
          title: emailTitle,
          text: emailText,
          tags: pendingSaveItem.tags,
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
            type: typeMap[pendingSaveItem.type] || "tarot",
            result_json: {
              title: pendingSaveItem.title,
              text: pendingSaveItem.text,
              tags: pendingSaveItem.tags,
              isPremium: false,
            },
          }),
        });

        if (!saveResponse.ok) {
          console.error("Failed to save to history, but email sent");
        }
      }

      showToast(saveToHistory ? "이메일을 보냈고 기록에 저장했어요" : "이메일을 보냈어요");
      setPendingSaveItem(null);
    } catch (error) {
      console.error("Send email error:", error);
      throw error;
    }
  };

  const saveTarot = () => {
    if (!tarotResult || !apiResult) return;

    const categoryLabels: Record<TarotCategory, string> = {
      love: "연애",
      money: "금전",
      work: "직장",
      advice: "조언",
    };

    // 전체 결과를 포함한 아이템 생성
    const item: HistoryItem = {
      id: uid(),
      type: "TAROT",
      title: `[타로] ${tarotResult.name}${isReversed ? " (역방향)" : ""}`,
      text: currentInterpretation?.text || "",
      tags: apiResult.keywords,
      createdAt: Date.now(),
    };

    // 이메일 모달 표시 (전체 결과 데이터도 함께 저장)
    setPendingSaveItem({
      ...item,
      // 전체 결과 데이터를 포함
      fullData: {
        cardName: tarotResult.name,
        isReversed: isReversed,
        message: apiResult.message,
        love: apiResult.love,
        money: apiResult.money,
        career: apiResult.career,
        advice: apiResult.advice,
        keywords: apiResult.keywords,
      },
    } as any);
    setEmailModalOpen(true);
  };

  const onEmptyTapReset = (e: React.PointerEvent<HTMLDivElement>) => {
    if (canHover) return;
    const el = e.target as HTMLElement;
    if (el.closest("button")) return;
    if (el.closest(".tarotShuffleCard")) return; // 카드 클릭은 무시
    // result 단계에서는 빈 공간 터치로 리셋하지 않음
    if (picked !== null && stage !== "result") resetTarot();
  };

  return (
    <main className="mainWrap">
      <div className="bgFX" />
      <div className="content">
        {/* 밤하늘 헤더 */}
        <section className="subPageHeader reveal on">
          <div className="subPageStars">
            {[
              { left: 15, top: 20, delay: 0 },
              { left: 28, top: 35, delay: 0.5 },
              { left: 42, top: 15, delay: 1 },
              { left: 55, top: 45, delay: 1.5 },
              { left: 68, top: 25, delay: 0.3 },
              { left: 82, top: 40, delay: 0.8 },
              { left: 20, top: 55, delay: 1.2 },
              { left: 35, top: 60, delay: 0.6 },
              { left: 50, top: 30, delay: 1.8 },
              { left: 75, top: 50, delay: 0.2 },
              { left: 88, top: 18, delay: 1.4 },
              { left: 12, top: 42, delay: 0.9 },
            ].map((star, i) => (
              <div
                key={i}
                className="star"
                style={{
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  animationDelay: `${star.delay}s`,
                }}
              />
            ))}
          </div>
          <div className="container center">
            <div style={{ marginBottom: 16 }}>
              <Link
                href="/"
                className="btnBack"
              >
                ← 홈으로 돌아가기
              </Link>
            </div>

            <h1 className="h2 stagger d1" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <TarotIcon size={20} />
              타로 카드
            </h1>
            <p className="p stagger d2">
              {stage === "waiting" && "타로 카드를 뽑아보세요"}
              {stage === "stacked" && "덱을 탭하여 셔플하세요"}
              {stage === "spread" && "직감으로 한 장을 선택하세요"}
              {stage === "shuffling" && "카드를 섞고 있어요..."}
              {(stage === "selecting" || stage === "flipping") && (
                <span>
                  타로를 해석하고 있어요...
                </span>
              )}
              {stage === "result" && "오늘의 메시지입니다"}
            </p>
          </div>
        </section>

        {/* 콘텐츠 섹션 */}
        <section className="section reveal on">
          <div className="container center">

            {/* 타로 뽑기 버튼 (waiting 단계에서만 표시) */}
            {stage === "waiting" && (
              <div className="stagger d3" style={{ marginTop: 20 }}>
                <button
                  className="btn btnPrimary btnWide"
                  onClick={startShuffle}
                >
                  타로 뽑기
                </button>
              </div>
            )}

            <div
              className="tarotArea stagger d3"
              onPointerDown={onEmptyTapReset}
              onClick={() => {
                if (stage === "stacked") {
                  startShuffle();
                }
              }}
              style={{ display: stage === "waiting" ? "none" : "block" }}
            >
              <TarotShufflePicker
                cards={fanDeckCards}
                onCardSelect={(cardIndex, spreadIndex) => {
                  // 로딩 중이거나 이미 선택했으면 클릭 무시
                  if (stage === "spread" && !loadingApi && picked === null) {
                    pickTarot(cardIndex, spreadIndex);
                  }
                }}
                stage={stage}
                selectedCardIndex={picked}
                selectedSpreadIndex={pickedSpreadIndex}
                shufflePhase={shuffleCount}
                onCardImageClick={() => setShowCardImageModal(true)}
                isReversed={isReversed}
              />
            </div>

            {tarotResult && stage === "result" ? (
              <div
                className="card cardPad lift stagger d4 tarotResultCard"
                style={{ marginTop: 100 }}
              >
                {/* 로딩은 전체 화면 오버레이로 표시됨 */}

                {apiError && !loadingApi && (
                  <div style={{ padding: "20px 0", textAlign: "center" }}>
                    <div className="p" style={{ color: "var(--muted)" }}>
                      {apiError}
                    </div>
                  </div>
                )}

                {!loadingApi && !apiError && apiResult && (
                  <div className="fadeSlideUp">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>
                        {tarotResult.name}
                        {isReversed && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 12,
                            color: "var(--gold-main)",
                            fontWeight: 600
                          }}>
                            역방향
                          </span>
                        )}
                      </div>
                      <div className="muted">오늘의 메시지</div>
                    </div>

                    {/* 카테고리 선택 탭 */}
                    <div
                      className="tabRow"
                      style={{ marginTop: 12 }}
                      aria-label="타로 카테고리"
                    >
                      {(
                        ["love", "money", "work", "advice"] as TarotCategory[]
                      ).map((category) => {
                        const labels: Record<TarotCategory, string> = {
                          love: "연애",
                          money: "금전",
                          work: "직장",
                          advice: "조언",
                        };
                        return (
                          <button
                            key={category}
                            className={`tabBtn ${category === selectedCategory ? "on" : ""
                              }`}
                            onClick={() => setSelectedCategory(category)}
                          >
                            {labels[category]}
                          </button>
                        );
                      })}
                    </div>

                    {/* 선택된 카테고리 해석 표시 */}
                    {currentInterpretation && (
                      <>
                        <div
                          style={{
                            marginTop: 12,
                            fontWeight: 900,
                            letterSpacing: -0.01,
                          }}
                        >
                          {currentInterpretation.title}
                        </div>
                        <div className="p" style={{ marginTop: 6 }}>
                          {currentInterpretation.text}
                        </div>

                        {currentInterpretation.tags.length > 0 && (
                          <div className="chipRow" style={{ marginTop: 8 }}>
                            {currentInterpretation.tags.map((t) => (
                              <span className="chip" key={t}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {!loadingApi && !apiError && apiResult && (
                  <div style={{ marginTop: 20, display: "grid", gap: 8 }}>
                    <button
                      className="btn btnPrimary btnWide"
                      onClick={saveTarot}
                    >
                      이메일로 보내기
                    </button>

                    <button
                      className="btn btnGhost btnWide"
                      onClick={async () => {
                        if (!tarotResult || !apiResult) return;
                        const cardNameKo = MAJOR_ARCANA.find(
                          (c) => c.name === tarotResult.name
                        )?.nameKo || tarotResult.name;

                        const shareData = formatTarotShare(
                          tarotResult.name,
                          cardNameKo,
                          isReversed,
                          apiResult.message,
                          apiResult.advice,
                          apiResult.keywords
                        );

                        const result = await shareResult(shareData);
                        if (result.success) {
                          if (result.method === "clipboard") {
                            showToast("결과가 복사되었어요!");
                          }
                        } else {
                          showToast("공유에 실패했어요");
                        }
                      }}
                    >
                      결과 공유하기
                    </button>

                    <button
                      className="btn btnGhost btnWide"
                      onClick={() => setShowDetailModal(true)}
                    >
                      자세히보기
                    </button>

                    <button
                      className="btn btnGhost btnWide"
                      onClick={resetTarot}
                    >
                      카드 다시 뽑기
                    </button>

                    <Link
                      href="/"
                      className="btn btnGhost btnWide"
                      style={{ textAlign: "center", textDecoration: "none" }}
                    >
                      돌아가기
                    </Link>
                  </div>
                )}

                {!loadingApi && !apiError && apiResult && (
                  <div className="smallHelp" style={{ marginTop: 10 }}>
                    * 다시 뽑기를 누르면 새로운 카드를 뽑을 수 있어요.
                  </div>
                )}
              </div>
            ) : null}

            {/* 자세히보기 팝업 */}
            {showDetailModal && tarotResult && apiResult && (
              <div
                className="modalOverlay"
                onClick={() => setShowDetailModal(false)}
              >
                <div
                  className="modalSheet"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modalHeader">
                    <div className="modalTitle">{tarotResult.name}</div>
                    <button
                      className="closeBtn"
                      onClick={() => setShowDetailModal(false)}
                      aria-label="닫기"
                    >
                      ×
                    </button>
                  </div>
                  <div className="modalBody">
                    <div style={{ display: "grid", gap: 24 }}>
                      {/* 전체 운세 */}
                      {apiResult.message && (
                        <div>
                          <div
                            className="zodiacCategoryLabel"
                            style={{ marginBottom: 8 }}
                          >
                            전체 운세
                          </div>
                          <div
                            className="p"
                            style={{
                              whiteSpace: "pre-line",
                              lineHeight: 1.8,
                              marginBottom: 12,
                            }}
                          >
                            {apiResult.message}
                          </div>
                        </div>
                      )}

                      {(
                        ["love", "money", "work", "advice"] as TarotCategory[]
                      ).map((category) => {
                        const labels: Record<TarotCategory, string> = {
                          love: "연애",
                          money: "금전",
                          work: "직장",
                          advice: "조언",
                        };
                        const categoryData: Record<TarotCategory, string> = {
                          love: apiResult.love,
                          money: apiResult.money,
                          work: apiResult.career,
                          advice: apiResult.advice,
                        };
                        const text = categoryData[category];
                        if (!text) return null;

                        return (
                          <div key={category}>
                            <div
                              className="zodiacCategoryLabel"
                              style={{ marginBottom: 8 }}
                            >
                              {labels[category]}
                            </div>
                            <div
                              className="p"
                              style={{
                                whiteSpace: "pre-line",
                                lineHeight: 1.8,
                                marginBottom: 12,
                              }}
                            >
                              {text}
                            </div>
                            {apiResult.keywords &&
                              apiResult.keywords.length > 0 && (
                                <div className="chipRow">
                                  {apiResult.keywords.map((t) => (
                                    <span className="chip" key={t}>
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 카드 이미지 상세 보기 모달 */}
            {showCardImageModal && tarotResult && (
              <div
                className="modalOverlay"
                onClick={() => setShowCardImageModal(false)}
              >
                <div
                  className="modalSheet"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: "90vw", maxHeight: "90vh" }}
                >
                  <div className="modalHeader">
                    <div className="modalTitle">{tarotResult.name}</div>
                    <button
                      className="closeBtn"
                      onClick={() => setShowCardImageModal(false)}
                      aria-label="닫기"
                    >
                      ×
                    </button>
                  </div>
                  <div
                    className="modalBody"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "20px",
                    }}
                  >
                    <img
                      src={`/tarot/${tarotResult.id}.png`}
                      alt={tarotResult.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "70vh",
                        objectFit: "contain",
                        borderRadius: "12px",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 로딩 중 터치 방지 오버레이 */}
      {loadingApi && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.3)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid rgba(255,255,255,0.3)",
              borderTop: "4px solid var(--gold-main)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ color: "var(--cream)", fontSize: 14, fontWeight: 600 }}>
            타로를 해석하고 있어요...
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {toast && (
        <div className="toast">{toast}</div>
      )}

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
    </main>
  );
}
