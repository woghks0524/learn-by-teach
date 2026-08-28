import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH: 단계 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { id: courseId, stepId } = await params;

  const course = await prisma.course.findUnique({ where: { id: courseId, teacherId: session.user.id } });
  if (!course) return NextResponse.json({ error: "수업을 찾을 수 없습니다" }, { status: 404 });

  const body = await req.json();
  const step = await prisma.lessonStep.update({
    where: { id: stepId, courseId },
    data: {
      title: body.title,
      description: body.description,
      aiName: body.aiName,
      aiAvatar: body.aiAvatar,
      aiPersonality: body.aiPersonality,
      aiFocus: body.aiFocus,
      completionCriteria: body.completionCriteria,
      minMessages: body.minMessages,
    },
  });

  return NextResponse.json(step);
}

// DELETE: 단계 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { id: courseId, stepId } = await params;

  const course = await prisma.course.findUnique({ where: { id: courseId, teacherId: session.user.id } });
  if (!course) return NextResponse.json({ error: "수업을 찾을 수 없습니다" }, { status: 404 });

  // 삭제와 order 재정렬을 한 트랜잭션으로 — 중간 실패 시 순서가 꼬이지 않도록
  await prisma.$transaction(async (tx) => {
    await tx.lessonStep.delete({ where: { id: stepId, courseId } });
    const remaining = await tx.lessonStep.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    for (const [i, s] of remaining.entries()) {
      if (s.order !== i + 1) {
        await tx.lessonStep.update({ where: { id: s.id }, data: { order: i + 1 } });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
