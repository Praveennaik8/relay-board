import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Check, ChevronDown, CircleAlert, HandHeart, Lightbulb, MapPin, Megaphone, MoreHorizontal, Users, Vote } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Comments } from "@/components/comments";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { useToast } from "@/components/toast-provider";
import { useOwnAction } from "@/hooks/use-own-action";
import { formatRelativeTime } from "@/lib/utils";
import { deletePost, performAction, subscribeToComments } from "@/services/posts.service";
import { actionMeta, typeLabels, type ActionType, type Comment, type Post, type PostType } from "@/types";

const typeStyle: Record<PostType, { icon: typeof CircleAlert; className: string }> = {
  issue: { icon: CircleAlert, className: "bg-red-50 text-red-700 ring-red-100" },
  activity: { icon: Users, className: "bg-violet-50 text-violet-700 ring-violet-100" },
  tip: { icon: Lightbulb, className: "bg-amber-50 text-amber-700 ring-amber-100" },
  announcement: { icon: Megaphone, className: "bg-blue-50 text-blue-700 ring-blue-100" },
  "lost-found": { icon: MapPin, className: "bg-teal-50 text-teal-700 ring-teal-100" },
  poll: { icon: Vote, className: "bg-pink-50 text-pink-700 ring-pink-100" },
};

export function PostCard({ post, user }: { post: Post; user: User }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [acting, setActing] = useState(false);
  const [editing, setEditing] = useState(false);
  const ownAction = useOwnAction(post.id, user.uid);
  const { toast } = useToast();
  const meta = actionMeta[post.type];
  const style = typeStyle[post.type];
  const TypeIcon = style.icon;

  useEffect(() => {
    if (!commentsOpen) return;
    return subscribeToComments(post.id, setComments, (error) => toast(error.message, "error"));
  }, [commentsOpen, post.id, toast]);

  async function act(action: ActionType) {
    setActing(true);
    try { await performAction(post, action, user); toast("Your response was shared."); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not save your response.", "error"); }
    finally { setActing(false); }
  }

  async function remove() {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try { await deletePost(post.id); toast("Post deleted."); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not delete post.", "error"); }
  }

  return <Card className="overflow-hidden transition-shadow hover:shadow-md">
    <CardContent className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Avatar name={post.author.name} src={post.author.photoURL} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="truncate text-sm font-semibold">{post.author.name}</span><span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span></div></div>
            <ExpiryBadge expiresAt={post.expiresAt} />
            {post.author.uid === user.uid && <><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Post options</span></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onSelect={() => setEditing(true)}>Edit post</DropdownMenuItem><DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-700" onSelect={remove}>Delete post</DropdownMenuItem></DropdownMenuContent></DropdownMenu><CreatePostDialog post={post} user={user} open={editing} onOpenChange={setEditing} /></>}
          </div>
          <div className="mt-4 flex items-center gap-2"><Badge className={style.className}><TypeIcon className="mr-1 h-3.5 w-3.5" />{typeLabels[post.type]}</Badge>{post.updatedAt && post.createdAt && post.updatedAt.seconds - post.createdAt.seconds > 1 && <span className="text-xs text-muted-foreground">Edited</span>}</div>
          <h2 className="mt-3 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{post.title}</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{post.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <ActionButton label={meta.label} count={post.actionCounts[meta.action]} selected={ownAction === meta.action} disabled={acting || Boolean(ownAction)} onClick={() => act(meta.action)} />
            {meta.secondary && <ActionButton label={meta.secondary.label} count={post.actionCounts[meta.secondary.action]} selected={ownAction === meta.secondary.action} disabled={acting || Boolean(ownAction)} onClick={() => act(meta.secondary!.action)} />}
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => setCommentsOpen((open) => !open)}>Comments <ChevronDown className={`h-3.5 w-3.5 transition-transform ${commentsOpen ? "rotate-180" : ""}`} /></Button>
          </div>
          {commentsOpen && <Comments comments={comments} postId={post.id} user={user} />}
        </div>
      </div>
    </CardContent>
  </Card>;
}

function ActionButton({ label, count, selected, disabled, onClick }: { label: string; count: number; selected: boolean; disabled: boolean; onClick: () => void }) {
  return <Button variant={selected ? "secondary" : "outline"} size="sm" disabled={disabled} onClick={onClick} className={selected ? "border border-blue-200 bg-blue-50 text-blue-700" : "text-slate-600"}>
    {selected ? <Check className="h-3.5 w-3.5" /> : <HandHeart className="h-3.5 w-3.5" />}{selected ? "Responded" : label}<span className="ml-0.5 text-muted-foreground">{count}</span>
  </Button>;
}

function ExpiryBadge({ expiresAt }: { expiresAt: Post["expiresAt"] }) {
  if (!expiresAt) return null;
  const label = `Expires at ${expiresAt.toDate().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;

  return <span className="shrink-0 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">{label}</span>;
}
