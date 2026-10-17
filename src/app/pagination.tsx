import Link from "next/link";
export function Pagination({
  page,
  count,
  size,
  path,
  params = {},
}: {
  page: number;
  count: number;
  size: number;
  path: string;
  params?: Record<string, string>;
}) {
  const href = (p: number) =>
    `${path}?${new URLSearchParams({ ...params, page: String(p) })}`;
  return (
    <div className="pagination">
      <span>
        {count.toLocaleString()} records · Page {page} of{" "}
        {Math.max(1, Math.ceil(count / size))}
      </span>
      <div>
        {page > 1 && <Link href={href(page - 1)}>← Previous</Link>}
        {page * size < count && <Link href={href(page + 1)}>Next →</Link>}
      </div>
    </div>
  );
}
