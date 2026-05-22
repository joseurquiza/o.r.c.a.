import { signOut } from "@/lib/actions/auth"

export default function LogoutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form action={signOut}>
        <button type="submit" className="underline">
          Click here to sign out
        </button>
      </form>
    </div>
  )
}
