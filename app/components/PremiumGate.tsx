"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

interface PremiumGateProps {
  feature: string;
  children?: React.ReactNode;
}

/**
 * 프리미엄 기능 잠금 컴포넌트
 * 프리미엄 기능에 접근하려고 할 때 표시
 */
export default function PremiumGate({ feature, children }: PremiumGateProps) {
  const router = useRouter();

  return (
    <div className="premiumGate">
      {children && <div className="premiumGateContent">{children}</div>}
      <div className="premiumGateOverlay">
        <div className="premiumGateIcon">🔒</div>
        <div className="premiumGateTitle">프리미엄 기능</div>
        <div className="premiumGateDesc">
          {feature}은(는) 프리미엄 구독 후 이용할 수 있어요.
        </div>
        <Link
          href="/plan"
          className="btn btnPrimary btnWide"
          style={{
            textAlign: "center",
            textDecoration: "none",
            display: "block",
            marginTop: 12,
          }}
        >
          프리미엄 구독하기
        </Link>
      </div>
    </div>
  );
}
