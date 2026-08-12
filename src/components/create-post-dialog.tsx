import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createPost, updatePost } from "@/services/posts.service";
import { postTypes, type CreatePostInput, type Post, type PostType, typeLabels } from "@/types";
import { useToast } from "@/components/toast-provider";

const blankPost: CreatePostInput = { type: "announcement", title: "", description: "" };
const expiryUnits = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
} as const;
type ExpiryUnit = keyof typeof expiryUnits;

export function CreatePostDialog({ user, workspaceId, post, onFinished, open: controlledOpen, onOpenChange }: { user: User; workspaceId: string; post?: Post; onFinished?: () => void; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [input, setInput] = useState<CreatePostInput>(blankPost);
  const [disappearsAfter, setDisappearsAfter] = useState(true);
  const [expiryAmount, setExpiryAmount] = useState(24);
  const [expiryUnit, setExpiryUnit] = useState<ExpiryUnit>("hours");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditing = Boolean(post);

  useEffect(() => {
    if (!open) return;
    setInput(post ? { type: post.type, title: post.title, description: post.description } : blankPost);
    setDisappearsAfter(true);
    setExpiryAmount(24);
    setExpiryUnit("hours");
  }, [open, post]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.title.trim() || !input.description.trim()) return;
    if (!post && disappearsAfter && (!Number.isFinite(expiryAmount) || expiryAmount < 1 || expiryAmount > 365)) {
      toast("Choose an expiry duration between 1 and 365.", "error");
      return;
    }
    setSubmitting(true);
    try {
      if (post) await updatePost(post.id, { ...input, title: input.title.trim(), description: input.description.trim() }, workspaceId);
      else {
        const expiresAt = disappearsAfter ? Timestamp.fromMillis(Date.now() + expiryAmount * expiryUnits[expiryUnit]) : null;
        await createPost({ ...input, title: input.title.trim(), description: input.description.trim(), expiresAt }, user, workspaceId);
      }
      toast(post ? "Post updated for everyone." : "Post shared with your workspace.");
      setOpen(false);
      onFinished?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to save post.", "error");
    } finally { setSubmitting(false); }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    {controlledOpen === undefined && <DialogTrigger asChild>{isEditing
      ? <Button variant="ghost" size="sm">Edit</Button>
      : <Button><Plus className="h-4 w-4" />New post</Button>}</DialogTrigger>}
    <DialogContent>
      <DialogHeader><DialogTitle>{isEditing ? "Edit post" : "Create a post"}</DialogTitle><DialogDescription>Share a clear update with everyone on this board.</DialogDescription></DialogHeader>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-1.5 text-sm font-medium">Post type
          <select value={input.type} onChange={(event) => setInput((current) => ({ ...current, type: event.target.value as PostType }))} className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            {postTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">Title
          <input value={input.title} maxLength={120} onChange={(event) => setInput((current) => ({ ...current, title: event.target.value }))} placeholder="What should the team know?" className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" required />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">Details
          <textarea value={input.description} maxLength={2000} onChange={(event) => setInput((current) => ({ ...current, description: event.target.value }))} placeholder="Add useful context, a location, or next steps." className="min-h-28 resize-y rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" required />
        </label>
        {isEditing ? <p className="text-sm text-muted-foreground">The post’s existing expiry setting will be kept.</p> : <fieldset className="grid gap-3 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">Post visibility</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={disappearsAfter} onChange={(event) => setDisappearsAfter(event.target.checked)} />Disappear after a set time</label>
          {disappearsAfter ? <div className="flex items-center gap-2 pl-6"><input aria-label="Expiry duration" type="number" min="1" max="365" value={expiryAmount} onChange={(event) => setExpiryAmount(event.target.valueAsNumber)} className="h-10 w-20 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" required /><select aria-label="Expiry unit" value={expiryUnit} onChange={(event) => setExpiryUnit(event.target.value as ExpiryUnit)} className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">{Object.keys(expiryUnits).map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></div> : <p className="pl-6 text-sm text-muted-foreground">This post will remain until you delete it.</p>}
        </fieldset>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}{isEditing ? "Save changes" : "Post update"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
