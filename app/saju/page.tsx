"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SajuTopic = "연애" | "재물" | "직장" | "건강";

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

export default function SajuPage() {
  const router = useRouter();
  const [birth, setBirth] = useState("");
  const [time, setTime] = useState("");
  const [gender, setGender] = useState<"female" | "male" | "none">("female");
  const [topic, setTopic] = useState<SajuTopic>("연애");

  const sajuBase = useMemo(() => {
    const hasBirth = birth.trim().length >= 8;
    const hasTime = time.trim().length >= 4;
    const g =
      gender === "female" ? "여성" : gender === "male" ? "남성" : "선택 안 함";
    const note = hasBirth
      ? `입력 기반(데모) · ${g}${hasTime ? " · 시간 포함" : ""}`
      : "기본 데모 결과";
    return note;
  }, [birth, time, gender]);

  const sajuResultByTopic = useMemo(() => {
    const map: Record<
      SajuTopic,
      { title: string; text: string; tags: string[] }
    > = {
      연애: {
        title: "관계의 결을 정리하면, 마음이 편해져요.",
        text: "오늘은 밀어붙이기보다 '대화의 여백'을 남기는 편이 좋아요. 말이 줄면 진심이 더 또렷해져요.",
        tags: ["배려", "거리감", "정리"],
      },
      재물: {
        title: "지출의 '이유'를 확인하면 흐름이 바뀌어요.",
        text: "오늘은 작은 충동이 커질 수 있어요. 구매 전에 '왜 필요하지?'를 한 번만 묻고 결정하면 깔끔해요.",
        tags: ["절제", "기준", "현명"],
      },
      직장: {
        title: "속도보다 정렬이 먼저인 날이에요.",
        text: "할 일을 늘리기보다 우선순위를 맞추면 시간이 벌려요. 오늘은 '정리한 사람이 이기는 날'이에요.",
        tags: ["우선순위", "집중", "정렬"],
      },
      건강: {
        title: "몸이 보내는 작은 신호를 놓치지 마세요.",
        text: "오늘은 무리보다 루틴이 중요해요. 짧은 스트레칭과 물 한 컵만으로도 컨디션이 달라져요.",
        tags: ["루틴", "회복", "호흡"],
      },
    };
    return map[topic];
  }, [topic]);

  const topics: SajuTopic[] = ["연애", "재물", "직장", "건강"];

  const saveSaju = () => {
    const item: HistoryItem = {
      id: uid(),
      type: "SAJU",
      title: `[사주] ${topic} · ${sajuResultByTopic.title}`,
      text: `${sajuBase}\n\n${sajuResultByTopic.text}`,
      tags: [topic, ...sajuResultByTopic.tags],
      createdAt: Date.now(),
      isPremium: false,
    };

    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const existing = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
      const next = [item, ...existing].slice(0, 12);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }

    router.push("/?saved=saju");
  };

  return (
    <main className="mainWrap">
      <div className="bgFX" />
      <div className="content">
        <section className="section reveal on">
          <div className="container center">
            <div style={{ marginBottom: 24 }}>
              <Link href="/" className="btnTiny" style={{ textDecoration: "none" }}>
                ← 돌아가기
              </Link>
            </div>

            <h1 className="h2 stagger d1">사주 조회(데모)</h1>
            <p className="p stagger d2">
              {sajuBase} · 오늘의 흐름을 "짧게, 과장 없이" 정리해요.
            </p>

            <div className="form left stagger d3" style={{ marginTop: 24 }}>
              <div className="field">
                <div className="label">생년월일</div>
                <input
                  className="input"
                  placeholder="예: 1996-08-17"
                  value={birth}
                  onChange={(e) => setBirth(e.target.value)}
                />
              </div>

              <div className="row2">
                <div className="field">
                  <div className="label">태어난 시간(선택)</div>
                  <input
                    className="input"
                    placeholder="예: 07:30"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="label">성별</div>
                  <select
                    className="input"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                  >
                    <option value="female">여성</option>
                    <option value="male">남성</option>
                    <option value="none">선택 안 함</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="tabRow stagger d4" aria-label="사주 분야" style={{ marginTop: 24 }}>
              {topics.map((t) => (
                <button
                  key={t}
                  className={`tabBtn ${t === topic ? "on" : ""}`}
                  onClick={() => setTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="card cardPad lift stagger d5" style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 900, letterSpacing: -0.01 }}>
                {sajuResultByTopic.title}
              </div>
              <div className="p" style={{ marginTop: 8 }}>
                {sajuResultByTopic.text}
              </div>

              <div className="chipRow">
                <span className="chip">{topic}</span>
                {sajuResultByTopic.tags.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <button className="btn btnPrimary btnWide" onClick={saveSaju}>
                  기록에 저장하기
                </button>
                <Link href="/" className="btn btnGhost btnWide" style={{ textAlign: "center", textDecoration: "none" }}>
                  돌아가기
                </Link>
              </div>

              <div className="smallHelp" style={{ marginTop: 10 }}>
                * 이 결과는 데모예요. API 연결 후 실제 계산 결과로 교체하면 돼요.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
