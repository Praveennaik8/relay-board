import { LoaderCircle, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { signInWithGoogle } from "@/services/auth.service";
import { useState } from "react";

export function SignInPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  async function signIn() {
    setLoading(true);
    try { await signInWithGoogle(); }
    catch (error) { toast(error instanceof Error ? error.message : "Google sign-in failed.", "error"); }
    finally { setLoading(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-[#f8fafc] p-6"><section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm sm:p-10"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a73e8] text-white"><MessageSquareText className="h-6 w-6" /></div><h1 className="mt-7 text-3xl font-semibold tracking-tight text-slate-900">Keep work moving.</h1><p className="mt-3 text-sm leading-6 text-slate-600">RelayBoard is a shared, realtime space for the updates your team needs to see.</p><Button className="mt-8 w-full" size="lg" onClick={signIn} disabled={loading}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <GoogleMark />}Continue with Google</Button><p className="mt-5 text-center text-xs leading-5 text-slate-500">Sign in to join the Main workspace and start sharing updates.</p></section></main>;
}

function GoogleMark() { return <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-bold text-[#4285f4]">G</span>; }
