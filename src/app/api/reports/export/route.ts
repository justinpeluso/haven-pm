import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "reports:export")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get("format") || "csv";
  const report = request.nextUrl.searchParams.get("report") || "summary";

  const [properties, units, maintenance, prospects] = await Promise.all([
    db.property.findMany({
      where: { deletedAt: null },
      select: { name: true, city: true, state: true, status: true },
    }),
    db.unit.findMany({
      where: { deletedAt: null },
      select: { unitNumber: true, status: true, rentAmount: true, property: { select: { name: true } } },
    }),
    db.maintenanceRequest.findMany({
      where: { deletedAt: null },
      select: {
        requestNumber: true,
        title: true,
        status: true,
        priority: true,
        cost: true,
        property: { select: { name: true } },
      },
    }),
    db.prospect.findMany({
      where: { deletedAt: null },
      select: { name: true, email: true, status: true, budget: true },
    }),
  ]);

  let rows: Record<string, string | number>[] = [];
  let filename = "haven-pm-report";
  let headers: string[] = [];

  switch (report) {
    case "occupancy":
      headers = ["Property", "Unit", "Status", "Rent"];
      rows = units.map((u) => ({
        Property: u.property.name,
        Unit: u.unitNumber,
        Status: u.status,
        Rent: Number(u.rentAmount),
      }));
      filename = "occupancy-report";
      break;
    case "maintenance":
      headers = ["Request #", "Title", "Property", "Status", "Priority", "Cost"];
      rows = maintenance.map((m) => ({
        "Request #": m.requestNumber,
        Title: m.title,
        Property: m.property.name,
        Status: m.status,
        Priority: m.priority,
        Cost: m.cost ? Number(m.cost) : 0,
      }));
      filename = "maintenance-report";
      break;
    case "pipeline":
      headers = ["Name", "Email", "Status", "Budget"];
      rows = prospects.map((p) => ({
        Name: p.name,
        Email: p.email,
        Status: p.status,
        Budget: p.budget ? Number(p.budget) : 0,
      }));
      filename = "leasing-pipeline";
      break;
    default:
      headers = ["Name", "City", "State", "Status"];
      rows = properties.map((p) => ({
        Name: p.name,
        City: p.city,
        State: p.state,
        Status: p.status,
      }));
      filename = "portfolio-summary";
  }

  if (format === "csv") {
    const csvHeaders = headers.join(",");
    const csvRows = rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [csvHeaders, ...csvRows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Haven PM — ${filename.replace(/-/g, " ")}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [headers],
      body: rows.map((r) => headers.map((h) => String(r[h] ?? ""))),
      styles: { fontSize: 8 },
    });

    const pdfBuffer = doc.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid format" }, { status: 400 });
}
