import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 학생 한 명의 대화 기록 조회 (교사 대시보드 '대화 열람' 탭)
// 수업 상세(GET /api/courses/[id])는 개수만 내려주고, 본문은 여기서 필요할 때만 가져온다.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; instanceId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const { id: courseId, instanceId } = await params;

  // 내 수업의 인스턴스인지 확인
  const instance = await prisma.aIInstance.findFirst({
    where: { id: instanceId, courseId, course: { teacherId: session.user.id } },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true, createdAt: true },
      },
    },
  });
  if (!instance) {
    return NextResponse.json({ error: "대화를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({
    messages: instance.messages,
    comprehensionState: instance.comprehensionState,
  });
}
