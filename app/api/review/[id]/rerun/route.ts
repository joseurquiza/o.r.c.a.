import { NextRequest, NextResponse } from "next/server"
import { rerunChecks } from "@/lib/actions/submissions"

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  await rerunChecks(id)
  return NextResponse.redirect(new URL(`/review/${id}`, req.url))
}
