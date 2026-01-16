"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import tarotCardsData from "../data/tarot-cards.json";

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
  | "intro" // 카드들이 중앙으로 모이는 애니메이션
  | "stacked" // 덱이 쌓여있는 상태 (클릭 대기)
  | "shuffling" // 셔플 애니메이션
  | "spread" // 3장 펼쳐진 상태
  | "selecting" // 카드 선택 중
  | "flipping" // 카드 뒤집기
  | "result"; // 결과 표시

// 날짜 기반 시드 생성 함수 (매일 자정 기준)
function getDateSeed(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return year * 10000 + month * 100 + day;
}

// 시드 기반 랜덤 생성기 (간단한 LCG 알고리즘)
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// 날짜 기반으로 고정된 3장의 카드 인덱스 반환
function getTodayCardIndices(totalCards: number): number[] {
  const seed = getDateSeed();
  const random = seededRandom(seed);

  const indices: number[] = [];
  const available = Array.from({ length: totalCards }, (_, i) => i);

  // 3장 선택
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(random() * available.length);
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
}: {
  cards: TarotCard[];
  onCardSelect?: (cardIndex: number, spreadIndex: number) => void;
  stage: ShuffleStage;
  selectedCardIndex: number | null;
  selectedSpreadIndex: number | null;
  shufflePhase?: number;
  onCardImageClick?: () => void;
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

  // stacked 단계에서 오늘의 카드 3장 선택 (날짜 기반 - 매일 자정 기준)
  useEffect(() => {
    if (stage === "stacked" && isClient) {
      const todayIndices = getTodayCardIndices(cards.length);
      setSpreadCards(todayIndices);
    }
  }, [stage, cards.length, isClient]);

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
            transform = `translate(calc(-50% + ${
              pos.offset
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
            transform = `translate(calc(-50% + ${
              xMove + posX * (isMobileForTransform ? 0.1 : 0.3)
            }px), calc(-50% + ${
              yMove + posY * (isMobileForTransform ? 0.08 : 0.2)
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
                <span className="tarotCardMoon">☽</span>
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
              className={`tarotShuffleCard spread stage-${stage} ${
                isSelected ? "selected" : ""
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
                    <span className="tarotCardMoon">☽</span>
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
  const [hovered, setHovered] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCardImageModal, setShowCardImageModal] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<TarotCategory>("advice");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [swipeOffset, setSwipeOffset] = useState(0);

  // 단계별 상태 관리 (새로운 셔플 방식) - 인트로 제거, stacked에서 시작
  const [stage, setStage] = useState<ShuffleStage>("stacked");

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

  // 덱 클릭 시 셔플 시작
  const startShuffle = () => {
    if (stage !== "stacked") return;
    setShuffleCount(0);
    setStage("shuffling");
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
    setStage("stacked"); // intro 제거로 stacked로 초기화
    setSelectedCategory("advice");
    setCurrentCardIndex(0);
    setShuffleCount(0); // 셔플 카운터도 리셋
  };

  const pickTarot = (cardIndex: number, spreadIndex: number) => {
    if (picked !== null) return;
    setPicked(cardIndex);
    setPickedSpreadIndex(spreadIndex);
    setCurrentCardIndex(cardIndex);

    // 2단계: 카드 선택 (나머지 fade out)
    setStage("selecting");

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
    if (!tarotResult) return null;
    return tarotResult.interpretations[selectedCategory];
  }, [tarotResult, selectedCategory]);

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

  const saveTarot = (isPremium = false) => {
    if (!tarotResult || !currentInterpretation) return;

    const categoryLabels: Record<TarotCategory, string> = {
      love: "연애",
      money: "금전",
      work: "직장",
      advice: "조언",
    };

    const item: HistoryItem = {
      id: uid(),
      type: "TAROT",
      title: `[타로·${categoryLabels[selectedCategory]}] ${currentInterpretation.title}`,
      text: currentInterpretation.text,
      tags: currentInterpretation.tags,
      createdAt: Date.now(),
      isPremium,
    };

    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const existing = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
      const next = [item, ...existing].slice(0, 12);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }

    router.push("/?saved=tarot");
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
        <section className="section reveal on">
          <div className="container center">
            <div style={{ marginBottom: 16 }}>
              <Link
                href="/"
                className="btnTiny"
                style={{ textDecoration: "none" }}
              >
                ← 돌아가기
              </Link>
            </div>

            <h1 className="h2 stagger d1">타로 카드(데모)</h1>
            <p className="p stagger d2">
              {stage === "stacked" && "덱을 탭하여 셔플하세요"}
              {stage === "spread" && "직감으로 한 장을 선택하세요"}
              {stage === "shuffling" && "카드를 섞고 있어요..."}
              {(stage === "selecting" || stage === "flipping") &&
                "카드를 확인하고 있어요..."}
              {stage === "result" && "오늘의 메시지입니다"}
            </p>

            <div
              className="tarotArea stagger d3"
              onPointerDown={onEmptyTapReset}
              onClick={() => {
                if (stage === "stacked") {
                  startShuffle();
                }
              }}
            >
              <TarotShufflePicker
                cards={fanDeckCards}
                onCardSelect={(cardIndex, spreadIndex) => {
                  if (stage === "spread") {
                    pickTarot(cardIndex, spreadIndex);
                  }
                }}
                stage={stage}
                selectedCardIndex={picked}
                selectedSpreadIndex={pickedSpreadIndex}
                shufflePhase={shuffleCount}
                onCardImageClick={() => setShowCardImageModal(true)}
              />
            </div>

            {tarotResult && stage === "result" ? (
              <div
                className="card cardPad lift stagger d4 tarotResultCard"
                style={{ marginTop: 100 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{tarotResult.name}</div>
                  <div className="muted">오늘의 메시지</div>
                </div>

                {/* 카테고리 선택 탭 */}
                <div
                  className="tabRow"
                  style={{ marginTop: 12 }}
                  aria-label="타로 카테고리"
                >
                  {(["love", "money", "work", "advice"] as TarotCategory[]).map(
                    (category) => {
                      const labels: Record<TarotCategory, string> = {
                        love: "연애",
                        money: "금전",
                        work: "직장",
                        advice: "조언",
                      };
                      return (
                        <button
                          key={category}
                          className={`tabBtn ${
                            category === selectedCategory ? "on" : ""
                          }`}
                          onClick={() => setSelectedCategory(category)}
                        >
                          {labels[category]}
                        </button>
                      );
                    }
                  )}
                </div>

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
                    <div className="p">{currentInterpretation.text}</div>

                    <div className="chipRow">
                      {currentInterpretation.tags.map((t) => (
                        <span className="chip" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  <button
                    className="btn btnGhost btnWide"
                    onClick={() => setShowDetailModal(true)}
                  >
                    자세히보기
                  </button>
                  <button
                    className="btn btnPrimary btnWide"
                    onClick={() => saveTarot(false)}
                  >
                    기록에 저장하기
                  </button>

                  <button
                    className="btn btnGhost btnWide"
                    onClick={() => {
                      router.push("/plan");
                    }}
                  >
                    프리미엄으로 더 깊게(잠금)
                  </button>

                  <button className="btn btnGhost btnWide" onClick={resetTarot}>
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

                <div className="smallHelp" style={{ marginTop: 10 }}>
                  * 매일 자정(00:00)을 기준으로 새로운 카드가 선택돼요.
                </div>
              </div>
            ) : null}

            {/* 자세히보기 팝업 */}
            {showDetailModal && tarotResult && (
              <div
                className="modalOverlay"
                onClick={() => setShowDetailModal(false)}
              >
                <div
                  className="modalSheet"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modalHeader">
                    <div className="modalTitle">
                      {tarotResult.name} · {tarotResult.title}
                    </div>
                    <button
                      className="closeBtn"
                      onClick={() => setShowDetailModal(false)}
                      aria-label="닫기"
                    >
                      ×
                    </button>
                  </div>
                  <div className="modalBody">
                    <div
                      className="p"
                      style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}
                    >
                      {tarotResult.detailText}
                    </div>
                    <div className="chipRow" style={{ marginTop: 16 }}>
                      {tarotResult.tags.map((t) => (
                        <span className="chip" key={t}>
                          {t}
                        </span>
                      ))}
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
    </main>
  );
}
