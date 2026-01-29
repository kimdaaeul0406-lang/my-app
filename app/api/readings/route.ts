import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

// readings 조회 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
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

    // 1. subscriber 찾기
    const { data: subscriber, error: subscriberError } = await supabaseServer
      .from('subscribers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (subscriberError || !subscriber) {
      return NextResponse.json(
        { success: true, readings: [] },
        { status: 200 }
      )
    }

    // 2. 해당 subscriber의 readings 조회 (최신순, 최대 12개)
    const { data: readings, error: readingsError } = await supabaseServer
      .from('readings')
      .select('*')
      .eq('subscriber_id', subscriber.id)
      .order('created_at', { ascending: false })
      .limit(12)

    if (readingsError) {
      console.error('Readings fetch error:', readingsError)
      return NextResponse.json(
        { error: 'Failed to fetch readings', details: readingsError.message },
        { status: 500 }
      )
    }

    // 3. 프론트엔드 형식으로 변환
    const formattedReadings = (readings || []).map((reading) => {
      const result = reading.result_json as any
      return {
        id: reading.id,
        type: reading.type.toUpperCase() as 'SAJU' | 'TAROT' | 'ZODIAC',
        title: result.title || `[${reading.type}] 결과`,
        text: result.text || result.horoscope || result.message || '',
        tags: result.tags || [],
        createdAt: new Date(reading.created_at).getTime(),
        isPremium: result.isPremium || false,
      }
    })

    return NextResponse.json(
      {
        success: true,
        readings: formattedReadings,
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
