import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET: 수업 단계 목록 조회 — 교사는 자기 수업 전체, 학생은 등록된 수업만.
// 학생 응답에는 completionCriteria(통과 판정 기준)·minMessages를 넣지 않는다(판정 기준을 알면 그대로 따라 말해 통과할 수 있음).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { id } = await params;

  if (session.user.role === "teacher") {
    const course = await prisma.course.findUnique({
      where: { id, teacherId: session.user.id },
      select: { id: true },
    });
    if (!course) return NextResponse.json({ error: "수업을 찾을 수 없습니다" }, { status: 404 });

    const steps = await prisma.lessonStep.findMany({
      where: { courseId: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(steps);
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { studentId_courseId: { studentId: session.user.id, courseId: id } },
  });
  if (!enrollment) return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });

  const steps = await prisma.lessonStep.findMany({
    where: { courseId: id },
    orderBy: { order: "asc" },
    select: { id: true, order: true, title: true, description: true, aiName: true, aiAvatar: true },
  });
  return NextResponse.json(steps);
}

// POST: 단계 생성
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { id: courseId } = await params;

  // 내 수업인지 확인
  const course = await prisma.course.findUnique({ where: { id: courseId, teacherId: session.user.id } });
  if (!course) return NextResponse.json({ error: "수업을 찾을 수 없습니다" }, { status: 404 });

  const body = await req.json();

  // 현재 마지막 order 계산
  const lastStep = await prisma.lessonStep.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
  });
  const nextOrder = (lastStep?.order ?? 0) + 1;

  const step = await prisma.lessonStep.create({
    data: {
      courseId,
      order: body.order ?? nextOrder,
      title: body.title,
      description: body.description ?? null,
      aiName: body.aiName ?? "AI 학생",
      aiAvatar: body.aiAvatar ?? "default",
      aiPersonality: body.aiPersonality ?? "curious",
      aiFocus: body.aiFocus ?? null,
      completionCriteria: body.completionCriteria ?? null,
      minMessages: body.minMessages ?? 6,
    },
  });

  return NextResponse.json(step);
}
