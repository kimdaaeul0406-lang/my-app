"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

type TarotCard = {
  id: number;
  name: string;
  title: string;
  text: string;
  detailText: string;
  tags: string[];
  suit?: string;
  number?: string;
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

  // stacked 단계에서 spread 카드 선택 (리셋 시에도 새로 선택)
  useEffect(() => {
    if (stage === "stacked" && isClient) {
      // stacked로 돌아올 때마다 새로운 카드 선택 (리셋 대응)
      const shuffled = [...Array(cards.length).keys()]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      setSpreadCards(shuffled);
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

  // 78장의 타로 카드 생성
  const tarotDeck = useMemo(() => {
    const cards: TarotCard[] = [];

    // 메이저 아르카나 22장 (0-21)
    const majorArcana = [
      {
        name: "THE FOOL",
        title: "새로운 시작의 여정",
        text: "오늘은 두려움보다 호기심을 선택하는 날이에요.",
        tags: ["시작", "자유", "모험"],
      },
      {
        name: "THE MAGICIAN",
        title: "의지로 현실을 만들어요",
        text: "오늘은 생각을 행동으로 옮길 수 있는 날이에요.",
        tags: ["의지", "집중", "실행"],
      },
      {
        name: "THE HIGH PRIESTESS",
        title: "직감이 답을 알려줘요",
        text: "오늘은 논리보다 내면의 목소리를 들어보세요.",
        tags: ["직감", "침묵", "지혜"],
      },
      {
        name: "THE EMPRESS",
        title: "풍요와 성장의 시간",
        text: "오늘은 자연스러운 흐름을 따르는 것이 좋아요.",
        tags: ["풍요", "성장", "배려"],
      },
      {
        name: "THE EMPEROR",
        title: "구조와 안정을 만들어요",
        text: "오늘은 체계적으로 정리하는 것이 중요해요.",
        tags: ["구조", "안정", "리더십"],
      },
      {
        name: "THE HIEROPHANT",
        title: "전통과 가르침을 따르세요",
        text: "오늘은 검증된 방법을 따르는 것이 좋아요.",
        tags: ["전통", "가르침", "규칙"],
      },
      {
        name: "THE LOVERS",
        title: "선택과 조화의 시간",
        text: "오늘은 중요한 결정을 내려야 할 때예요.",
        tags: ["선택", "조화", "관계"],
      },
      {
        name: "THE CHARIOT",
        title: "의지로 목표를 향해요",
        text: "오늘은 집중력으로 장애물을 넘어가요.",
        tags: ["의지", "집중", "승리"],
      },
      {
        name: "STRENGTH",
        title: "인내로 힘을 다스려요",
        text: "오늘은 부드러운 힘으로 극복하는 날이에요.",
        tags: ["인내", "자제", "용기"],
      },
      {
        name: "THE HERMIT",
        title: "내면의 빛을 찾아요",
        text: "오늘은 혼자만의 시간이 필요해요.",
        tags: ["성찰", "탐구", "고독"],
      },
      {
        name: "WHEEL OF FORTUNE",
        title: "변화의 순환을 받아들이세요",
        text: "오늘은 흐름에 맡기는 것이 좋아요.",
        tags: ["변화", "순환", "운명"],
      },
      {
        name: "JUSTICE",
        title: "균형과 공정함을 찾아요",
        text: "오늘은 객관적인 판단이 필요해요.",
        tags: ["공정", "균형", "책임"],
      },
      {
        name: "THE HANGED MAN",
        title: "새로운 관점을 얻어요",
        text: "오늘은 기다림과 관찰이 중요해요.",
        tags: ["기다림", "관점", "희생"],
      },
      {
        name: "DEATH",
        title: "끝과 새로운 시작",
        text: "오늘은 변화를 받아들이는 시간이에요.",
        tags: ["변화", "종료", "재생"],
      },
      {
        name: "TEMPERANCE",
        title: "균형이 답을 더 빨리 데려와요",
        text: "오늘은 한쪽으로 치우치기 쉬워요. 속도 조절만 해도 관계와 일정이 부드러워져요.",
        tags: ["균형", "조율", "호흡"],
      },
      {
        name: "THE DEVIL",
        title: "속박에서 벗어나요",
        text: "오늘은 나쁜 습관이나 패턴을 인식하는 날이에요.",
        tags: ["속박", "욕구", "해방"],
      },
      {
        name: "THE TOWER",
        title: "갑작스러운 변화를 받아들이세요",
        text: "오늘은 예상치 못한 변화가 있을 수 있어요.",
        tags: ["변화", "파괴", "각성"],
      },
      {
        name: "THE STAR",
        title: "희망과 영감이 찾아와요",
        text: "오늘은 긍정적인 에너지가 흐르는 날이에요.",
        tags: ["희망", "영감", "치유"],
      },
      {
        name: "THE MOON",
        title: "흐림 속에서도 길은 있어요",
        text: "오늘은 모든 걸 확정하기보다, 감정을 관찰하는 쪽이 좋아요.",
        tags: ["관찰", "직감", "유예"],
      },
      {
        name: "THE SUN",
        title: "정답이 아니라 '확신'이 자라요",
        text: "오늘은 작은 성취가 큰 자신감으로 이어져요. 시작을 미루지 말고, 가볍게 움직여봐요.",
        tags: ["성취", "기쁨", "시작"],
      },
      {
        name: "JUDGEMENT",
        title: "과거를 평가하고 새로 시작해요",
        text: "오늘은 자신을 되돌아보는 시간이에요.",
        tags: ["평가", "재생", "각성"],
      },
      {
        name: "THE WORLD",
        title: "완성과 새로운 시작",
        text: "오늘은 한 단계를 마무리하고 다음으로 나아가는 날이에요.",
        tags: ["완성", "성취", "새시작"],
      },
    ];

    // 마이너 아르카나 56장 생성
    const suits = [
      { name: "완드", symbol: "W" },
      { name: "컵", symbol: "C" },
      { name: "소드", symbol: "S" },
      { name: "펜타클", symbol: "P" },
    ];

    const numbers = [
      "Ace",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "Page",
      "Knight",
      "Queen",
      "King",
    ];

    // 메이저 아르카나 추가
    majorArcana.forEach((card, index) => {
      cards.push({
        id: index,
        name: card.name,
        title: card.title,
        text: card.text,
        detailText: `${card.text}\n\n${card.name} 카드는 ${card.tags.join(
          ", "
        )}의 의미를 담고 있어요. 오늘 하루 이 에너지를 기억하며 살펴보세요.`,
        tags: card.tags,
      });
    });

    // 마이너 아르카나 추가
    suits.forEach((suit, suitIndex) => {
      numbers.forEach((number, numIndex) => {
        const cardId = 22 + suitIndex * 14 + numIndex;
        cards.push({
          id: cardId,
          name: `${number} of ${suit.name}`,
          title: `${suit.name}의 ${number}`,
          text: `${suit.name}의 ${number} 카드가 오늘의 메시지를 전해요.`,
          detailText: `${suit.name}의 ${number} 카드는 ${suit.name}의 에너지를 ${number}의 의미로 전달해요. 오늘 하루 이 카드의 메시지를 마음에 새겨보세요.`,
          tags: [suit.name, number],
          suit: suit.name,
          number: number,
        });
      });
    });

    return cards;
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
    return tarotDeck[currentCardIndex];
  }, [picked, currentCardIndex, tarotDeck]);

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
    if (!tarotResult) return;

    const item: HistoryItem = {
      id: uid(),
      type: "TAROT",
      title: `[타로] ${tarotResult.title}`,
      text: tarotResult.text,
      tags: tarotResult.tags,
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

                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 900,
                    letterSpacing: -0.01,
                  }}
                >
                  {tarotResult.title}
                </div>
                <div className="p">{tarotResult.text}</div>

                <div className="chipRow">
                  {tarotResult.tags.map((t) => (
                    <span className="chip" key={t}>
                      {t}
                    </span>
                  ))}
                </div>

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
