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

// 이메일 HTML 포맷팅 함수 (LUMEN 스타일)
function formatEmailHtml(title: string, text: string, tags?: string[], cardImageHtml?: string): string {
  // 텍스트를 줄 단위로 분리
  const lines = text.split('\n')
  const sections: Array<{ title?: string; content: string[] }> = []
  let currentSection: { title?: string; content: string[] } | null = null

  // 섹션별로 그룹화
  for (const line of lines) {
    const trimmedLine = line.trim()

    // 섹션 제목인지 확인 (한글 제목 패턴)
    if (trimmedLine && !trimmedLine.includes(':') && trimmedLine.length < 20 &&
      (trimmedLine.match(/^[가-힣\s]+$/) || trimmedLine === '오늘의 메시지' || trimmedLine === '오늘의 흐름')) {
      if (currentSection && currentSection.content.length > 0) {
        sections.push(currentSection)
      }
      currentSection = { title: trimmedLine, content: [] }
    } else if (trimmedLine) {
      if (!currentSection) {
        currentSection = { content: [] }
      }
      currentSection.content.push(trimmedLine)
    }
  }

  if (currentSection && currentSection.content.length > 0) {
    sections.push(currentSection)
  }

  // 섹션 HTML 생성
  const sectionsHtml = sections.map(section => {
    const contentHtml = section.content.map(line =>
      `<p style="margin: 10px 0; color: rgba(255,255,255,0.9); line-height: 1.8; font-size: 15px;">${escapeHtml(line)}</p>`
    ).join('')

    if (section.title) {
      return `
        <div style="margin-bottom: 28px;">
          <h3 style="color: #d4a574; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; letter-spacing: 0.5px;">${escapeHtml(section.title)}</h3>
          <div style="padding-left: 12px; border-left: 2px solid rgba(212, 165, 116, 0.4);">
            ${contentHtml}
          </div>
        </div>
      `
    } else {
      return `<div style="margin-bottom: 20px;">${contentHtml}</div>`
    }
  }).join('')

  // 섹션이 없으면 텍스트만 표시
  const mainContent = sections.length > 0
    ? sectionsHtml
    : `<p style="color: rgba(255,255,255,0.9); line-height: 1.8; font-size: 15px;">${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a2332 0%, #2d3a4f 100%); color: #fff;">
      
      <!-- 헤더 -->
      <div style="text-align: center; padding: 40px 20px 24px;">
        <h1 style="font-size: 28px; font-weight: 800; color: #d4a574; margin: 0; letter-spacing: 1px;">LUMEN</h1>
        <p style="font-size: 13px; opacity: 0.6; margin-top: 8px;">과장 없이, 오늘의 흐름을 정리하는 시간</p>
      </div>
      
      <!-- 제목 카드 -->
      <div style="background: rgba(255,255,255,0.08); border-radius: 16px; margin: 0 20px 24px; padding: 24px;">
        <h2 style="font-size: 22px; font-weight: 700; color: #fff; margin: 0; text-align: center;">${escapeHtml(title)}</h2>
      </div>
      
      <!-- 카드 이미지 (타로인 경우) -->
      ${cardImageHtml || ''}
      
      <!-- 본문 -->
      <div style="padding: 0 28px 32px;">
        ${mainContent}
      </div>
      
      <!-- 태그 -->
      ${tags && tags.length > 0 ? `
        <div style="padding: 0 28px 32px;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
            ${tags.map((tag: string) => `<span style="background: rgba(212, 165, 116, 0.2); padding: 8px 16px; border-radius: 20px; font-size: 13px; color: #d4a574; font-weight: 500;">#${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- 푸터 -->
      <div style="text-align: center; padding: 24px 20px 32px; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="font-size: 12px; opacity: 0.5; margin: 0;">© LUMEN | 오늘도 좋은 흐름이 함께하길</p>
      </div>
    </div>
  `
}

// 이메일 전송 API (Resend 사용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type, title, text, tags, cardId, isReversed } = body

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
      return NextResponse.json(
        {
          success: true,
          message: 'Email service not configured (RESEND_API_KEY missing)',
        },
        { status: 200 }
      )
    }

    // 타로 카드 이미지 URL 생성 (배포 도메인 사용)
    const baseUrl = 'https://my-app-jade-eight-85.vercel.app'
    let cardImageHtml = ''

    if (type === 'tarot' && cardId !== undefined) {
      const imageUrl = `${baseUrl}/tarot/${cardId}.png`
      const rotationStyle = isReversed ? 'transform: rotate(180deg);' : ''
      cardImageHtml = `
        <div style="text-align: center; margin: 24px 0;">
          <img src="${imageUrl}" alt="타로 카드" style="max-width: 180px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); ${rotationStyle}" />
          ${isReversed ? '<p style="font-size: 13px; color: #d4a574; margin-top: 12px; opacity: 0.8;">역방향</p>' : ''}
        </div>
      `
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
        html: formatEmailHtml(title, text, tags, cardImageHtml),
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
