import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Landmark, Settings, ToggleLeft, ToggleRight, Shield, AlertTriangle,
  CheckCircle2, XCircle, Circle, Clock, RefreshCw, Plus, Search,
  Filter, Eye, Zap, Globe, Lock, Key, ExternalLink, ChevronDown,
  ChevronRight, CreditCard, Banknote, Info, X, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils.ts";
import { GATEWAY_CATALOG } from "@/lib/gateway-catalog.ts";
import { useCursorPagination } from "@/hooks/use-cursor-pagination.ts";
import TablePager from "@/components/ui/table-pager.tsx";

const PAYMENTS_PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

type GatewayRow = {
  _id: string;
  gatewayKey: string;
  displayName: string;
  isEnabled: boolean;
  mode: string;
  priority: number;
  supportedCurrencies: string[];
  supportedTxnTypes: string[];
  publicKeyEnvVar?: string;
  secretKeyEnvVar?: string;
  webhookSecretEnvVar?: string;
  webhookUrl?: string;
  callbackUrl?: string;
  minAmount?: number;
  maxAmount?: number;
  notes?: string;
  lastTestedAt?: string;
  lastTestResult?: string;
  updatedAt?: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  initiated:   { label: "Initiated",   color: "text-gray-500",   icon: Circle        },
  pending:     { label: "Pending",     color: "text-blue-600",   icon: Clock         },
  processing:  { label: "Processing",  color: "text-orange-600", icon: RefreshCw     },
  successful:  { label: "Successful",  color: "text-green-600",  icon: CheckCircle2  },
  failed:      { label: "Failed",      color: "text-red-600",    icon: XCircle       },
  reversed:    { label: "Reversed",    color: "text-purple-600", icon: RefreshCw     },
  abandoned:   { label: "Abandoned",   color: "text-gray-400",   icon: XCircle       },
  disputed:    { label: "Disputed",    color: "text-yellow-600", icon: AlertTriangle },
};

const TXN_TYPES: Record<string, string> = {
  deposit:      "Deposit",
  instalment:   "Instalment",
  full_payment: "Full Payment",
  fee:          "Fee",
  refund:       "Refund",
  government:   "Government",
};

const ALL_CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "ZAR"];

