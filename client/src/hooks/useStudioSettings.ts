import { useQuery } from "@tanstack/react-query";
import type { StudioSettings } from "@shared/schema";

export function useStudioSettings() {
  const { data } = useQuery<StudioSettings>({
    queryKey: ["/api/settings"],
    staleTime: 60000,
  });

  return {
    team: data?.team ?? [],
    series: data?.series ?? [],
  };
}
