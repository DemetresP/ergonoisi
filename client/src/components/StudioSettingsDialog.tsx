import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { getSeriesColor } from "@/lib/studio";
import type { TeamMember } from "@shared/schema";

interface StudioSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditableListProps {
  id: string;
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  itemClassName?: (item: string) => string;
}

function EditableList({ id, label, placeholder, items, onChange, itemClassName }: EditableListProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value || items.includes(value)) return;
    onChange([...items, value]);
    setDraft("");
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      <div className="flex flex-wrap gap-2 min-h-8">
        {items.length === 0 && <span className="text-sm text-muted-foreground">Κενή λίστα</span>}
        {items.map((item) => (
          <span
            key={item}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${itemClassName?.(item) ?? ""}`}
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i !== item))}
              aria-label={`Αφαίρεση ${item}`}
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-9"
        />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Προσθήκη">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface TeamEditorProps {
  team: TeamMember[];
  onChange: (team: TeamMember[]) => void;
}

function TeamEditor({ team, onChange }: TeamEditorProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const add = () => {
    const member = { name: name.trim(), email: email.trim().toLowerCase() };
    if (!member.name || team.some((m) => m.name === member.name)) return;
    onChange([...team, member]);
    setName("");
    setEmail("");
  };

  const update = (index: number, changes: Partial<TeamMember>) =>
    onChange(team.map((member, i) => (i === index ? { ...member, ...changes } : member)));

  return (
    <div className="grid gap-2">
      <Label htmlFor="settings-team-name" className="text-sm font-semibold">
        Ομάδα
      </Label>
      <p className="text-xs text-muted-foreground">
        Μόνο όσοι έχουν email εδώ μπορούν να συνδεθούν. Το email πρέπει να είναι αυτό του λογαριασμού Google τους.
      </p>
      {team.length === 0 && <span className="text-sm text-muted-foreground">Κενή λίστα</span>}
      {team.map((member, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={member.name}
            onChange={(e) => update(index, { name: e.target.value })}
            aria-label="Όνομα"
            className="h-9 w-[40%]"
          />
          <Input
            type="email"
            value={member.email}
            placeholder="email@gmail.com"
            onChange={(e) => update(index, { email: e.target.value })}
            aria-label="Email"
            className={`h-9 flex-1 ${member.email ? "" : "border-amber-500"}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(team.filter((_, i) => i !== index))}
            aria-label={`Αφαίρεση ${member.name}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          id="settings-team-name"
          value={name}
          placeholder="Όνομα"
          onChange={(e) => setName(e.target.value)}
          className="h-9 w-[40%]"
        />
        <Input
          type="email"
          value={email}
          placeholder="email@gmail.com"
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-9 flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Προσθήκη μέλους">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function StudioSettingsDialog({ open, onOpenChange }: StudioSettingsDialogProps) {
  const { toast } = useToast();
  const settings = useStudioSettings();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [series, setSeries] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setTeam(settings.team);
      setSeries(settings.series);
    }
    // Reset the draft lists only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = useMutation({
    mutationFn: async () => {
      const cleanTeam = team
        .map((m) => ({ name: m.name.trim(), email: m.email.trim().toLowerCase() }))
        .filter((m) => m.name);
      return await apiRequest("PUT", "/api/settings", { team: cleanTeam, series });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      onOpenChange(false);
      toast({ title: "Αποθηκεύτηκε", description: "Οι ρυθμίσεις του studio ενημερώθηκαν." });
    },
    onError: () => {
      toast({
        title: "Σφάλμα",
        description: "Δεν αποθηκεύτηκαν οι ρυθμίσεις. Έλεγξε ότι τα ονόματα και τα email είναι σωστά και μοναδικά.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto" data-testid="dialog-studio-settings">
        <DialogHeader>
          <DialogTitle>Ρυθμίσεις studio</DialogTitle>
          <DialogDescription>Η ομάδα και οι σειρές που εμφανίζονται στις εργασίες.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-2">
          <TeamEditor team={team} onChange={setTeam} />
          <EditableList
            id="settings-series"
            label="Σειρές / Θεματικές"
            placeholder="π.χ. Οικονομικό"
            items={series}
            onChange={setSeries}
            itemClassName={(item) => getSeriesColor(item, series)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Άκυρο
            </Button>
            <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
              Αποθήκευση
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
