"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Building2,
  User,
  Wrench,
  UserPlus,
  Calendar,
  FileText,
  Search,
  Loader2,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  property: Building2,
  tenant: User,
  maintenance: Wrench,
  prospect: UserPlus,
  calendar: Calendar,
  document: FileText,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 150);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  };

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  };

  const showEmpty = query.length >= 2 && !loading && results.length === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search properties, tenants, maintenance...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={handleOpenChange} shouldFilter={false}>
        <CommandInput
          placeholder="Search everything..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {showEmpty && <CommandEmpty>No results found.</CommandEmpty>}

          {!loading && results.length > 0 && (
            <CommandGroup heading="Results">
              {results.map((result) => {
                const Icon = typeIcons[result.type] || Search;
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={`${result.title} ${result.subtitle ?? ""}`}
                    onSelect={() => handleSelect(result.href)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {!loading && query.length < 2 && (
            <CommandGroup heading="Quick Actions">
              <CommandItem value="new maintenance request" onSelect={() => handleSelect("/maintenance/new")}>
                <Wrench className="mr-2 h-4 w-4" />
                New Maintenance Request
              </CommandItem>
              <CommandItem value="add prospect" onSelect={() => handleSelect("/prospects/new")}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Prospect
              </CommandItem>
              <CommandItem value="add property" onSelect={() => handleSelect("/properties/new")}>
                <Building2 className="mr-2 h-4 w-4" />
                Add Property
              </CommandItem>
            </CommandGroup>
          )}

          {!loading && query.length >= 2 && results.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Quick Actions">
                <CommandItem value="new maintenance" onSelect={() => handleSelect("/maintenance/new")}>
                  <Wrench className="mr-2 h-4 w-4" />
                  New Maintenance Request
                </CommandItem>
                <CommandItem value="add prospect" onSelect={() => handleSelect("/prospects/new")}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Prospect
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
