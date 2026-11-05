import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const days = await prisma.dayRecord.findMany({
    orderBy: { date: "desc" },
    include: { laps: { orderBy: { lapNumber: "asc" } } },
  });
  const data = days.map((day) => {
    const totalMs = day.laps.reduce((sum, lap) => sum + lap.durationMs, 0);
    const byCategory = day.laps.reduce<Record<string, number>>((acc, lap) => {
      acc[lap.category] = (acc[lap.category] ?? 0) + lap.durationMs;
      return acc;
    }, {});
    return { ...day, totalMs, lapCount: day.laps.length, byCategory };
  });
  return NextResponse.json(data);
}
