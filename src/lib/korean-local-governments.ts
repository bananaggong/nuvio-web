export type KoreanLocalGovernment = {
  region: string;
  cities: readonly string[];
};

// Source: MOIS "지자체 누리집" page, checked 2026-07-08.
export const koreanLocalGovernments = [
  {
    region: "서울특별시",
    cities: [
      "종로구",
      "중구",
      "용산구",
      "성동구",
      "광진구",
      "동대문구",
      "중랑구",
      "성북구",
      "강북구",
      "도봉구",
      "노원구",
      "은평구",
      "서대문구",
      "마포구",
      "양천구",
      "강서구",
      "구로구",
      "금천구",
      "영등포구",
      "동작구",
      "관악구",
      "서초구",
      "강남구",
      "송파구",
      "강동구",
    ],
  },
  {
    region: "전남광주통합특별시",
    cities: [
      "목포시",
      "여수시",
      "순천시",
      "나주시",
      "광양시",
      "동구",
      "서구",
      "남구",
      "북구",
      "광산구",
      "담양군",
      "곡성군",
      "구례군",
      "고흥군",
      "보성군",
      "화순군",
      "장흥군",
      "강진군",
      "해남군",
      "영암군",
      "무안군",
      "함평군",
      "영광군",
      "장성군",
      "완도군",
      "진도군",
      "신안군",
    ],
  },
  {
    region: "부산광역시",
    cities: [
      "중구",
      "서구",
      "동구",
      "영도구",
      "부산진구",
      "동래구",
      "남구",
      "북구",
      "해운대구",
      "사하구",
      "금정구",
      "강서구",
      "연제구",
      "수영구",
      "사상구",
      "기장군",
    ],
  },
  {
    region: "대구광역시",
    cities: [
      "중구",
      "동구",
      "서구",
      "남구",
      "북구",
      "수성구",
      "달서구",
      "달성군",
      "군위군",
    ],
  },
  {
    region: "인천광역시",
    cities: [
      "제물포구",
      "영종구",
      "미추홀구",
      "연수구",
      "남동구",
      "부평구",
      "계양구",
      "서해구",
      "검단구",
      "강화군",
      "옹진군",
    ],
  },
  {
    region: "대전광역시",
    cities: ["동구", "중구", "서구", "유성구", "대덕구"],
  },
  {
    region: "울산광역시",
    cities: ["중구", "남구", "동구", "북구", "울주군"],
  },
  {
    region: "세종특별자치시",
    cities: ["세종특별자치시"],
  },
  {
    region: "경기도",
    cities: [
      "수원시",
      "성남시",
      "의정부시",
      "안양시",
      "부천시",
      "광명시",
      "평택시",
      "동두천시",
      "안산시",
      "고양시",
      "과천시",
      "구리시",
      "남양주시",
      "오산시",
      "시흥시",
      "군포시",
      "의왕시",
      "하남시",
      "용인시",
      "파주시",
      "이천시",
      "안성시",
      "김포시",
      "화성시",
      "광주시",
      "양주시",
      "포천시",
      "여주시",
      "연천군",
      "가평군",
      "양평군",
    ],
  },
  {
    region: "강원특별자치도",
    cities: [
      "춘천시",
      "원주시",
      "강릉시",
      "동해시",
      "태백시",
      "속초시",
      "삼척시",
      "홍천군",
      "횡성군",
      "영월군",
      "평창군",
      "정선군",
      "철원군",
      "화천군",
      "양구군",
      "인제군",
      "고성군",
      "양양군",
    ],
  },
  {
    region: "충청북도",
    cities: [
      "청주시",
      "충주시",
      "제천시",
      "보은군",
      "옥천군",
      "영동군",
      "증평군",
      "진천군",
      "괴산군",
      "음성군",
      "단양군",
    ],
  },
  {
    region: "충청남도",
    cities: [
      "천안시",
      "공주시",
      "당진시",
      "보령시",
      "아산시",
      "서산시",
      "논산시",
      "계룡시",
      "금산군",
      "부여군",
      "서천군",
      "청양군",
      "홍성군",
      "예산군",
      "태안군",
    ],
  },
  {
    region: "전북특별자치도",
    cities: [
      "전주시",
      "군산시",
      "익산시",
      "정읍시",
      "남원시",
      "김제시",
      "완주군",
      "진안군",
      "무주군",
      "장수군",
      "임실군",
      "순창군",
      "고창군",
      "부안군",
    ],
  },
  {
    region: "경상북도",
    cities: [
      "포항시",
      "경주시",
      "김천시",
      "안동시",
      "구미시",
      "영주시",
      "영천시",
      "상주시",
      "문경시",
      "경산시",
      "의성군",
      "청송군",
      "영양군",
      "영덕군",
      "청도군",
      "고령군",
      "성주군",
      "칠곡군",
      "예천군",
      "봉화군",
      "울진군",
      "울릉군",
    ],
  },
  {
    region: "경상남도",
    cities: [
      "창원시",
      "진주시",
      "통영시",
      "사천시",
      "김해시",
      "밀양시",
      "거제시",
      "양산시",
      "의령군",
      "함안군",
      "창녕군",
      "고성군",
      "남해군",
      "하동군",
      "산청군",
      "함양군",
      "거창군",
      "합천군",
    ],
  },
  {
    region: "제주특별자치도",
    cities: ["제주시", "서귀포시"],
  },
] as const satisfies readonly KoreanLocalGovernment[];

