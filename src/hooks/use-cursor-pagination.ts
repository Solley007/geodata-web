import { useState, useCallback, useMemo } from "react";
import { usePaginatedQuery } from "convex/react";
import type { FunctionReference, FunctionArgs } from "convex/server";

/**
 * Wraps Convex's cursor-based usePaginatedQuery to present classic numbered
 * pages (Prev / Next) instead of an infinite "load more" list.
 *
 * Convex has no total count and pagination is cursor-based, not offset-based.
 * This hook keeps calling loadMore internally until enough rows are buffered
 * to cover the requested page, then renders only that page's slice. Moving
 * back to an already-loaded page is instant (no refetch); moving forward
 * past what's buffered triggers loadMore automatically.
 */
export function useCursorPagination<Query extends FunctionReference<"query", "public">>(
  query: Query,
  args: Omit<FunctionArgs<Query>, "paginationOpts">,
  pageSize: number,
) {
  const [pageIndex, setPageIndex] = useState(0);

  const { results, status, isLoading, loadMore } = usePaginatedQuery(
    query,
    args as unknown as FunctionArgs<Query>,
    { initialNumItems: pageSize },
  );

  const neededItems = (pageIndex + 1) * pageSize;
  if (results.length < neededItems && status === "CanLoadMore") {
    loadMore(neededItems - results.length);
  }

  const pageRows = useMemo(
    () => results.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [results, pageIndex, pageSize],
  );

  const hasNextPage = results.length > (pageIndex + 1) * pageSize || status === "CanLoadMore";
  const hasPrevPage = pageIndex > 0;
  const isPageLoading = (isLoading && results.length < neededItems) || status === "LoadingFirstPage";

  const nextPage = useCallback(() => {
    setPageIndex((p) => p + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPageIndex((p) => Math.max(0, p - 1));
  }, []);

  const reset = useCallback(() => {
    setPageIndex(0);
  }, []);

  return {
    rows: pageRows,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    isLoading: isPageLoading,
    nextPage,
    prevPage,
    reset,
  };
}
