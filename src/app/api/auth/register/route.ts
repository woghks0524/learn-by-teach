import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password, name, role, teacherCode } = await req.json();

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요" }, { status: 400 });
  }

  if (!["teacher", "student"].includes(role)) {
    return NextResponse.json({ error: "올바른 역할을 선택해주세요" }, { status: 400 });
  }

  if (String(password).length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다" }, { status: 400 });
  }

  // 교사 가입은 가입 코드 필요 — 배포 URL이 알려져도 외부인이 교사 계정을 만들 수 없도록.
  // (TEACHER_SIGNUP_CODE 환경변수가 없으면 이전처럼 코드 없이 가입 가능 — 로컬 개발 편의)
  const expectedCode = process.env.TEACHER_SIGNUP_CODE;
  if (role === "teacher" && expectedCode && teacherCode !== expectedCode) {
    return NextResponse.json({ error: "교사 가입 코드가 올바르지 않습니다" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role },
  });

  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}
