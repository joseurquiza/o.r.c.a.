import { getConnections, disconnectConnection } from "@/lib/actions/connections"
import { PROVIDER_CATALOG } from "@/lib/connections-catalog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plug, CheckCircle2, AlertCircle, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const params = await searchParams
  const connections = await getConnections()
  const byProvider = new Map(connections.map((c) => [c.provider, c]))

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Plug className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-balance">Connections</h1>
            <p className="text-muted-foreground">
              Connect the tools your AI workers will use. Each connection unlocks a set of tools workers can call.
            </p>
          </div>
        </div>

        {params.connected && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
            <CheckCircle2 className="h-4 w-4" />
            Connected {params.connected} successfully.
          </div>
        )}
        {params.error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
            <AlertCircle className="h-4 w-4" />
            Connection failed: {params.error}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDER_CATALOG.map((provider) => {
          const conn = byProvider.get(provider.id)
          const isConnected = !!conn && conn.status === "active"

          return (
            <Card key={provider.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {provider.name}
                      {provider.status === "soon" && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Coming soon
                        </Badge>
                      )}
                      {isConnected && (
                        <Badge className="text-xs bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">{provider.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-4">
                <div className="flex flex-wrap gap-1">
                  {provider.tools.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs font-mono">
                      {t}
                    </Badge>
                  ))}
                </div>

                {isConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
                      {conn?.account_picture && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={conn.account_picture || "/placeholder.svg"}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conn?.account_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{conn?.account_email}</p>
                      </div>
                    </div>
                    <form
                      action={async () => {
                        "use server"
                        if (conn) await disconnectConnection(conn.id)
                      }}
                    >
                      <Button type="submit" variant="outline" size="sm" className="w-full">
                        Disconnect
                      </Button>
                    </form>
                  </div>
                ) : provider.status === "available" && provider.connectUrl ? (
                  <Button asChild className="w-full">
                    <a href={`${provider.connectUrl}?from=connections`}>Connect {provider.name}</a>
                  </Button>
                ) : (
                  <Button disabled className="w-full" variant="outline">
                    Available soon
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
