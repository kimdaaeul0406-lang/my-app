/**
 * 타로 카드 및 별자리 상수 데이터
 */

// 22장 메이저 아르카나
export const MAJOR_ARCANA = [
  { name: "The Fool", nameKo: "광대", id: 0 },
  { name: "The Magician", nameKo: "마법사", id: 1 },
  { name: "The High Priestess", nameKo: "여사제", id: 2 },
  { name: "The Empress", nameKo: "여제", id: 3 },
  { name: "The Emperor", nameKo: "황제", id: 4 },
  { name: "The Hierophant", nameKo: "교황", id: 5 },
  { name: "The Lovers", nameKo: "연인", id: 6 },
  { name: "The Chariot", nameKo: "전차", id: 7 },
  { name: "Strength", nameKo: "힘", id: 8 },
  { name: "The Hermit", nameKo: "은둔자", id: 9 },
  { name: "Wheel of Fortune", nameKo: "운명의 수레바퀴", id: 10 },
  { name: "Justice", nameKo: "정의", id: 11 },
  { name: "The Hanged Man", nameKo: "매달린 사람", id: 12 },
  { name: "Death", nameKo: "죽음", id: 13 },
  { name: "Temperance", nameKo: "절제", id: 14 },
  { name: "The Devil", nameKo: "악마", id: 15 },
  { name: "The Tower", nameKo: "탑", id: 16 },
  { name: "The Star", nameKo: "별", id: 17 },
  { name: "The Moon", nameKo: "달", id: 18 },
  { name: "The Sun", nameKo: "태양", id: 19 },
  { name: "Judgement", nameKo: "심판", id: 20 },
  { name: "The World", nameKo: "세계", id: 21 },
] as const;

// 12개 별자리
export const ZODIAC_SIGNS = [
  { name: "양자리", nameEn: "aries", dateRange: "3.21-4.19" },
  { name: "황소자리", nameEn: "taurus", dateRange: "4.20-5.20" },
  { name: "쌍둥이자리", nameEn: "gemini", dateRange: "5.21-6.21" },
  { name: "게자리", nameEn: "cancer", dateRange: "6.22-7.22" },
  { name: "사자자리", nameEn: "leo", dateRange: "7.23-8.22" },
  { name: "처녀자리", nameEn: "virgo", dateRange: "8.23-9.22" },
  { name: "천칭자리", nameEn: "libra", dateRange: "9.23-10.23" },
  { name: "전갈자리", nameEn: "scorpio", dateRange: "10.24-11.22" },
  { name: "사수자리", nameEn: "sagittarius", dateRange: "11.23-12.21" },
  { name: "염소자리", nameEn: "capricorn", dateRange: "12.22-1.19" },
  { name: "물병자리", nameEn: "aquarius", dateRange: "1.20-2.18" },
  { name: "물고기자리", nameEn: "pisces", dateRange: "2.19-3.20" },
] as const;
