import { NextResponse } from "next/server";
import type { Role } from "@tars/contracts";
import { answer } from "../../../lib/customer-service";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const { role, question } = (await req.json()) as { role: Role; question: string };
    if (!role || !question) return NextResponse.json({ error: "role and question are required" }, { status: 400 });
    return NextResponse.json({ answer: await answer(role, question) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
