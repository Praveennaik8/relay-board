import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { isFirebaseConfigured } from "@/firebase/config";
import { SignInPage } from "@/pages/sign-in-page";
import { BoardDirectoryPage } from "@/pages/board-directory-page";
import { BoardPage } from "@/pages/board-page";

export default function App() {
  const { user, loading } = useAuth();
  if (!isFirebaseConfigured) return <ConfigurationRequired />;
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f8fafc] text-sm text-muted-foreground">Opening RelayBoard…</div>;
  return <Routes><Route path="/" element={<Navigate to={user ? "/boards" : "/sign-in"} replace />} /><Route path="/sign-in" element={user ? <Navigate to="/boards" replace /> : <SignInPage />} /><Route path="/boards" element={user ? <BoardDirectoryPage user={user} /> : <Navigate to="/sign-in" replace />} /><Route path="/boards/:boardId" element={user ? <BoardPage user={user} /> : <Navigate to="/sign-in" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}

function ConfigurationRequired() {
  return <main className="grid min-h-screen place-items-center bg-[#f8fafc] p-6"><section className="max-w-lg rounded-xl border bg-white p-7 shadow-sm"><p className="text-sm font-semibold text-[#185abc]">RelayBoard setup</p><h1 className="mt-2 text-2xl font-semibold">Firebase configuration is required</h1><p className="mt-3 text-sm leading-6 text-slate-600">Copy <code className="rounded bg-slate-100 px-1.5 py-0.5">.env.example</code> to <code className="rounded bg-slate-100 px-1.5 py-0.5">.env</code> and add your Firebase web app values. Then restart the Vite server.</p></section></main>;
}
