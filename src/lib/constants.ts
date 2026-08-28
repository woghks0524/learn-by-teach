// 로그인/가입 이메일에 자동으로 붙는 가상 도메인.
// 학생은 아이디만 입력하고, 시스템이 `아이디@EMAIL_DOMAIN` 으로 계정을 만든다.
// (추후 Google OAuth 연동 시 이 방식은 대체될 예정)
export const EMAIL_DOMAIN = "learnbyteach.com";

// 아이디를 전체 이메일로 변환. 이미 @가 들어간 값이면 그대로 둔다(기존 계정 호환).
export function toEmail(username: string): string {
  const trimmed = username.trim();
  return trimmed.includes("@") ? trimmed : `${trimmed}@${EMAIL_DOMAIN}`;
}

// AI 학생 얼굴(아바타)은 성격에서 자동 결정 — 한 수업에 한 명, 이미지 하나로 일관되게.
export function avatarForPersonality(personality: string): string {
  return ({ passive: "shy", curious: "curious", challenging: "challenger" } as Record<string, string>)[personality] || "default";
}

// 채팅 = "AI 학생 연기"가 이 앱의 본질이라 4o 유지 (오개념 저항·캐릭터 유지 등 연기력이 핵심).
// 비용을 줄여야 하면 COST_ANALYSIS.md §4의 하이브리드(채팅만 gpt-4o-mini)로 전환.
export const CHAT_MODEL = "gpt-4o";
export const JUDGE_MODEL = "gpt-4o";

// 수업 자동 구성은 수업당 1회만 호출 → 비용 부담이 적어, 교육적 추론이 강한 상위 모델 사용.
// gpt-5 계열은 추론 모델이라 max_tokens 대신 max_completion_tokens를 쓴다.
export const SETUP_MODEL = "gpt-5.5";

// ── AI 프롬프트 크기 상한 (비용 가드) ──
// 지식파일은 매 채팅 턴마다 시스템 프롬프트에 통째로 들어간다. 상한이 없으면 교과서 전체를
// 업로드했을 때 메시지 하나당 수만 토큰이 나가므로, 여기서 한 번에 자른다(courses/generate의 12,000자와 동일 기준).
export const MAX_KNOWLEDGE_CHARS = 12000;
// 대화 이력도 매 턴 전체 전송하면 수업 후반에 토큰이 수십 배로 커진다.
// 이해도 상태(comprehensionState)가 요약 역할을 하므로 최근 메시지만 보내도 맥락이 유지된다.
export const MAX_HISTORY_MESSAGES = 30;

export function joinKnowledgeContent(files: { fileName: string; content: string }[]): string {
  return files
    .map((f) => `[${f.fileName}]\n${f.content}`)
    .join("\n\n")
    .slice(0, MAX_KNOWLEDGE_CHARS);
}

// DB에 문자열로 저장된 JSON 필드 파싱 — 깨진 데이터가 있어도 500 대신 기본값으로 진행
export function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseJsonObject(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
