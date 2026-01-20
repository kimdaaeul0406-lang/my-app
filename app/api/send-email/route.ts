import { NextRequest, NextResponse } from 'next/server'

// HTML 이스케이프 함수
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

// 이메일 HTML 포맷팅 함수
function formatEmailHtml(title: string, text: string, tags?: string[]): string {
  // 텍스트를 줄 단위로 분리
  const lines = text.split('\n')
  const sections: Array<{ title?: string; content: string[] }> = []
  let currentSection: { title?: string; content: string[] } | null = null

  // 섹션별로 그룹화
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // 섹션 제목인지 확인 (한글 제목 패턴: "오늘의 메시지", "연애", "금전" 등)
    if (trimmedLine && !trimmedLine.includes(':') && trimmedLine.length < 20 && 
        (trimmedLine.match(/^[가-힣\s]+$/) || trimmedLine === '오늘의 메시지' || trimmedLine === '오늘의 흐름')) {
      // 이전 섹션 저장
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection)
      }
      // 새 섹션 시작
      currentSection = { title: trimmedLine, content: [] }
    } else if (trimmedLine) {
      // 섹션 내용 추가
      if (!currentSection) {
        currentSection = { content: [] }
      }
      currentSection.content.push(trimmedLine)
    }
  }
  
  // 마지막 섹션 추가
  if (currentSection && currentSection.content.length > 0) {
    sections.push(currentSection)
  }

  // 섹션이 없으면 기본 포맷 사용
  if (sections.length === 0) {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a2332; margin-bottom: 16px;">${escapeHtml(title)}</h2>
        <div style="color: #2b262a; line-height: 1.7; margin-bottom: 20px; white-space: pre-line;">
          ${escapeHtml(text).split('\n').map(line => `<p style="margin: 8px 0;">${line}</p>`).join('')}
        </div>
        ${tags && tags.length > 0 ? `
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${tags.map((tag: string) => `<span style="background: rgba(122, 95, 82, 0.1); padding: 4px 8px; border-radius: 12px; font-size: 12px; color: #7a5f52;">${escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999;">
          <p>LUMEN - 과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리</p>
        </div>
      </div>
    `
  }

  // 구조화된 섹션으로 포맷팅
  const sectionsHtml = sections.map(section => {
    const contentHtml = section.content.map(line => 
      `<p style="margin: 8px 0; color: #2b262a; line-height: 1.7;">${escapeHtml(line)}</p>`
    ).join('')
    
    if (section.title) {
      return `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #1a2332; font-size: 18px; font-weight: 700; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid rgba(122, 95, 82, 0.2);">${escapeHtml(section.title)}</h3>
          <div style="color: #2b262a; line-height: 1.7;">
            ${contentHtml}
          </div>
        </div>
      `
    } else {
      return `<div style="margin-bottom: 16px;">${contentHtml}</div>`
    }
  }).join('')

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a2332; margin-bottom: 24px; font-size: 24px; font-weight: 800;">${escapeHtml(title)}</h2>
      ${sectionsHtml}
      ${tags && tags.length > 0 ? `
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${tags.map((tag: string) => `<span style="background: rgba(122, 95, 82, 0.1); padding: 6px 12px; border-radius: 12px; font-size: 13px; color: #7a5f52; font-weight: 500;">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999;">
        <p>LUMEN - 과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리</p>
      </div>
    </div>
  `
}

// 이메일 전송 API (Resend 사용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type, title, text, tags } = body

    if (!email || !title || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: email, title, text' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Resend API 키 확인
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set, skipping email send')
      // API 키가 없어도 에러를 던지지 않고 성공으로 처리 (개발 환경)
      return NextResponse.json(
        {
          success: true,
          message: 'Email service not configured (RESEND_API_KEY missing)',
        },
        { status: 200 }
      )
    }

    // Resend API로 이메일 전송
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'LUMEN <onboarding@resend.dev>',
        to: email,
        subject: `[LUMEN] ${title}`,
        html: formatEmailHtml(title, text, tags),
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      console.error('Resend API error:', errorData)
      throw new Error(errorData.message || 'Failed to send email via Resend')
    }

    const resendData = await resendResponse.json()
    console.log('Email sent successfully:', resendData)

    return NextResponse.json(
      {
        success: true,
        message: 'Email sent successfully',
        id: resendData.id,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
