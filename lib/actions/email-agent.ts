"use server"

import { createClient } from "@/lib/supabase/server"
import { GmailClient } from "@/lib/gmail-client"
import { generateText, Output, tool } from "ai"
import { z } from "zod"
import { revalidatePath } from "next/cache"

export async function getEmailAgents() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("email_agents")
    .select("*")
    .order("connected_at", { ascending: false })

  if (error) return { success: false, error: error.message, agents: [] }
  return { success: true, agents: data || [] }
}

export async function getEmailSummaries(agentId: string, limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("email_summaries")
    .select("*")
    .eq("email_agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return { success: false, error: error.message, summaries: [] }
  return { success: true, summaries: data || [] }
}

export async function disconnectEmailAgent(agentId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("email_agents").delete().eq("id", agentId)
  if (error) return { success: false, error: error.message }
  revalidatePath("/agents/email")
  return { success: true }
}

const summarySchema = z.object({
  summary: z.string().describe("A concise 2-3 sentence summary of the most important things from today's emails"),
  actionItems: z.array(
    z.object({
      task: z.string().describe("Clear, actionable task description"),
      priority: z.enum(["high", "medium", "low"]),
      dueDate: z.string().nullable().describe("ISO date if mentioned in email, otherwise null"),
      relatedEmail: z.string().nullable().describe("Subject of the email this came from"),
    }),
  ),
  importantEmails: z.array(
    z.object({
      from: z.string(),
      subject: z.string(),
      reason: z.string().describe("Why this email is important"),
    }),
  ),
})

export async function runEmailAnalysis(agentId: string, hoursBack = 24) {
  const supabase = await createClient()

  const { data: agent, error: agentError } = await supabase
    .from("email_agents")
    .select("*")
    .eq("id", agentId)
    .single()

  if (agentError || !agent) {
    return { success: false, error: "Agent not found" }
  }

  try {
    const gmail = new GmailClient(agent.gmail_access_token, agent.gmail_refresh_token, agent.id)

    // Fetch recent messages
    const days = Math.max(1, Math.ceil(hoursBack / 24))
    const messageRefs = await gmail.listMessages(`newer_than:${days}d`, 30)

    if (messageRefs.length === 0) {
      return { success: true, message: "No new emails to analyze", emailCount: 0 }
    }

    // Read messages (limited to keep prompt size manageable)
    const messages = await Promise.all(messageRefs.slice(0, 25).map((m) => gmail.getMessage(m.id)))

    const emailText = messages
      .map(
        (m, i) =>
          `EMAIL ${i + 1}:\nFrom: ${m.from}\nSubject: ${m.subject}\nDate: ${m.date}\nUnread: ${m.unread}\nImportant: ${m.important}\n\n${m.body || m.snippet}\n---`,
      )
      .join("\n\n")

    const result = await generateText({
      model: "openai/gpt-5-mini",
      system: `You are an executive assistant analyzing the user's recent emails. Your job is to:
1. Identify the most important items requiring the user's attention
2. Extract clear action items with priorities
3. Highlight emails that need a response or are time-sensitive
4. Ignore newsletters, promotions, and automated notifications unless truly important

Be concise and focus on what matters most.`,
      prompt: `Here are ${messages.length} emails from the last ${hoursBack} hours. Analyze them and provide a prioritized summary:\n\n${emailText}`,
      experimental_output: Output.object({ schema: summarySchema }),
    })

    const analysis = result.experimental_output

    // Save summary
    const today = new Date().toISOString().split("T")[0]
    const { data: saved, error: saveError } = await supabase
      .from("email_summaries")
      .insert({
        email_agent_id: agent.id,
        gmail_email: agent.gmail_email,
        summary_date: today,
        summary_text: analysis.summary,
        action_items: analysis.actionItems,
        important_emails: analysis.importantEmails,
        email_count: messages.length,
        hours_analyzed: hoursBack,
      })
      .select()
      .single()

    if (saveError) {
      return { success: false, error: saveError.message }
    }

    // Update last_run_at
    await supabase.from("email_agents").update({ last_run_at: new Date().toISOString() }).eq("id", agent.id)

    revalidatePath("/agents/email")
    return { success: true, summary: saved, emailCount: messages.length }
  } catch (err) {
    console.error("[v0] Email analysis error:", err)
    return { success: false, error: err instanceof Error ? err.message : "Analysis failed" }
  }
}
