import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 교사의 지식파일 라이브러리 조회
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const subject = req.nextUrl.searchParams.get("subject");

  const files = await prisma.knowledgeFile.findMany({
    where: {
      teacherId: session.user.id,
      ...(subject ? { subject } : {}),
    },
    include: {
      _count: { select: { courses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(files);
}

// 지식파일 업로드 (텍스트 직접 입력 또는 파일 업로드)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  // 저장 상한 — 프롬프트에는 어차피 MAX_KNOWLEDGE_CHARS(12,000자)까지만 들어가므로,
  // DB만 불리는 초대형 업로드(교과서 통짜 등)를 막는다
  const MAX_CONTENT_CHARS = 200_000;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // 파일 업로드
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fileType = (formData.get("fileType") as string) || "custom";
    const subject = (formData.get("subject") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    const content = await file.text();
    if (content.length > MAX_CONTENT_CHARS) {
      return NextResponse.json({ error: "파일이 너무 큽니다 (20만 자 이내). 필요한 부분만 잘라서 올려주세요." }, { status: 400 });
    }

    const knowledgeFile = await prisma.knowledgeFile.create({
      data: {
        teacherId: session.user.id,
        fileName: file.name,
        content,
        fileType,
        subject,
      },
    });

    return NextResponse.json(knowledgeFile);
  } else {
    // JSON으로 직접 입력
    const { fileName, content, fileType, subject } = await req.json();

    if (!fileName || !content) {
      return NextResponse.json({ error: "파일명과 내용을 입력해주세요" }, { status: 400 });
    }
    if (String(content).length > MAX_CONTENT_CHARS) {
      return NextResponse.json({ error: "내용이 너무 깁니다 (20만 자 이내). 필요한 부분만 잘라서 올려주세요." }, { status: 400 });
    }

    const knowledgeFile = await prisma.knowledgeFile.create({
      data: {
        teacherId: session.user.id,
        fileName,
        content,
        fileType: fileType || "custom",
        subject: subject || "",
      },
    });

    return NextResponse.json(knowledgeFile);
  }
}
