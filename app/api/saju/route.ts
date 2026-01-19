import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    
    // 사주 프롬프트 생성
    const calendarText = calendar === 'lunar' ? '음력' : '양력';
    const genderText = gender === 'male' ? '남성' : '여성';
    const timeText = birthTime ? ` 출생 시간: ${birthTime}` : ' 출생 시간: 모름';
    const [year, month, day] = birthDate.split('-');
    
    const prompt = `당신은 전문 사주명리학자입니다. ${calendarText} ${year}년 ${month}월 ${day}일${timeText} 출생 ${genderText}의 사주팔자를 분석하여 운세를 작성해주세요.

생년월일시 정보:
- ${calendarText}: ${birthDate}
${birthTime ? `- 출생 시간: ${birthTime}` : '- 출생 시간: 알 수 없음'}
- 성별: ${genderText}

다음 JSON 형식으로만 답변해주세요. 반드시 모든 필드를 채워주세요:
{
  "overview": "전체 운세 요약 3-4문장 (사주팔자 기반 종합 운세)",
  "personality": "성격 특징 2-3문장 (오행과 십신을 기반으로 한 성격 분석)",
  "love": "연애운 2문장 (인연과 관계 운세)",
  "career": "직장/학업운 2문장 (직업과 학업 관련 운세)",
  "money": "금전운 2문장 (재물과 경제 운세)",
  "thisYear": "올해(2026년) 운세 2-3문장 (2026년 한 해 동안의 운세)",
  "advice": "조언 2문장 (실용적인 조언)",
  "luckyElement": "행운의 오행 (목/화/토/금/수 중 하나만 선택)",
  "luckyColor": "행운의 색상 (한 단어로, 예: 파란색, 빨간색 등)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
}

중요:
- 반드시 JSON 형식으로만 답변하세요
- 모든 필드를 반드시 채워주세요
- overview 필드는 절대 비워두지 마세요
- 세련되고 신비로운 톤으로 작성해주세요
- 사주명리학의 전통적인 관점을 바탕으로 작성하되, 현대적이고 실용적인 해석을 제공해주세요`;
    
    console.log('[Saju API] Gemini 호출 시작');
    console.log("Using Key:", process.env.GEMINI_API_KEY?.slice(-4));
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultText = response.text();
    console.log('[Saju API] 응답 받음 (전체):', resultText);
    console.log('[Saju API] 응답 받음 (처음 200자):', resultText.substring(0, 200));
    
    // JSON 파싱 시도 (여러 패턴 시도)
    let jsonMatch = resultText.match(/\{[\s\S]*\}/);
    
    // 코드 블록 안에 있는 경우도 처리
    if (!jsonMatch) {
      jsonMatch = resultText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonMatch = [jsonMatch[1], jsonMatch[1]];
      }
    }
    
    // 코드 블록 없이 JSON만 있는 경우
    if (!jsonMatch) {
      jsonMatch = resultText.match(/\{[\s\S]*?\}/);
    }
    
    if (jsonMatch && jsonMatch[0]) {
      try {
        const parsedResult = JSON.parse(jsonMatch[0]);
        console.log('[Saju API] 파싱된 결과:', JSON.stringify(parsedResult, null, 2));
        
        // 필수 필드 검증
        if (!parsedResult.overview || parsedResult.overview.trim() === '') {
          console.error('[Saju API] ❌ 필수 필드(overview)가 없거나 비어있음');
          console.error('[Saju API] 파싱된 전체 데이터:', parsedResult);
          return NextResponse.json(
            { success: false, error: 'Gemini 응답에 필수 필드(overview)가 없습니다. 응답을 확인해주세요.' },
            { status: 500 }
          );
        }
        
        // 모든 필드가 있는지 확인
        const requiredFields = ['overview', 'personality', 'love', 'career', 'money', 'thisYear', 'advice', 'luckyElement', 'luckyColor', 'keywords'];
        const missingFields = requiredFields.filter(field => !parsedResult[field] && parsedResult[field] !== 0);
        
        if (missingFields.length > 0) {
          console.warn('[Saju API] ⚠️ 누락된 필드:', missingFields);
          // 필수 필드만 확인하고 나머지는 기본값으로 채움
        }
        
        return NextResponse.json({ success: true, data: parsedResult });
      } catch (parseError) {
        console.error('[Saju API] ❌ JSON 파싱 실패:', parseError);
        console.error('[Saju API] 파싱 시도한 텍스트:', jsonMatch[0]);
        console.error('[Saju API] 전체 응답 텍스트:', resultText);
        return NextResponse.json(
          { success: false, error: 'JSON 파싱 실패: ' + (parseError instanceof Error ? parseError.message : String(parseError)) },
          { status: 500 }
        );
      }
    }
    
    // JSON 형식이 아닌 경우
    console.error('[Saju API] ❌ JSON 형식이 아님');
    console.error('[Saju API] 전체 응답:', resultText);
    return NextResponse.json(
      { success: false, error: 'Gemini 응답이 JSON 형식이 아닙니다. 응답: ' + resultText.substring(0, 100) },
      { status: 500 }
    );
    
  } catch (error) {
    console.error('[Saju API] ❌ 에러:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
