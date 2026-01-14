import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Users, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { signInWithGooglePopup } from "@/lib/firebaseAuth";
import { queryClient } from "@/lib/queryClient";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function Landing() {
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogin = async () => {
    try {
      if (!isFirebaseConfigured) {
        toast({
          title: "Firebase not configured",
          description: "Missing VITE_FIREBASE_* env vars. Check Render Environment and redeploy.",
          variant: "destructive",
        });
        return;
      }
      setIsSigningIn(true);
      await signInWithGooglePopup();
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (e: any) {
      toast({
        title: "Login failed",
        description: e?.message || "Could not sign in with Google.",
        variant: "destructive",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">tlife</h1>
          </div>
          <Button onClick={handleLogin} disabled={isSigningIn || !isFirebaseConfigured} data-testid="button-login">
            {isSigningIn ? "Connecting..." : "Log In with Google"}
          </Button>
        </div>
      </header>

      <main>
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Προγραμματισμός παραγωγής,{" "}
                <span className="text-primary">απλά και αποτελεσματικά</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Οργάνωσε τις εργασίες βίντεο, παρακολούθησε τον φόρτο της ομάδας και μην χάνεις ποτέ προθεσμία. Δημιουργήθηκε για δημιουργικές ομάδες που χρειάζονται σαφήνεια και ταχύτητα.
              </p>
              <Button size="lg" onClick={handleLogin} disabled={isSigningIn || !isFirebaseConfigured} data-testid="button-get-started">
                {isSigningIn ? "Connecting..." : "Get Started (Google)"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              <Card>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Παρακολούθησε προθεσμίες</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Διαχειρίσου ημερομηνίες παραγωγής και παράδοσης με οπτικές ενδείξεις προτεραιότητας και ειδοποιήσεις για καθυστερήσεις.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Εργασίες Ομάδας</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Δες με μια ματιά ποιος εργάζεται σε τι, τις εκτιμώμενες ώρες και εντόπισε τα πιθανά σημεία συμφόρησης πριν εμφανιστούν.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Μείνε οργανωμένος</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Εξήγαγε και εισήγαγε δεδομένα έργων, παρακολούθησε ενημερώσεις κατάστασης και κράτα την παραγωγή σου στο σωστό χρονοδιάγραμμα.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-8 text-center text-sm text-muted-foreground">
          <p>tlife - Professional task scheduling for video production</p>
        </div>
      </footer>
    </div>
  );
}
