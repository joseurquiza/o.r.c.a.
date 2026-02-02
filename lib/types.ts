export interface Agent {
  id: string
  name: string
  description: string
  status: "active" | "inactive"
  connectedAPIs: string[]
  apiPermissions: Record<string, APIPermission>
  goals: string
  triggers: Trigger[]
  actions: Action[]
  createdAt: Date
  lastActive?: Date
}

export interface APIPermission {
  level: "read" | "write" | "admin"
  scopes: string[]
  keyId?: string
}

export interface Trigger {
  id: string
  type: "time-based" | "event-based" | "command-based"
  config: Record<string, any>
}

export interface Action {
  id: string
  type: "api-call" | "webhook" | "notification"
  config: Record<string, any>
}

export interface APIIntegration {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  apiKey?: string
}

export interface TestMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}
