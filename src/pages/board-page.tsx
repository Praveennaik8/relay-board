import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { Link, useParams } from "react-router-dom";
import { LoaderCircle, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { joinBoard, subscribeToBoard, subscribeToMembership } from "@/services/boards.service";
import type { Board, BoardMembership } from "@/types";
import { WorkspacePage } from "@/pages/workspace-page";

export function BoardPage({ user }: { user: User }) {
  const { boardId } = useParams();
  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  const [membership, setMembership] = useState<BoardMembership | null | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (!boardId) return;
    return subscribeToBoard(boardId, setBoard, (error) => { toast(error.message, "error"); setBoard(null); });
  }, [boardId, toast]);
  useEffect(() => {
    if (!boardId) return;
    return subscribeToMembership(boardId, user.uid, setMembership, (error) => { toast(error.message, "error"); setMembership(null); });
  }, [boardId, user.uid, toast]);

  if (!boardId || board === null) return <StatusPage title="Board not found" description="This board may no longer exist." />;
  if (board === undefined || membership === undefined) return <StatusPage title="Opening board…" />;
  if (!membership) return <JoinBoardPage board={board} user={user} />;
  return <WorkspacePage user={user} board={board} />;
}

function JoinBoardPage({ board, user }: { board: Board; user: User }) {
  const [accessCode, setAccessCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joinRequested, setJoinRequested] = useState(false);
  const { toast } = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await joinBoard(board.id, accessCode, user);
      setAccessCode("");
      setJoinRequested(true);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not join board.", "error");
    } finally { setSubmitting(false); }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f8fafc] p-6"><section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm"><Link to="/boards" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1a73e8] text-white"><MessageSquareText className="h-4 w-4" /></span>RelayBoard</Link><p className="mt-8 text-sm font-medium text-[#185abc]">Join board</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{board.name}</h1><p className="mt-3 text-sm leading-6 text-slate-600">Enter the access code from the board owner to see posts and join the conversation.</p><form className="mt-6 grid gap-4" onSubmit={submit}><label className="grid gap-1.5 text-sm font-medium">Access code<input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} minLength={6} maxLength={128} type="password" autoFocus className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" required disabled={joinRequested} /></label><Button type="submit" disabled={submitting || joinRequested}>{submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{joinRequested ? "Joining board…" : "Join board"}</Button></form>{joinRequested && <p className="mt-3 text-sm text-muted-foreground">Access accepted. Finishing your join…</p>}<Link to="/boards" className="mt-5 inline-block text-sm text-[#185abc] hover:underline">Back to all boards</Link></section></main>;
}

function StatusPage({ title, description }: { title: string; description?: string }) {
  return <main className="grid min-h-screen place-items-center bg-[#f8fafc] p-6"><section className="text-center"><h1 className="text-xl font-semibold text-slate-900">{title}</h1>{description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}<Link to="/boards" className="mt-5 inline-block text-sm text-[#185abc] hover:underline">Back to boards</Link></section></main>;
}
