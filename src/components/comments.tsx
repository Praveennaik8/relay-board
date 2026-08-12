import { useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { LoaderCircle, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { formatRelativeTime } from "@/lib/utils";
import { addComment } from "@/services/posts.service";
import type { Comment } from "@/types";

export function Comments({ comments, postId, user, workspaceId }: { comments: Comment[]; postId: string; user: User; workspaceId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try { await addComment(postId, text, user, workspaceId); setText(""); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not add comment.", "error"); }
    finally { setSending(false); }
  }
  return <div className="mt-4 border-t pt-4">
    <div className="space-y-3">{comments.map((comment) => <div className="flex gap-2.5" key={comment.id}>
      <Avatar name={comment.author.name} src={comment.author.photoURL} className="h-7 w-7" />
      <div className="min-w-0 flex-1 rounded-lg bg-muted/70 px-3 py-2"><div className="flex items-baseline gap-2"><span className="text-xs font-semibold">{comment.author.name}</span><span className="text-[11px] text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span></div><p className="mt-0.5 whitespace-pre-wrap text-sm">{comment.text}</p></div>
    </div>)}</div>
    <form onSubmit={submit} className="mt-4 flex gap-2"><input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder="Write a comment…" className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><Button type="submit" size="icon" aria-label="Send comment" disabled={sending || !text.trim()}>{sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></form>
  </div>;
}
