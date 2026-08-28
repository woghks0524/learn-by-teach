import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const { id: courseId } = await params;

  // 내 수업에만 등록 가능 — 다른 교사의 수업 ID로는 동작하지 않도록
  const course = await prisma.course.findUnique({
    where: { id: courseId, teacherId: session.user.id },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ error: "수업을 찾을 수 없습니다" }, { status: 404 });
  }

  const { studentIds } = await req.json();
  if (!Array.isArray(studentIds)) {
    return NextResponse.json({ error: "학생 목록이 올바르지 않습니다" }, { status: 400 });
  }

  const results = [];
  for (const studentId of studentIds) {
    try {
      const enrollment = await prisma.courseEnrollment.create({
        data: { studentId, courseId },
      });
      results.push({ studentId, success: true, enrollment });
    } catch {
      results.push({ studentId, success: false, error: "이미 등록되었거나 오류 발생" });
    }
  }

  return NextResponse.json(results);
}
