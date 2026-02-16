import { fetchJson } from "@/utils/fetchJson";
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query";

export function useGetJson<T>(
  queryKey: QueryKey,
  input: RequestInfo,
  init?: RequestInit,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<T, Error>({
    queryKey,
    queryFn: () => fetchJson(input, init),
    ...options,
  })
}
