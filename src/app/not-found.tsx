import Link from "next/link";
import { Building2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Building2 className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