export const koreanRegionOptions: string[] = koreanLocalGovernments.map(
  (item) => item.region,
);

const regionAliases: Record<string, string> = {
  강원: "강원특별자치도",
  경기: "경기도",
  경남: "경상남도",
  경북: "경상북도",
  광주: "전남광주통합특별시",
  대구: "대구광역시",
  대전: "대전광역시",
  부산: "부산광역시",
  서울: "서울특별시",
  세종: "세종특별자치시",
  울산: "울산광역시",
  인천: "인천광역시",
  전남: "전남광주통합특별시",
  전북: "전북특별자치도",
  제주: "제주특별자치도",
  충남: "충청남도",
  충북: "충청북도",
};

export function getKoreanLocalOptions(region: string): string[] {
  const normalizedRegion = normalizeKoreanRegion(region);
  return [...(koreanLocalGovernments.find((item) => item.region === normalizedRegion)?.cities ?? [])];
}

export function normalizeKoreanRegion(region: string): string {
  const trimmed = region.trim();
  return regionAliases[trimmed] ?? trimmed;
}

export function normalizeKoreanCity(region: string, city: string): string {
  const trimmed = city.trim();
  if (!trimmed || trimmed === "로컬") return "";

  const normalizedRegion = normalizeKoreanRegion(region);
  const withoutRegionPrefix = trimmed
    .replace(new RegExp(`^${escapeRegExp(normalizedRegion)}\\s*`, "u"), "")
    .replace(/^부산\s+/u, "")
    .replace(/^서울\s+/u, "")
    .replace(/^전남\s+/u, "")
    .replace(/^전북\s+/u, "")
    .replace(/^강원\s+/u, "")
    .replace(/^제주\s+/u, "")
    .trim();
  const options = getKoreanLocalOptions(normalizedRegion);

  return options.includes(withoutRegionPrefix) ? withoutRegionPrefix : trimmed;
}

export function normalizeKoreanLocation(region: string, city: string) {
  const normalizedRegion = normalizeKoreanRegion(region);
  const normalizedCity = normalizeKoreanCity(normalizedRegion, city);
  const cityOptions = getKoreanLocalOptions(normalizedRegion);

  return {
    city: cityOptions.includes(normalizedCity) ? normalizedCity : "",
    region: koreanRegionOptions.includes(normalizedRegion) ? normalizedRegion : "",
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
