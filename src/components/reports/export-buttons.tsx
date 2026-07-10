"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonsProps {
  report?: string;
}

export function ExportButtons({ report = "summary" }: ExportButtonsProps) {
  const exportFile = (format: string) => {
    window.location.href = `/api/reports/export?format=${format}&report=${report}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportFile("csv")}>CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportFile("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportFile("pdf")}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
