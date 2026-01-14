"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PlanPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<"month" | "year">("month");
  const premiumPriceLabel =
    billing === "month" ? "월 10,900원" : "연 109,000원";

  const confirmPlan = () => {
    // 결제 연결 로직
    router.push("/");
    // TODO: 실제로는 결제 처리 후 성공 페이지로 이동
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

            <h1 className="h2 stagger d1">프리미엄 플랜</h1>
            <p className="p stagger d2">
              결제는 다음 단계에서 연결해요. 지금은 "플랜 UX"만 잡아두는 데모예요.
            </p>

            <div className="card cardPad lift stagger d3" style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 900 }}>프리미엄 플랜</div>
              <div className="p" style={{ marginTop: 6 }}>
                선택한 주기: <b>{billing === "month" ? "월간" : "연간"}</b> ·{" "}
                <b>{premiumPriceLabel}</b>
              </div>

              <div
                className="pricingTabs"
                style={{ padding: "16px 0", background: "transparent" }}
              >
                <button
                  className={`pricingTabBtn ${
                    billing === "month" ? "active" : ""
                  }`}
                  onClick={() => setBilling("month")}
                >
                  월간
                </button>
                <button
                  className={`pricingTabBtn ${
                    billing === "year" ? "active" : ""
                  }`}
                  onClick={() => setBilling("year")}
                >
                  연간
                </button>
              </div>

              <div className="chipRow">
                <span className="chip chipGold">심화 해석</span>
                <span className="chip">기록 아카이브</span>
                <span className="chip">프리미엄 타로</span>
                <span className="chip">알림 우선</span>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <button className="btn btnPrimary btnWide" onClick={confirmPlan}>
                  {billing === "month"
                    ? "월간으로 시작하기(데모)"
                    : "연간으로 시작하기(데모)"}
                </button>
                <Link href="/" className="btn btnGhost btnWide" style={{ textAlign: "center", textDecoration: "none" }}>
                  돌아가기
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
