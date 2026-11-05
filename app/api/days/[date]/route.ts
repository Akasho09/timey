import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ date: string }> }) {
  const { date: dateString } = await context.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const day = await prisma.dayRecord.findUnique({ where: { date }, include: { laps: { orderBy: { lapNumber: "asc" } } } });
  if (!day) return NextResponse.json({ error: "No record found" }, { status: 404 });
  return NextResponse.json(day);
}
