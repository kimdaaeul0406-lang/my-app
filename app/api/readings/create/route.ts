import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer()
    const body = await request.json()
    const { email, type, topic, question, result_json, summary } = body

    // 필수 필드 검증
    if (!email || !type || !result_json) {
      return NextResponse.json(
        { error: 'Missing required fields: email, type, result_json' },
        { status: 400 }
      )
    }

    // type 검증
    if (type !== 'tarot' && type !== 'saju' && type !== 'zodiac') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "tarot", "saju", or "zodiac"' },
        { status: 400 }
      )
    }

    // email 형식 검증 (간단한 검증)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // 1. subscribers 테이블에 upsert (email 기준)
    const { data: subscriber, error: subscriberError } = await supabaseServer
      .from('subscribers')
      .upsert(
        {
          email: email.toLowerCase().trim(),
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
        { error: 'Failed to create or update subscriber', details: subscriberError.message },
        { status: 500 }
      )
    }

    if (!subscriber || !subscriber.id) {
      return NextResponse.json(
        { error: 'Failed to get subscriber ID' },
        { status: 500 }
      )
    }

    // 2. readings 테이블에 insert
    const { data: reading, error: readingError } = await supabaseServer
      .from('readings')
      .insert({
        subscriber_id: subscriber.id,
        type: type,
        topic: topic || null,
        question: question || null,
        result_json: result_json,
        summary: summary || null,
      })
      .select()
      .single()

    if (readingError) {
      console.error('Reading insert error:', readingError)
      return NextResponse.json(
        { error: 'Failed to create reading', details: readingError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        reading: {
          id: reading.id,
          subscriber_id: reading.subscriber_id,
          type: reading.type,
          created_at: reading.created_at,
        },
      },
      { status: 201 }
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
