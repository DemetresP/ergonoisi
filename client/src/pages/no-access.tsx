import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { firebaseLogout } from "@/lib/firebaseAuth";
import { queryClient } from "@/lib/queryClient";

export default function NoAccess({ email }: { email: string }) {
  const handleLogout = async () => {
    try {
      await firebaseLogout();
    } finally {
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Δεν έχεις πρόσβαση</h1>
          <p className="text-sm text-muted-foreground">
            Ο λογαριασμός <span className="font-medium text-foreground">{email || "σου"}</span> δεν είναι στην
            ομάδα του studio. Ζήτα από τον διαχειριστή να σε προσθέσει.
          </p>
          <Button variant="outline" onClick={handleLogout} data-testid="button-no-access-logout">
            Σύνδεση με άλλο λογαριασμό
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
