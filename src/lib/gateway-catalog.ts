// Gateway metadata shared between frontend pages — no backend imports

export type GatewayMeta = {
  key: string;
  displayName: string;
  logo: string;
  supportedCurrencies: string[];
  defaultTxnTypes: string[];
  homepageUrl: string;
};

export const GATEWAY_CATALOG: GatewayMeta[] = [
  {
    key: "paystack",
    displayName: "Paystack",
    logo: "🟢",
    supportedCurrencies: ["NGN", "GHS", "ZAR", "USD"],
    defaultTxnTypes: ["deposit", "instalment", "full_payment", "fee"],
    homepageUrl: "https://paystack.com",
  },
  {
    key: "flutterwave",
    displayName: "Flutterwave",
    logo: "🌊",
    supportedCurrencies: ["NGN", "USD", "GBP", "EUR", "GHS"],
    defaultTxnTypes: ["deposit", "instalment", "full_payment", "fee"],
    homepageUrl: "https://flutterwave.com",
  },
  {
    key: "interswitch",
    displayName: "Interswitch",
    logo: "🔴",
    supportedCurrencies: ["NGN"],
    defaultTxnTypes: ["deposit", "full_payment"],
    homepageUrl: "https://www.interswitchgroup.com",
  },
  {
    key: "remita",
    displayName: "Remita",
    logo: "🔵",
    supportedCurrencies: ["NGN"],
    defaultTxnTypes: ["deposit", "full_payment", "government"],
    homepageUrl: "https://remita.net",
  },
  {
    key: "stripe",
    displayName: "Stripe",
    logo: "💳",
    supportedCurrencies: ["USD", "GBP", "EUR"],
    defaultTxnTypes: ["deposit", "instalment", "full_payment", "fee", "refund"],
    homepageUrl: "https://stripe.com",
  },
  {
    key: "paypal",
    displayName: "PayPal",
    logo: "🅿️",
    supportedCurrencies: ["USD", "GBP", "EUR"],
    defaultTxnTypes: ["deposit", "full_payment"],
    homepageUrl: "https://paypal.com",
  },
];
