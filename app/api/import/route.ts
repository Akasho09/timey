import { NextRequest, NextResponse } from "next/server";
import { ActivityCategory, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseStopwatchText } from "@/lib/stopwatch";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rawText: z.string().min(1),
  category: z.nativeEnum(ActivityCategory).default("STUDY"),
  title: z.string().optional(),
  notes: z.string().optional(),
  replaceExisting: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const laps = parseStopwatchText(body.rawText);
    const date = new Date(`${body.date}T00:00:00.000Z`);
    const existing = await prisma.dayRecord.findUnique({ where: { date } });
    if (existing && !body.replaceExisting) {
      return NextResponse.json({ error: "A record already exists for this date. Enable replace existing to overwrite it." }, { status: 409 });
    }
    const record = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.dayRecord.delete({ where: { id: existing.id } });
      }
      return tx.dayRecord.create({
        data: {
          date,
          title: body.title || null,
          notes: body.notes || null,
          laps: { create: laps.map((lap) => ({ ...lap, category: body.category })) },
        },
        include: { laps: { orderBy: { lapNumber: "asc" } } },
      });
    });
    return NextResponse.json({ record, importedLaps: laps.length, totalMs: laps[laps.length - 1].cumulativeMs }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Unable to import stopwatch data" }, { status: 500 });
  }
}
