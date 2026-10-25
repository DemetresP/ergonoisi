import { useQuery } from "@tanstack/react-query";
import type { StudioSettings } from "@shared/schema";

export function useStudioSettings() {
  const { data } = useQuery<StudioSettings>({
    queryKey: ["/api/settings"],
    staleTime: 60000,
  });

  const team = data?.team ?? [];

  return {
    team,
    teamNames: team.map((member) => member.name),
    series: data?.series ?? [],
  };
}
