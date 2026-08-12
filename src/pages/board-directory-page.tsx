import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { LoaderCircle, LogOut, MessageSquareText, Plus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/toast-provider";
import { createBoard, subscribeToBoards, subscribeToJoinedBoardIds } from "@/services/boards.service";
import { signOutUser } from "@/services/auth.service";
import type { Board } from "@/types";

export function BoardDirectoryPage({ user }: { user: User }) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [joinedBoardIds, setJoinedBoardIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => subscribeToBoards(
    (nextBoards) => { setBoards(nextBoards); setLoading(false); },
    (error) => { toast(error.message, "error"); setLoading(false); },
  ), [toast]);
  useEffect(() => subscribeToJoinedBoardIds(user.uid, setJoinedBoardIds, (error) => toast(error.message, "error")), [user.uid, toast]);

  async function signOut() { try { await signOutUser(); } catch { toast("Could not sign out. Please try again.", "error"); } }

  return <div className="min-h-screen bg-[#f8fafc]"><header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><Link to="/boards" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1a73e8] text-white"><MessageSquareText className="h-4 w-4" /></span>RelayBoard</Link><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium leading-none">{user.displayName || "Team member"}</p><p className="mt-1 text-xs text-muted-foreground">Your boards</p></div><Avatar name={user.displayName || "Team member"} src={user.photoURL} /><Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button></div></div></header>
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-medium text-[#185abc]"><Users className="h-4 w-4" />Boards</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Find your team’s board.</h1><p className="mt-2 text-sm text-muted-foreground">Boards are discoverable. Enter an access code to join one.</p></div><CreateBoardDialog user={user} /></div>
      {loading ? <div className="mt-8 text-sm text-muted-foreground">Loading boards…</div> : boards.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2">{boards.map((board) => <Card key={board.id}><CardContent className="flex min-h-40 flex-col p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">{board.name}</h2><p className="mt-1 text-sm text-muted-foreground">Created by {board.createdByName}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{board.memberCount} {board.memberCount === 1 ? "member" : "members"}</span></div><div className="mt-auto pt-5"><Link to={`/boards/${board.id}`} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">{joinedBoardIds.has(board.id) ? "Open board" : "Join board"}</Link></div></CardContent></Card>)}</div> : <div className="mt-8 rounded-xl border border-dashed bg-white px-6 py-16 text-center"><MessageSquareText className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-4 font-semibold">No boards yet</h2><p className="mt-1 text-sm text-muted-foreground">Create the first one for your team.</p></div>}
    </main></div>;
}

function CreateBoardDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { boardId } = await createBoard(name, accessCode, user);
      setOpen(false);
      navigate(`/boards/${boardId}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not create board.", "error");
    } finally { setSubmitting(false); }
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="h-4 w-4" />Create board</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create a board</DialogTitle><DialogDescription>Set a name and a private access code for your team.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={submit}><label className="grid gap-1.5 text-sm font-medium">Board name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} placeholder="Design team" className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" required /></label><label className="grid gap-1.5 text-sm font-medium">Access code<input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} minLength={6} maxLength={128} type="password" placeholder="At least 6 characters" className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" required /></label><p className="text-xs leading-5 text-muted-foreground">Share this code only with people who should join the board. It cannot be changed yet.</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}Create board</Button></div></form></DialogContent></Dialog>;
}
