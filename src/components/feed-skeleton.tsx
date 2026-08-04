import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export function FeedSkeleton() { return <div className="space-y-4">{[1, 2, 3].map((key) => <Card key={key}><CardContent className="p-6"><div className="flex gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-5 w-2/5" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div></div></CardContent></Card>)}</div>; }
