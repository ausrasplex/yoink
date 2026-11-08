"use client";

import { Gavel } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeBidAction } from "@/app/lot/[lot]/actions";
import { BidCelebration, type Celebration } from "@/components/bid-celebration";
import { Countdown, useNow } from "@/components/countdown";
import { useCopy } from "@/components/theme/theme-provider";
import { money } from "@/lib/format";
import { listingTime, phaseOf, shortDuration } from "@/lib/listing";
import type { LotStatus } from "@/lib/status";

const POLL_MS = 3000;

export function BidPanel({ lot, title, first, initial, startingBid, increment }: {
  lot: number; title: string; first: string; initial: LotStatus; startingBid: number; increment: number;
}) {
  const [celebrate, setCelebrate] = useState<Celebration | null>(null); // "you're the highest bidder" dialog
  const [celebrating, setCelebrating] = useState(false);
  const t = useCopy(); // the active theme's wording
  const [status, setStatus] = useState(initial);
  const [amount, setAmount] = useState(String(initial.minBid));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const touched = useRef(false); // don't clobber what the user is typing

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/lot/${lot}/status`, { cache: "no-store" });
      if (res.status === 401) return window.location.reload(); // session expired -> login redirect
      if (!res.ok) return;
      const next: LotStatus = await res.json();
      setStatus(next);
      if (!touched.current) setAmount(String(next.minBid));
    } catch {
      /* transient network error; try again next tick */
    }
  }, [lot]);

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Phase from the listing's own times, re-evaluated every second, so it opens/closes on time between polls.
  const now = useNow();
  const phase = phaseOf(status, now);

  const parsed = Number(amount);
  const valid = Number.isInteger(parsed) && parsed >= status.minBid;
  const outbid = status.youBid && !status.youLead;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await placeBidAction(lot, parsed);
      if (res.ok) {
        setCelebrate({ amount: money(res.amount), lot, title, first });
        setCelebrating(true);
        touched.current = false;
      } else {
        setError(res.error);
      }
      await refresh();
    });
  }

  const quick = [0, 1, 2].map((k) => status.minBid + k * increment);

  return (
    <section className="rounded-3xl bg-ink p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60">{status.currentBid === null ? "Starting bid" : "Current bid"}</p>
          <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight">{money(status.currentBid ?? startingBid)}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
          {status.bidCount} {status.bidCount === 1 ? "bid" : "bids"}
        </span>
      </div>

      {phase === "scheduled" ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-bold text-white/70">Bidding opens in</p>
          <Countdown to={status.startsAt} />
          <p className="text-xs text-white/60">{listingTime(status.startsAt)} · ends {listingTime(status.endsAt)}</p>
        </div>
      ) : phase === "ended" ? (
        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          <p className="font-bold">{t("endedTitle")}</p>
          <p className="mt-1 text-sm text-white/70">
            {status.youLead ? t("wonBody", { lot }) : status.youBid ? t("lostBody", { lot }) : `Ended ${listingTime(status.endsAt)}.`}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-white/70" suppressHydrationWarning>
            Ends in <span className="font-bold text-white" suppressHydrationWarning>{shortDuration(Date.parse(status.endsAt) - now)}</span>
            <span className="text-white/50"> · {listingTime(status.endsAt)}</span>
          </p>
          {status.youLead && (
            <div className="mt-5 rounded-2xl bg-lime p-4 text-ink">
              <p className="font-extrabold">{t("leadingTitle", { lot })}</p>
              <p className="text-sm text-ink/70">{t("leadingBody", { lot })}</p>
            </div>
          )}
          {outbid && (
            <div className="mt-5 rounded-2xl bg-peach p-4 text-ink">
              <p className="font-extrabold">{t("outbidTitle", { lot })}</p>
              <p className="text-sm text-ink/70">{t("outbidBody", { lot, minBid: money(status.minBid) })}</p>
            </div>
          )}
          {!status.youLead && (
            <form onSubmit={submit} className="mt-5 space-y-3">
              <Label htmlFor="amount" className="text-white/70">Your bid (minimum {money(status.minBid)})</Label>
              <div className="flex flex-wrap gap-2">
                {quick.map((q) => (
                  <button
                    key={q} type="button"
                    onClick={() => { touched.current = true; setAmount(String(q)); }}
                    className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold tabular-nums transition-colors hover:bg-white/20"
                  >
                    {money(q)}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-ink/50">$</span>
                <Input
                  id="amount" inputMode="numeric" pattern="[0-9]*"
                  className="h-14 rounded-2xl border-0 pl-9 text-xl font-extrabold tabular-nums text-ink"
                  value={amount}
                  onChange={(e) => { touched.current = true; setAmount(e.target.value.replace(/\D/g, "")); }}
                />
              </div>
              <Button type="submit" variant="lime" size="lg" className="w-full" disabled={pending || !valid}>
                <Gavel /> {pending ? "Bidding…" : t("placeBid")}
              </Button>
              {error && <p className="text-sm font-semibold text-peach">{error}</p>}
            </form>
          )}
        </>
      )}
      <BidCelebration open={celebrating} data={celebrate} onClose={() => setCelebrating(false)} />
    </section>
  );
}