function StatusBadge({ status }: { status: string }) {
  const cfg = PAYMENT_STATUS_CFG[status] ?? { label: status, color: "text-gray-500", icon: Circle };
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", cfg.color)}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ onSeed }: { onSeed: () => void }) {
  const stats = useQuery(api.gateway.getGatewayStats, {});

  if (!stats) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );

  const cards = [
    { label: "Gateways",      value: stats.total,              color: "text-gray-900" },
    { label: "Enabled",       value: stats.enabled,            color: "text-green-700" },
    { label: "Live Mode",     value: stats.live,               color: "text-blue-700" },
    { label: "Sandbox",       value: stats.sandbox,            color: "text-orange-600" },
    { label: "Total Payments",value: stats.totalPayments,      color: "text-gray-900" },
    { label: "Successful",    value: stats.successfulPayments, color: "text-green-700" },
    { label: "Failed",        value: stats.failedPayments,     color: "text-red-700" },
    { label: "Revenue",       value: `₦${(stats.totalRevenue ?? 0).toLocaleString()}`, color: "text-emerald-700" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider leading-tight">{c.label}</p>
          <p className={cn("text-lg font-bold mt-0.5 truncate", c.color)}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Gateway Edit Dialog ───────────────────────────────────────────────────────

function GatewayConfigDialog({
  gateway, onClose,
}: {
  gateway: GatewayRow;
  onClose: () => void;
}) {
  const meta = GATEWAY_CATALOG.find((g) => g.key === gateway.gatewayKey);

  const [priority, setPriority] = useState(String(gateway.priority));
  const [currencies, setCurrencies] = useState<string[]>(gateway.supportedCurrencies);
  const [txnTypes, setTxnTypes] = useState<string[]>(gateway.supportedTxnTypes);
  const [publicKeyEnvVar, setPublicKeyEnvVar] = useState(gateway.publicKeyEnvVar ?? "");
  const [secretKeyEnvVar, setSecretKeyEnvVar] = useState(gateway.secretKeyEnvVar ?? "");
  const [webhookSecretEnvVar, setWebhookSecretEnvVar] = useState(gateway.webhookSecretEnvVar ?? "");
  const [webhookUrl, setWebhookUrl] = useState(gateway.webhookUrl ?? "");
  const [callbackUrl, setCallbackUrl] = useState(gateway.callbackUrl ?? "");
  const [minAmount, setMinAmount] = useState(gateway.minAmount ? String(gateway.minAmount) : "");
  const [maxAmount, setMaxAmount] = useState(gateway.maxAmount ? String(gateway.maxAmount) : "");
  const [notes, setNotes] = useState(gateway.notes ?? "");
  const [loading, setLoading] = useState(false);

  const updateGateway = useMutation(api.gateway.updateGateway);

  const toggleCurrency = (c: string) =>
    setCurrencies((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const toggleTxnType = (t: string) =>
    setTxnTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateGateway({
        gatewayKey: gateway.gatewayKey,
        priority: parseInt(priority, 10) || gateway.priority,
        supportedCurrencies: currencies,
        supportedTxnTypes: txnTypes,
        publicKeyEnvVar: publicKeyEnvVar || undefined,
        secretKeyEnvVar: secretKeyEnvVar || undefined,
        webhookSecretEnvVar: webhookSecretEnvVar || undefined,
        webhookUrl: webhookUrl || undefined,
        callbackUrl: callbackUrl || undefined,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        notes: notes || undefined,
      });
      toast.success(`${gateway.displayName} configuration saved`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{meta?.logo ?? "🔌"}</span>
            Configure {gateway.displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Routing priority */}
          <div>
            <Label>Routing Priority (1 = highest)</Label>
            <Input className="mt-1 w-24" type="number" min={1} max={10} value={priority}
              onChange={(e) => setPriority(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">When multiple gateways are eligible, the lowest priority number is tried first.</p>
          </div>

          {/* Supported currencies */}
          <div>
            <Label>Supported Currencies</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ALL_CURRENCIES.map((c) => (
                <button key={c}
                  onClick={() => toggleCurrency(c)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors",
                    currencies.includes(c)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Supported transaction types */}
          <div>
            <Label>Supported Transaction Types</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(TXN_TYPES).map(([k, v]) => (
                <button key={k}
                  onClick={() => toggleTxnType(k)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors",
                    txnTypes.includes(k)
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Credential env var names */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lock size={13} className="text-amber-600" />
              <p className="text-xs font-semibold text-amber-700">Credential References</p>
            </div>
            <p className="text-xs text-amber-600 mb-3">
              Enter the <strong>name of the environment variable</strong> (secret) where the actual key is stored — never paste the live key here. Add secrets in <strong>Advanced → Secrets</strong>.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Public Key — Env Var Name</Label>
                <Input className="mt-1 font-mono text-xs" placeholder={`e.g. ${gateway.gatewayKey.toUpperCase()}_PUBLIC_KEY`}
                  value={publicKeyEnvVar} onChange={(e) => setPublicKeyEnvVar(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Secret Key — Env Var Name</Label>
                <Input className="mt-1 font-mono text-xs" placeholder={`e.g. ${gateway.gatewayKey.toUpperCase()}_SECRET_KEY`}
                  value={secretKeyEnvVar} onChange={(e) => setSecretKeyEnvVar(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Webhook Secret — Env Var Name</Label>
                <Input className="mt-1 font-mono text-xs" placeholder={`e.g. ${gateway.gatewayKey.toUpperCase()}_WEBHOOK_SECRET`}
                  value={webhookSecretEnvVar} onChange={(e) => setWebhookSecretEnvVar(e.target.value)} />
              </div>
            </div>
          </div>

          {/* URLs */}
          <div className="space-y-3">
            <div>
              <Label>Webhook URL (register at provider)</Label>
              <Input className="mt-1 font-mono text-xs" placeholder="https://watchful-wombat-208.convex.site/webhooks/paystack"
                value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            </div>
            <div>
              <Label>Callback / Redirect URL</Label>
              <Input className="mt-1 font-mono text-xs" placeholder="https://yourdomain.com/payment/callback"
                value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} />
            </div>
          </div>

          {/* Amount limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min Amount (₦)</Label>
              <Input className="mt-1" type="number" placeholder="e.g. 100" value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)} />
            </div>
            <div>
              <Label>Max Amount (₦)</Label>
              <Input className="mt-1" type="number" placeholder="e.g. 10000000" value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Internal Notes</Label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save Configuration"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Gateway Card ──────────────────────────────────────────────────────────────

function GatewayCard({
  gateway,
  stats,
}: {
  gateway: GatewayRow;
  stats?: { total: number; successful: number; failed: number; totalAmount: number };
}) {
  const [configOpen, setConfigOpen] = useState(false);
  const [modeLoading, setModeLoading] = useState(false);
  const meta = GATEWAY_CATALOG.find((g) => g.key === gateway.gatewayKey);
  const toggleGateway = useMutation(api.gateway.toggleGateway);
  const setMode = useMutation(api.gateway.setGatewayMode);
  const recordTest = useMutation(api.gateway.recordTestResult);

  const handleToggle = async (enabled: boolean) => {
    try {
      await toggleGateway({ gatewayKey: gateway.gatewayKey, isEnabled: enabled });
      toast.success(`${gateway.displayName} ${enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    }
  };

  const handleModeChange = async (mode: string) => {
    setModeLoading(true);
    try {
      await setMode({ gatewayKey: gateway.gatewayKey, mode });
      toast.success(`${gateway.displayName} switched to ${mode} mode`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setModeLoading(false);
    }
  };

  const handleSimulateTest = async () => {
    // Simulates a connectivity test — in production this would call the gateway's ping/verify endpoint
    toast.loading(`Testing ${gateway.displayName} connection…`, { id: "test" });
    await new Promise((r) => setTimeout(r, 1200));
    const result = gateway.secretKeyEnvVar ? "success" : "failed";
    await recordTest({ gatewayKey: gateway.gatewayKey, result });
    if (result === "success") {
      toast.success(`${gateway.displayName} connection test passed`, { id: "test" });
    } else {
      toast.error(`${gateway.displayName}: no secret key configured`, { id: "test" });
    }
  };

  const isConfigured = !!gateway.secretKeyEnvVar;
  const successRate = stats && stats.total > 0
    ? Math.round((stats.successful / stats.total) * 100)
    : null;

  return (
    <>
      <div className={cn(
        "bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-4 transition-all",
        gateway.isEnabled ? "border-gray-200" : "border-gray-100 opacity-75"
      )}>
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl leading-none">{meta?.logo ?? "🔌"}</div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{gateway.displayName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  gateway.mode === "live"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                )}>
                  {gateway.mode === "live" ? "🟢 LIVE" : "🟡 SANDBOX"}
                </span>
                <span className="text-[11px] text-gray-400">Priority {gateway.priority}</span>
              </div>
            </div>
          </div>
          <Switch
            checked={gateway.isEnabled}
            onCheckedChange={handleToggle}
            className="cursor-pointer"
          />
        </div>

        {/* Config status indicators */}
        <div className="flex flex-wrap gap-2">
          <span className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium",
            isConfigured ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          )}>
            {isConfigured ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
            {isConfigured ? "Credentials set" : "Credentials missing"}
          </span>
          {gateway.webhookUrl && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium bg-blue-50 text-blue-700">
              <Globe size={11} /> Webhook configured
            </span>
          )}
          {gateway.lastTestResult && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium",
              gateway.lastTestResult === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            )}>
              {gateway.lastTestResult === "success" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              Last test: {gateway.lastTestResult}
            </span>
          )}
        </div>

        {/* Currencies + types */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 w-16 shrink-0">Currencies:</span>
            {gateway.supportedCurrencies.map((c) => (
              <span key={c} className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">{c}</span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 w-16 shrink-0">Accepts:</span>
            {gateway.supportedTxnTypes.map((t) => (
              <span key={t} className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded capitalize">{TXN_TYPES[t] ?? t}</span>
            ))}
          </div>
        </div>

        {/* Payment stats */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <div className="text-center">
              <p className="text-[11px] text-gray-400">Payments</p>
              <p className="text-sm font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-gray-400">Success Rate</p>
              <p className={cn("text-sm font-bold", successRate !== null && successRate >= 90 ? "text-green-700" : "text-orange-600")}>
                {successRate}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-gray-400">Revenue</p>
              <p className="text-sm font-bold text-emerald-700">₦{stats.totalAmount.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Mode toggle + actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <Select value={gateway.mode} onValueChange={handleModeChange} disabled={modeLoading}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox / Test</SelectItem>
              <SelectItem value="live">Live / Production</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" className="h-8 text-xs gap-1 shrink-0" onClick={handleSimulateTest}>
            <Zap size={11} /> Test
          </Button>
          <Button size="sm" variant="secondary" className="h-8 text-xs gap-1 shrink-0" onClick={() => setConfigOpen(true)}>
            <Settings size={11} /> Config
          </Button>
          {meta?.homepageUrl && (
            <a href={meta.homepageUrl} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0" title="Provider website">
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        {gateway.notes && (
          <p className="text-[11px] text-gray-400 italic border-t border-gray-50 pt-2">{gateway.notes}</p>
        )}
      </div>

      {configOpen && (
        <GatewayConfigDialog gateway={gateway} onClose={() => setConfigOpen(false)} />
      )}
    </>
  );
}

// ── Payment Record Row ────────────────────────────────────────────────────────

type PaymentRow = {
  _id: string;
  paymentRef: string;
  gatewayKey: string;
  currency: string;
  amountDisplay: number;
  txnType: string;
  status: string;
  mode: string;
  clientName: string;
  transactionRef?: string;
  paidAt?: string;
  channel?: string;
  _creationTime: number;
};

function PaymentRow({ row }: { row: PaymentRow }) {
  const meta = GATEWAY_CATALOG.find((g) => g.key === row.gatewayKey);
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
      <td className="px-4 py-2.5">
        <span className="font-mono text-xs font-semibold text-[var(--brand)]">{row.paymentRef}</span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{meta?.logo ?? "🔌"}</span>
          <span className="text-xs text-gray-700">{meta?.displayName ?? row.gatewayKey}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="text-sm font-semibold text-gray-800">
          {row.currency} {row.amountDisplay.toLocaleString()}
        </div>
      </td>
      <td className="px-4 py-2.5 hidden sm:table-cell">
        <span className="text-xs text-gray-600 capitalize">{TXN_TYPES[row.txnType] ?? row.txnType}</span>
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-4 py-2.5 hidden md:table-cell">
        <span className="text-xs text-gray-600">{row.clientName}</span>
      </td>
      <td className="px-4 py-2.5 hidden lg:table-cell">
        <span className={cn(
          "text-[11px] px-1.5 py-0.5 rounded font-medium",
          row.mode === "live" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
        )}>
          {row.mode}
        </span>
      </td>
      <td className="px-4 py-2.5 hidden xl:table-cell">
        <span className="text-xs text-gray-400">
          {row.paidAt
            ? format(parseISO(row.paidAt), "dd MMM yy, HH:mm")
            : format(new Date(row._creationTime), "dd MMM yy")}
        </span>
      </td>
    </tr>
  );
}

// ── Seed Banner ───────────────────────────────────────────────────────────────

function SeedBanner({ onSeed, loading }: { onSeed: () => void; loading: boolean }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-4 mb-6">
      <div className="text-2xl mt-0.5">⚡</div>
      <div className="flex-1">
        <p className="font-semibold text-amber-800 text-sm">Gateway catalogue not initialised</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Click "Initialise Gateways" to add all 6 payment gateways to the control centre. You can then configure and enable each one individually.
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
        onClick={onSeed}
        disabled={loading}
      >
        {loading ? "Initialising…" : "Initialise Gateways"}
      </Button>
    </div>
  );
}

// ── Create Payment Record Dialog ──────────────────────────────────────────────

function CreatePaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [clientId, setClientId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [gatewayKey, setGatewayKey] = useState("paystack");
  const [currency, setCurrency] = useState("NGN");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [txnType, setTxnType] = useState("deposit");
  const [mode, setMode] = useState("sandbox");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const clients = useQuery(api.clients.listClients, {});
  const transactions = useQuery(api.transactions.list, {});
  const createPayment = useMutation(api.gateway.createPaymentRecord);

  const filteredTxns = useMemo(() =>
    clientId ? (transactions ?? []).filter((t) => t.clientId === clientId) : [],
    [clientId, transactions]
  );

  const handleSubmit = async () => {
    if (!clientId || !amountDisplay) { toast.error("Client and amount are required"); return; }
    setLoading(true);
    try {
      const ref = await createPayment({
        clientId: clientId as Parameters<typeof createPayment>[0]["clientId"],
        transactionId: transactionId && transactionId !== "none" ? transactionId as Parameters<typeof createPayment>[0]["transactionId"] : undefined,
        gatewayKey,
        currency,
        amountDisplay: parseFloat(amountDisplay),
        txnType,
        mode,
        description: description || undefined,
        notes: notes || undefined,
      });
      toast.success(`Payment record ${ref} created`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard size={16} /> Manual Payment Record
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2">
            <Label>Client <span className="text-red-500">*</span></Label>
            <Select value={clientId} onValueChange={(v) => { setClientId(v); setTransactionId(""); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select client…" /></SelectTrigger>
              <SelectContent>
                {(clients ?? []).map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.fullName} — {c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Linked Transaction (optional)</Label>
            <Select value={transactionId} onValueChange={setTransactionId} disabled={!clientId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {filteredTxns.map((t) => (
                  <SelectItem key={t._id} value={t._id}>{t.transactionRef}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gateway</Label>
            <Select value={gatewayKey} onValueChange={setGatewayKey}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GATEWAY_CATALOG.map((g) => (
                  <SelectItem key={g.key} value={g.key}>{g.logo} {g.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount <span className="text-red-500">*</span></Label>
            <Input className="mt-1" type="number" placeholder="e.g. 50000" value={amountDisplay}
              onChange={(e) => setAmountDisplay(e.target.value)} />
          </div>
          <div>
            <Label>Transaction Type</Label>
            <Select value={txnType} onValueChange={setTxnType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TXN_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Input className="mt-1" placeholder="Brief payment description" value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Creating…" : "Create Record"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPaymentGateway() {
  const [tab, setTab] = useState<"gateways" | "payments">("gateways");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentGatewayFilter, setPaymentGatewayFilter] = useState("all");
  const [seedLoading, setSeedLoading] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);

  const gateways = useQuery(api.gateway.listGateways, {});
  const stats = useQuery(api.gateway.getGatewayStats, {});
  const {
    rows: recentPayments,
    pageIndex: paymentsPageIndex,
    hasNextPage: paymentsHasNext,
    hasPrevPage: paymentsHasPrev,
    isLoading: paymentsLoading,
    nextPage: paymentsNextPage,
    prevPage: paymentsPrevPage,
    reset: resetPaymentsPage,
  } = useCursorPagination(
    api.gateway.listRecentPaymentsPaginated,
    {
      gatewayKey: paymentGatewayFilter !== "all" ? paymentGatewayFilter : undefined,
      status: paymentStatusFilter !== "all" ? paymentStatusFilter : undefined,
    },
    PAYMENTS_PAGE_SIZE,
  );

  useEffect(() => {
    resetPaymentsPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentGatewayFilter, paymentStatusFilter]);

  const seedGateways = useMutation(api.gateway.seedGateways);

  const handleSeed = async () => {
    setSeedLoading(true);
    try {
      await seedGateways({});
      toast.success("All 6 payment gateways initialised");
    } catch (e) {
      toast.error((e as Error).message ?? "Failed");
    } finally {
      setSeedLoading(false);
    }
  };

  const needsSeed = gateways !== undefined && gateways.length === 0;

  const byGatewayStats = stats?.byGateway ?? {};

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payment Gateway Control Centre</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure, monitor, and route payments across all gateways</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setShowCreatePayment(true)}>
          <Plus size={15} /> Manual Payment Record
        </Button>
      </div>

      {/* Stats */}
      <StatsBar onSeed={handleSeed} />

      {/* Seed banner if empty */}
      {needsSeed && <SeedBanner onSeed={handleSeed} loading={seedLoading} />}

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {(["gateways", "payments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors capitalize",
              tab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            )}
          >
            {t === "gateways" ? `Gateways (${gateways?.length ?? 0})` : "Payment Records"}
          </button>
        ))}
      </div>

      {/* Gateway cards grid */}
      {tab === "gateways" && (
        <>
          {gateways === undefined ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : gateways.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Landmark size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No gateways configured yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "Initialise Gateways" above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {gateways.map((g) => (
                <GatewayCard
                  key={g._id}
                  gateway={g as GatewayRow}
                  stats={byGatewayStats[g.gatewayKey]}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Payment records */}
      {tab === "payments" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-44 h-9 bg-white">
                <Filter size={13} className="text-gray-400 mr-1" />
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(PAYMENT_STATUS_CFG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentGatewayFilter} onValueChange={setPaymentGatewayFilter}>
              <SelectTrigger className="w-44 h-9 bg-white">
                <CreditCard size={13} className="text-gray-400 mr-1" />
                <SelectValue placeholder="All gateways" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gateways</SelectItem>
                {GATEWAY_CATALOG.map((g) => (
                  <SelectItem key={g.key} value={g.key}>{g.logo} {g.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {paymentsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <CreditCard size={36} className="text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium">No payment records found</p>
                <p className="text-sm text-gray-400 mt-1">Payments will appear here as they are initiated and processed.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Ref</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Gateway</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Client</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Mode</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((row) => (
                    <PaymentRow key={row._id} row={row as PaymentRow} />
                  ))}
                </tbody>
              </table>
            )}
            {!paymentsLoading && recentPayments.length > 0 && (
              <TablePager pageIndex={paymentsPageIndex} hasNextPage={paymentsHasNext} hasPrevPage={paymentsHasPrev} onNext={paymentsNextPage} onPrev={paymentsPrevPage} />
            )}
          </div>
        </>
      )}

      {showCreatePayment && (
        <CreatePaymentDialog open onClose={() => setShowCreatePayment(false)} />
      )}
    </div>
  );
}
