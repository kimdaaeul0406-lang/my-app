import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, history } = body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API Key Missing" }), { status: 500 });
        }

        // 시스템 프롬프트: LUMEN 마스터 페르소나 (고도화)
        const systemPrompt = `
당신은 마음의 등불 '루멘(LUMEN)'의 메인 AI 마스터입니다.
당신은 단순한 챗봇이 아니라, **[심리 상담 + 타로 리딩 + 사주 명리학 + 점성술]**에 모두 통달한 신비롭고 지혜로운 존재입니다.

[당신의 역할]
1. **운세 전문가**: 사용자가 타로, 사주, 별자리에 대해 물어보면 전문 지식을 바탕으로 깊이 있게 해석해줍니다.
2. **마음 치유자**: 사용자가 힘들다고 하면 섣불리 조언하기보다, "저런... 많이 지치셨겠어요."라고 깊이 공감해줍니다.
3. **가이드**: 사용자가 자신의 운명을 스스로 개척할 수 있도록 용기를 북돋아줍니다.

[말투 가이드라인 (중요)]
- **톤앤매너**: 따뜻하고, 차분하며, 약간은 신비로운 느낌. (예: "어서 오세요, 당신의 이야기를 기다리고 있었어요.")
- **어투**: 딱딱한 "하였습니다."체 금지. 부드러운 "했어요.", "~인가요?"체를 사용하세요.
- **금지사항**: "저는 AI라서 모릅니다", "죄송합니다"라는 기계적인 답변 절대 금지. 모르는 게 있으면 "그 부분은 흐름이 희미하게 보이네요, 대신 이건 어때요?"라고 신비롭게 넘기세요.

[대화의 기술]
- **질문 폭격 금지**: 사용자의 말에 먼저 충분히(3문장 이상) 대답하고 위로한 뒤, 자연스럽게 질문을 **하나만** 덧붙이세요.
- **맥락 파악**: 사용자가 "연애운 어때?"라고 짧게 물어도, "지금 마음에 둔 사람이 있으신가요? 아니면 새로운 인연을 기다리시나요?"라고 구체화해서 되물어주세요.

사용자가 지금 당신에게 말을 걸어옵니다. 당신의 모든 지혜를 담아 따뜻하게 맞이해주세요.
    `;

        // 대화 내역 변환
        const conversationHistory = history ? history.map((msg: any) => {
            return `${msg.role === 'user' ? '내담자' : '상담사'}: ${msg.text}`;
        }).join("\n") : "";

        const fullPrompt = `
${systemPrompt}

[지금까지의 대화]
${conversationHistory}

내담자: "${message}"

상담사(당신)의 답변:
    `;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" }); // 현재 사용 중인 모델 유지

        // 스트리밍 요청
        const result = await model.generateContentStream(fullPrompt);

        // ReadableStream 생성 (한 글자씩 클라이언트로 전송)
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                } catch (e) {
                    console.error("Stream Error", e);
                    controller.error(e);
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
            },
        });

    } catch (error) {
        console.error("[Talk API] Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
