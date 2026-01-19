import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('[Saju API] ❌ GEMINI_API_KEY가 설정되지 않았습니다');
      return NextResponse.json(
        { success: false, error: 'API Key가 설정되지 않았습니다' },
        { status: 500 }
      );
    }
    
    console.log('[Saju API] 요청 받음:', body);
    
    const { birthDate, birthTime, gender, calendar } = body;
    
    if (!birthDate || !gender) {
      return NextResponse.json(
        { success: false, error: 'birthDate와 gender는 필수입니다' },
        { status: 400 }
      );
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    // 사주 프롬프트 생성
    const calendarText = calendar === 'lunar' ? '음력' : '양력';
    const genderText = gender === 'male' ? '남성' : '여성';
    const timeText = birthTime ? ` 출생 시간: ${birthTime}` : '';
    
    const prompt = `${calendarText} ${birthDate}${timeText} 출생 ${genderText}의 사주 운세를 한국어로 작성해주세요.

다음 JSON 형식으로만 답변해주세요:
{
  "overview": "전체 운세 3-4문장",
  "personality": "성격 특징 2-3문장",
  "love": "연애운 2문장",
  "career": "직장/학업운 2문장",
  "money": "금전운 2문장",
  "thisYear": "올해(2026년) 운세 2-3문장",
  "advice": "조언 2문장",
  "luckyElement": "행운의 오행(목/화/토/금/수 중 하나)",
  "luckyColor": "행운의 색상",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
}

세련되고 신비로운 톤으로 작성해주세요.`;
    
    console.log('[Saju API] Gemini 호출 시작');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });
    
    console.log('[Saju API] 응답 status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Saju API] ❌ Gemini 에러:', response.status, errorText);
      
      let errorMessage = `Gemini API 에러: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('[Saju API] ❌ 응답 구조가 올바르지 않음:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { success: false, error: 'Gemini API 응답 구조가 올바르지 않습니다' },
        { status: 500 }
      );
    }
    
    const resultText = data.candidates[0].content.parts[0].text;
    console.log('[Saju API] 응답 받음:', resultText.substring(0, 100));
    
    // JSON 파싱 시도
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedResult = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ success: true, data: parsedResult });
      } catch (parseError) {
        console.error('[Saju API] ❌ JSON 파싱 실패:', parseError);
        console.error('[Saju API] 파싱 실패한 텍스트:', jsonMatch[0]);
        return NextResponse.json(
          { success: false, error: 'JSON 파싱 실패: ' + (parseError instanceof Error ? parseError.message : String(parseError)) },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ success: true, data: { text: resultText } });
    
  } catch (error) {
    console.error('[Saju API] ❌ 에러:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
