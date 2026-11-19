/** One page of a list: which items, which page this is, and how many pages there are. Pages count from 1. */
export type Paged<T> = {
  items: T[];
  page: number;
  pages: number;
  first: number;
  last: number;
  total: number;
};

/** The page of a list, clamped to the pages there are; an empty list has one empty page. */
export function pageOf<T>(list: T[], page: number, size: number): Paged<T> {
  const pages = Math.max(1, Math.ceil(list.length / Math.max(1, size)));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (current - 1) * size;
  const items = list.slice(start, start + size);
  return {
    items,
    page: current,
    pages,
    first: items.length > 0 ? start + 1 : 0,
    last: start + items.length,
    total: list.length,
  };
}

/** The page an item at this index falls on. */
export function pageHolding(index: number, size: number): number {
  return Math.floor(Math.max(0, index) / Math.max(1, size)) + 1;
}

/** A page number from an address's text; 1 when it is none. */
export function pageFrom(text: string | undefined): number {
  const value = Number.parseInt(text ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}
