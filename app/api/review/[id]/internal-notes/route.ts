import { NextRequest, NextResponse } from "next/server"
import { addReviewerNote } from "@/lib/actions/submissions"

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const fd = await req.formData()
  fd.set("submission_id", id)
  await addReviewerNote(fd)
  return NextResponse.redirect(new URL(`/review/${id}`, req.url))
}
