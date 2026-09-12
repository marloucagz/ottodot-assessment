import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, jsonError } from "@/lib/errors";

export async function parseJson<T>(
  request: Request,
  schema: { parse: (data: unknown) => T },
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError("VALIDATION_ERROR", "Validation failed", 400, error.flatten());
    }
    throw error;
  }
}

export function handleRoute(error: unknown): Response {
  return jsonError(error);
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
