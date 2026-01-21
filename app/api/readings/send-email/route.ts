import { NextRequest, NextResponse } from 'next/server'

// 이메일 전송 API (Resend 사용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type, title, text, tags } = body

    // 필수 필드 검증
    if (!email || !type || !title || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: email, type, title, text' },
        { status: 400 }
      )
    }

    // email 형식 검증
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
        { success: true, message: 'Email service not configured' },
        { status: 200 }
      )
    }

    // 이메일 제목 및 내용 생성
    const typeNames: Record<string, string> = {
      tarot: '타로',
      saju: '사주',
      zodiac: '별자리',
    }
    const typeName = typeNames[type] || type

    const emailSubject = `[LUMEN] ${typeName} 결과: ${title}`
    const tagsHtml = tags && tags.length > 0
      ? `<div style="margin-top: 16px;">
          ${tags.map((tag: string) => `<span style="display: inline-block; padding: 4px 8px; margin: 4px; background: rgba(122, 95, 82, 0.1); border-radius: 12px; font-size: 11px; color: #2b262a;">${tag}</span>`).join('')}
        </div>`
      : ''

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif; line-height: 1.6; color: #2b262a; background: #faf9f7; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 14px 38px rgba(0, 0, 0, 0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 22px; font-weight: 800; letter-spacing: 0.32em; color: #1a2332; margin: 0;">LUMEN</h1>
            </div>
            
            <div style="margin-bottom: 24px;">
              <div style="font-size: 11px; color: #3d4a6e; letter-spacing: 0.1em; font-weight: 900; margin-bottom: 8px;">${typeName.toUpperCase()}</div>
              <h2 style="font-size: 18px; font-weight: 900; letter-spacing: -0.02em; color: #1a2332; margin: 0 0 12px 0;">${title}</h2>
              <div style="font-size: 13px; color: rgba(26, 35, 50, 0.7); line-height: 1.7; white-space: pre-wrap;">${text}</div>
              ${tagsHtml}
            </div>

            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(43, 38, 42, 0.08); text-align: center;">
              <p style="font-size: 11px; color: rgba(43, 38, 42, 0.6); margin: 0;">
                과장 없이, 오늘의 흐름을 정리하는 사주 & 타로 & 별자리
              </p>
            </div>
          </div>
        </body>
      </html>
    `

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
        subject: emailSubject,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      console.error('Resend API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to send email', details: errorData },
        { status: 500 }
      )
    }

    const resendData = await resendResponse.json()

    return NextResponse.json(
      {
        success: true,
        message: 'Email sent successfully',
        emailId: resendData.id,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
