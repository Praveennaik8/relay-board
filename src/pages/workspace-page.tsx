import { useMemo, useState } from "react";
import type { User } from "firebase/auth";
import * as Tabs from "@radix-ui/react-tabs";
import { LogOut, MessageSquareText, Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { FeedSkeleton } from "@/components/feed-skeleton";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/components/toast-provider";
import { usePosts } from "@/hooks/use-posts";
import { signOutUser } from "@/services/auth.service";
import { postTypes, type PostType, typeLabels } from "@/types";

type Filter = "all" | PostType;
export function WorkspacePage({ user }: { user: User }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const { posts, loading, error } = usePosts(filter === "all" ? undefined : filter);
  const { toast } = useToast();
  const visiblePosts = useMemo(() => posts.filter((post) => (filter === "all" || post.type === filter) && post.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [posts, filter, search]);
  async function signOut() { try { await signOutUser(); } catch { toast("Could not sign out. Please try again.", "error"); } }

  return <div className="min-h-screen bg-[#f8fafc]"><header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><a href="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1a73e8] text-white"><MessageSquareText className="h-4 w-4" /></span>RelayBoard</a><div className="flex items-center gap-2 sm:gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-medium leading-none">{user.displayName || "Team member"}</p><p className="mt-1 text-xs text-muted-foreground">Main workspace</p></div><Avatar name={user.displayName || "Team member"} src={user.photoURL} /><Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /></Button></div></div></header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]"><section className="min-w-0"><div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-sm font-medium text-[#185abc]"><Users className="h-4 w-4" />Main workspace</div><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Team updates, in sync.</h1><p className="mt-1.5 text-sm text-muted-foreground">Every post and response updates instantly for your team.</p></div><CreatePostDialog user={user} /></div>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Tabs.Root value={filter} onValueChange={(value) => setFilter(value as Filter)}><Tabs.List className="-mx-1 flex max-w-full gap-1 overflow-x-auto pb-1"><FilterTab value="all">All</FilterTab>{postTypes.map((type) => <FilterTab key={type} value={type}>{typeLabels[type]}</FilterTab>)}</Tabs.List></Tabs.Root><label className="relative block sm:w-52"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles" className="h-9 w-full rounded-md border bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label></div>
        {loading ? <FeedSkeleton /> : error ? <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">Couldn’t load the realtime feed. {error}</div> : visiblePosts.length ? <div className="space-y-4">{visiblePosts.map((post) => <PostCard post={post} user={user} key={post.id} />)}</div> : <div className="rounded-xl border border-dashed bg-white px-6 py-16 text-center"><MessageSquareText className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-4 font-semibold">No posts found</h2><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{search ? "Try a different title or clear your search." : "Start the conversation with an update for the workspace."}</p></div>}
      </section><aside className="hidden lg:block"><div className="sticky top-24 rounded-xl border bg-white p-5"><p className="text-sm font-semibold">How RelayBoard works</p><div className="mt-4 space-y-4 text-sm leading-5 text-slate-600"><p><b className="text-slate-900">Post once.</b> Everyone in this workspace sees it immediately.</p><p><b className="text-slate-900">Respond once.</b> Actions are counted live and protected from duplicates.</p><p><b className="text-slate-900">Keep context.</b> Comments stay with the update.</p></div></div></aside></div></main></div>;
}

function FilterTab({ value, children }: { value: Filter; children: React.ReactNode }) { return <Tabs.Trigger value={value} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground outline-none data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">{children}</Tabs.Trigger>; }
