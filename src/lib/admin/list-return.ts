import type { ReadonlyURLSearchParams } from "next/navigation";

type SearchParamsLike = Pick<URLSearchParams, "get"> | ReadonlyURLSearchParams;

/** Build back link href when arriving from a list with preserved query string. */
export function buildListBackHref(listPath: string, searchParams: SearchParamsLike): string {
  if (searchParams.get("from") === "list") {
    const qs = searchParams.get("qs");
    return qs ? `${listPath}?${qs}` : listPath;
  }
  return listPath;
}

/** Append from=list&qs= when navigating from a list to a detail/form page. */
export function withFromListParams(
  targetPath: string,
  listSearchParams: URLSearchParams | ReadonlyURLSearchParams,
): string {
  const qs = listSearchParams.toString();
  const params = new URLSearchParams();
  params.set("from", "list");
  if (qs) params.set("qs", qs);
  return `${targetPath}?${params.toString()}`;
}
