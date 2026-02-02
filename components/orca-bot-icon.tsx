interface OrcaBotIconProps {
  className?: string
}

export function OrcaBotIcon({ className = "w-8 h-8" }: OrcaBotIconProps) {
  return <img src="/orca-logo.png" alt="ORCA Logo" className={className} style={{ aspectRatio: "1/1" }} />
}
