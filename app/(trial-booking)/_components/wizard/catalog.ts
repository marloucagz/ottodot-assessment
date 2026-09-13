import type { CatalogItem, DemoContext } from "../api";

export function catalogSubjectList(ctx: DemoContext): CatalogItem[] {
  const list = ctx.catalog.subjectList;
  if (list && list.length > 0) return list;
  return [ctx.catalog.subjects.math, ctx.catalog.subjects.science];
}
