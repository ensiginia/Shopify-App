export type AuditTheme = { id: string; name: string; role: string };
export type AuditProduct = { handle: string; title: string };
export type AuditContext = { shop: string; themes: AuditTheme[]; products: AuditProduct[]; local: boolean };
export type AuditFinding = { category: string; title: string; reason: string; evidence: string; priority: number; search: string };
export type AuditResult = { shop: string; theme: string; pages: string[]; createdAt: string; findings: AuditFinding[]; checks: number; coverage: string };
export type AuditEvent = { type: "progress"; step: number } | { type: "password"; message: string } | { type: "error"; message: string } | { type: "result"; result: AuditResult };
export const AUDIT_STEPS = ["Loading homepage and product page", "Reading page content and theme sections", "Checking trust, product clarity and purchase information", "Matching relevant section categories", "Ranking your top opportunities"];

export function analyzeStorePages(home: string, product: string, themeText = ""): AuditFinding[] {
  const clean = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&(?:nbsp|amp|quot|#\d+);/g, " ").replace(/\s+/g, " ").toLowerCase();
  const text = clean(home + " " + product) + " " + themeText.toLowerCase();
  const productText = clean(product);
  const rules = [
    { category: "Testimonials", title: "Add customer reviews or testimonials", pattern: /testimonial|customer reviews|verified buyer|judgeme|judge\.me|loox|yotpo|stamped|shopify-product-reviews/, source: text, priority: 95, reason: "Visible customer experiences can help shoppers assess product quality.", evidence: "No recognized review or testimonial section was found in the captured pages.", search: "Testimonials" },
    { category: "FAQ", title: "Answer common product questions", pattern: /frequently asked|\bfaq\b|<details|accordion/, source: text + " " + product, priority: 85, reason: "A product FAQ can address questions before the shopper leaves the page.", evidence: "No FAQ wording, accordion or expandable answers were detected.", search: "FAQ" },
    { category: "Benefits", title: "Make product benefits easier to scan", pattern: /benefits|why choose|why you|key features|icon.with.text|multicolumn/, source: productText + " " + themeText.toLowerCase(), priority: 80, reason: "A concise benefits section helps explain why the product fits the shopper's needs.", evidence: "No recognizable benefits or feature-summary section was detected for the product.", search: "Features" },
    { category: "Shipping", title: "Clarify shipping and returns near the product", pattern: /shipping|delivery|returns|refund/, source: productText, priority: 75, reason: "Delivery and return information helps shoppers understand the purchase commitment.", evidence: "Shipping, delivery and return wording was not detected on the captured product page.", search: "Text" },
    { category: "Hero", title: "Give the homepage a clear main message", pattern: /<h1\b/i, source: home, priority: 70, reason: "A main heading can make the store's offer immediately understandable.", evidence: "The homepage HTML did not contain a main H1 heading.", search: "Hero" },
    { category: "Product description", title: "Expand the product explanation", pattern: /[\s\S]{500}/, source: productText, priority: 65, reason: "More product detail can help shoppers judge fit, use and value.", evidence: "The captured product page contained fewer than 500 characters of readable text.", search: "Text" },
  ];
  return rules.filter(rule => !rule.pattern.test(rule.source)).sort((a,b) => b.priority-a.priority).slice(0,3).map(({category,title,reason,evidence,priority,search}) => ({category,title,reason,evidence,priority,search}));
}
