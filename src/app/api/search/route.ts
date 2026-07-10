import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import Fuse from "fuse.js";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "search:global")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const contains = { contains: q, mode: "insensitive" as const };

  // Direct database partial matches (addresses, phones, names)
  const [dbProperties, dbTenants, dbProspects, dbMaintenance, dbUnits] = await Promise.all([
    db.property.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: contains },
          { addressLine1: contains },
          { addressLine2: contains },
          { city: contains },
          { zipCode: contains },
          { tags: { has: q } },
        ],
      },
      select: { id: true, name: true, addressLine1: true, city: true, state: true, zipCode: true },
      take: 20,
    }),
    db.tenant.findMany({
      where: {
        deletedAt: null,
        OR: [
          { phone: contains },
          { user: { name: contains } },
          { user: { email: contains } },
          { user: { phone: contains } },
        ],
      },
      include: { user: { select: { name: true, email: true, phone: true } } },
      take: 20,
    }),
    db.prospect.findMany({
      where: {
        deletedAt: null,
        OR: [{ name: contains }, { email: contains }, { phone: contains }],
      },
      select: { id: true, name: true, email: true, phone: true, status: true },
      take: 20,
    }),
    db.maintenanceRequest.findMany({
      where: {
        deletedAt: null,
        OR: [{ title: contains }, { requestNumber: contains }, { description: contains }],
      },
      select: { id: true, requestNumber: true, title: true, status: true },
      take: 20,
    }),
    db.unit.findMany({
      where: {
        deletedAt: null,
        OR: [{ unitNumber: contains }],
      },
      include: { property: { select: { name: true } } },
      take: 20,
    }),
  ]);

  // Broader fuzzy pool for Fuse ranking
  const [properties, tenants, prospects, maintenance, documents, calendarEvents] =
    await Promise.all([
      db.property.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, addressLine1: true, city: true, state: true, zipCode: true },
        take: 100,
      }),
      db.tenant.findMany({
        where: { deletedAt: null },
        include: { user: { select: { name: true, email: true, phone: true } } },
        take: 50,
      }),
      db.prospect.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, email: true, phone: true, status: true },
        take: 50,
      }),
      db.maintenanceRequest.findMany({
        where: { deletedAt: null },
        select: { id: true, requestNumber: true, title: true, status: true },
        take: 50,
      }),
      db.document.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, type: true },
        take: 50,
      }),
      db.calendarEvent.findMany({
        where: { deletedAt: null },
        select: { id: true, title: true, type: true },
        take: 50,
      }),
    ]);

  type SearchItem = {
    id: string;
    type: string;
    title: string;
    subtitle: string;
    href: string;
    searchText: string;
    score: number;
  };

  const resultMap = new Map<string, SearchItem>();

  const add = (item: Omit<SearchItem, "score">, score = 0) => {
    const key = `${item.type}-${item.id}`;
    const existing = resultMap.get(key);
    if (!existing || score < existing.score) {
      resultMap.set(key, { ...item, score });
    }
  };

  // High-priority: direct DB matches
  for (const p of dbProperties) {
    add({
      id: p.id,
      type: "property",
      title: p.name,
      subtitle: `${p.addressLine1}, ${p.city}, ${p.state}`,
      href: `/properties/${p.id}`,
      searchText: `${p.name} ${p.addressLine1}`,
    }, 0);
  }
  for (const u of dbUnits) {
    add({
      id: u.id,
      type: "unit",
      title: `Unit ${u.unitNumber} — ${u.property.name}`,
      subtitle: u.property.name,
      href: `/properties`,
      searchText: u.unitNumber,
    }, 0);
  }
  for (const t of dbTenants) {
    add({
      id: t.id,
      type: "tenant",
      title: t.user.name || t.user.email,
      subtitle: t.user.email,
      href: `/tenants`,
      searchText: `${t.user.name} ${t.user.email}`,
    }, 0);
  }
  for (const p of dbProspects) {
    add({
      id: p.id,
      type: "prospect",
      title: p.name,
      subtitle: p.email,
      href: `/prospects/${p.id}`,
      searchText: `${p.name} ${p.email}`,
    }, 0);
  }
  for (const m of dbMaintenance) {
    add({
      id: m.id,
      type: "maintenance",
      title: m.title,
      subtitle: m.requestNumber,
      href: `/maintenance/${m.id}`,
      searchText: `${m.title} ${m.requestNumber}`,
    }, 0);
  }

  // Fuzzy matches
  const fusePool = [
    ...properties.map((p) => ({
      id: p.id,
      type: "property",
      title: p.name,
      subtitle: `${p.addressLine1}, ${p.city}, ${p.state}`,
      href: `/properties/${p.id}`,
      searchText: `${p.name} ${p.addressLine1} ${p.addressLine1} ${p.city} ${p.state} ${p.zipCode}`,
    })),
    ...tenants.map((t) => ({
      id: t.id,
      type: "tenant",
      title: t.user.name || t.user.email,
      subtitle: t.user.email,
      href: `/tenants`,
      searchText: `${t.user.name} ${t.user.email} ${t.user.phone} ${t.phone}`,
    })),
    ...prospects.map((p) => ({
      id: p.id,
      type: "prospect",
      title: p.name,
      subtitle: p.email,
      href: `/prospects/${p.id}`,
      searchText: `${p.name} ${p.email} ${p.phone}`,
    })),
    ...maintenance.map((m) => ({
      id: m.id,
      type: "maintenance",
      title: m.title,
      subtitle: m.requestNumber,
      href: `/maintenance/${m.id}`,
      searchText: `${m.title} ${m.requestNumber}`,
    })),
    ...documents.map((d) => ({
      id: d.id,
      type: "document",
      title: d.name,
      subtitle: d.type.replace(/_/g, " "),
      href: `/documents`,
      searchText: d.name,
    })),
    ...calendarEvents.map((e) => ({
      id: e.id,
      type: "calendar",
      title: e.title,
      subtitle: e.type.replace(/_/g, " "),
      href: `/calendar`,
      searchText: e.title,
    })),
  ];

  const fuse = new Fuse(fusePool, {
    keys: ["searchText", "title", "subtitle"],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  for (const r of fuse.search(q, { limit: 20 })) {
    add(r.item, r.score ?? 1);
  }

  const results = Array.from(resultMap.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ id, type, title, subtitle, href }) => ({ id, type, title, subtitle, href }));

  return NextResponse.json({ results });
}
