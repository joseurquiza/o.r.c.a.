import type React from "react"
import NextLink from "next/link"

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
}

export const Link: React.FC<LinkProps> = ({ href, children, ...props }) => {
  return (
    <NextLink href={href} {...props}>
      {children}
    </NextLink>
  )
}
