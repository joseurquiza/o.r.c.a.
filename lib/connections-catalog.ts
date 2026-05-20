/**
 * Provider catalog: what can be connected, and what each provides.
 * Status = 'available' (we have an OAuth flow) | 'soon' (placeholder)
 *
 * NOTE: This must NOT live in a "use server" file because non-async exports
 * are not allowed there. It is safe to import from both server and client.
 */
export const PROVIDER_CATALOG = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Read inbox, draft replies, send email, manage labels",
    tools: ["read_inbox", "read_email", "draft_reply", "send_email", "label_email"],
    connectUrl: "/api/gmail/connect",
    status: "available" as const,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Read channels, post messages, DM teammates, manage threads",
    tools: ["read_channel", "post_message", "send_dm"],
    connectUrl: null,
    status: "soon" as const,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Search, read, and append to pages and databases",
    tools: ["search_pages", "read_page", "append_block", "create_page"],
    connectUrl: null,
    status: "soon" as const,
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Read tickets, reply to customers, set priorities, escalate",
    tools: ["read_tickets", "reply_ticket", "set_priority", "escalate"],
    connectUrl: null,
    status: "soon" as const,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Create issues, update status, comment, assign",
    tools: ["create_issue", "update_issue", "add_comment"],
    connectUrl: null,
    status: "soon" as const,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Read/write contacts, deals, log activities",
    tools: ["read_contact", "update_contact", "log_activity", "create_deal"],
    connectUrl: null,
    status: "soon" as const,
  },
] as const

export type ProviderCatalogEntry = (typeof PROVIDER_CATALOG)[number]
