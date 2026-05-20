"use server"

import { createClient } from "@/lib/supabase/server"
import { GmailClient } from "@/lib/gmail-client"
import { generateText, Output } from "ai"
import { z } from "zod"
import { getCurrentOrgId } from "@/lib/orgs"
import { revalidatePath } from "next/cache"

const TriageSchema = z.object({
  intent: z.enum(["question", "complaint", "feature_request", "bug", "billing", "thanks", "other"]),
  sentiment: z.enum(["positive", "neutral", "negative", "urgent"]),
  confidence: z.number().min(0).max(1),
  needs_human: z.boolean(),
  reasoning: z.string(),
  suggested_reply: z.string().nullable(),
  suggested_labels: z.array(z.string()),
})

/**
 * Run a Support Worker once: pull recent unread emails, triage each with the LLM,
 * and create approval requests for any actions (replies, escalations).
 */
export async function runSupportWorker(workerId: string) {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  // 1. Load worker
  const { data: worker, error: wErr } = await supabase
    .from("workers")
    .select("*")
    .eq("id", workerId)
    .eq("org_id", orgId)
    .single()
  if (wErr || !worker) throw new Error("Worker not found")
  if (worker.template !== "support") throw new Error("Not a support worker")

  // 2. Get Gmail connection
  const { data: gmailConn } = await supabase
    .from("connections")
    .select("*")
    .eq("org_id", orgId)
    .eq("provider", "gmail")
    .eq("status", "active")
    .in("id", worker.connection_ids || [])
    .limit(1)
    .single()

  if (!gmailConn) {
    throw new Error("No Gmail connection assigned. Connect Gmail and assign it to this worker.")
  }

  const startedAt = Date.now()
  await supabase.from("audit_log").insert({
    org_id: orgId,
    worker_id: workerId,
    event_type: "run_started",
    input_summary: "Triaging unread support emails",
  })

  const gmail = new GmailClient(gmailConn.access_token!, gmailConn.refresh_token!, gmailConn.id)

  // 3. Pull recent unread
  const messages = await gmail.listMessages("is:unread newer_than:1d", 10)
  let proposed = 0
  let runActions = 0

  for (const m of messages) {
    try {
      const msg = await gmail.getMessage(m.id)

      // 4. Triage with LLM
      const { output: triage } = await generateText({
        model: "openai/gpt-5-mini",
        system: worker.system_prompt || "",
        prompt: `Customer email:
From: ${msg.from}
Subject: ${msg.subject}
Body:
${msg.body.slice(0, 3000)}

Triage this email. Decide intent, sentiment, whether a human must handle it, and a draft reply (or null).`,
        output: Output.object({ schema: TriageSchema }),
      })

      // 5. Create an approval for the suggested reply (approve-by-default)
      if (triage.suggested_reply) {
        await supabase.from("approvals").insert({
          org_id: orgId,
          worker_id: workerId,
          action_type: "send_email",
          action_summary: `Reply to "${msg.subject}" (${msg.from.split("<")[0].trim()})`,
          action_payload: {
            to: msg.from,
            subject: msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`,
            body: triage.suggested_reply,
            threadId: msg.threadId,
          },
          reasoning: triage.reasoning,
          context: {
            from: msg.from,
            subject: msg.subject,
            snippet: msg.snippet,
            intent: triage.intent,
            sentiment: triage.sentiment,
          },
          confidence: triage.confidence,
          status: "pending",
        })
        proposed++

        await supabase.from("audit_log").insert({
          org_id: orgId,
          worker_id: workerId,
          event_type: "action_proposed",
          tool_name: "send_email",
          input_summary: `Re: ${msg.subject}`,
          output_summary: triage.reasoning,
        })
      }

      if (triage.needs_human) {
        await supabase.from("approvals").insert({
          org_id: orgId,
          worker_id: workerId,
          action_type: "escalate",
          action_summary: `Escalate "${msg.subject}" (${triage.sentiment})`,
          action_payload: { reason: triage.reasoning, messageId: msg.id, from: msg.from },
          reasoning: triage.reasoning,
          context: { from: msg.from, subject: msg.subject, snippet: msg.snippet },
          confidence: triage.confidence,
          status: "pending",
        })
        proposed++
      }

      runActions++
    } catch (err: any) {
      console.error("[v0] support worker email error:", err)
      await supabase.from("audit_log").insert({
        org_id: orgId,
        worker_id: workerId,
        event_type: "error",
        output_summary: err.message,
      })
    }
  }

  // 6. Bookkeeping
  const latencyMs = Date.now() - startedAt
  await supabase
    .from("workers")
    .update({
      last_run_at: new Date().toISOString(),
      total_runs: (worker.total_runs || 0) + 1,
      total_actions: (worker.total_actions || 0) + runActions,
    })
    .eq("id", workerId)

  await supabase.from("audit_log").insert({
    org_id: orgId,
    worker_id: workerId,
    event_type: "run_completed",
    input_summary: `Processed ${runActions} emails`,
    output_summary: `${proposed} actions proposed, awaiting approval`,
    latency_ms: latencyMs,
  })

  revalidatePath("/workers")
  revalidatePath(`/workers/${workerId}`)
  revalidatePath("/inbox")
  revalidatePath("/")

  return { processed: runActions, proposed }
}
