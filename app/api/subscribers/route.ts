import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

// 구독자 추가 API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    // subscribers 테이블에 저장
    const { data: subscriber, error: subscriberError } = await supabaseServer
      .from('subscribers')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          save_email: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'email',
        }
      )
      .select()
      .single()

    if (subscriberError) {
      console.error('Subscriber upsert error:', subscriberError)
      return NextResponse.json(
        { error: 'Failed to save subscriber', details: subscriberError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Subscriber saved successfully',
        subscriber: subscriber,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Save subscriber error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save subscriber',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
