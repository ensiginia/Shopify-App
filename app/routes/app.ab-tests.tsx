import { useEffect, useRef } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useFetcher, useLoaderData } from "react-router";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import ABTests from "../components/ABTests";
import {
  mutate,
  workspace,
  abStore,
  reconcile,
} from "../lib/ab-service.server";
import type { Experiment } from "../lib/experiments";
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  return workspace(session.shop, admin);
};
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const requestId = String(form.get("requestId") || "");
  try {
    const intent = String(form.get("intent"));
    const raw = String(form.get("payload") || "{}");
    if (raw.length > 16384) throw new Error("Test configuration is too large.");
    const payload = JSON.parse(raw);
    if (!payload || Array.isArray(payload) || typeof payload !== "object")
      throw new Error("Invalid configuration.");
    if (intent === "refresh") {
      await reconcile(session.shop);
      return {
        requestId,
        ok: true as const,
        tests: await abStore.list(
          session.shop,
          process.env.AB_INCLUDE_TEST_ORDERS === "true",
        ),
      };
    }
    return {
      requestId,
      ok: true as const,
      tests: await mutate(session.shop, admin, intent, payload),
    };
  } catch (error) {
    return { requestId, ok: false as const, error: (error as Error).message };
  }
};
export default function ABTestsRoute() {
  const data = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const requestPermissions = async () => {
    const result = await shopify.scopes.request(data.missingScopes);
    if (result.result !== "granted-all")
      throw new Error(
        "Permissions were declined. Live A/B tests remain unavailable.",
      );
  };
  const pickProduct = async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: false,
      filter: { draft: false, archived: false, hidden: false },
    });
    const product = selected?.[0];
    if (!product) return;
    return {
      id: product.id,
      title: product.title,
      variants: {
        nodes: product.variants
          .filter((v) => !!v.id)
          .map((v) => ({
            id: v.id!,
            title: String(v.title || "Default"),
            price: String(v.price || ""),
          })),
      },
    };
  };
  const fetcher = useFetcher<typeof action>();
  const pending = useRef(
    new Map<
      string,
      {
        resolve: (tests: Experiment[]) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  useEffect(() => {
    const result = fetcher.data;
    if (!result) return;
    const item = pending.current.get(result.requestId);
    if (!item) return;
    clearTimeout(item.timer);
    pending.current.delete(result.requestId);
    if (result.ok) item.resolve(result.tests);
    else item.reject(new Error(result.error));
  }, [fetcher.data]);
  useEffect(() => {
    const requests = pending.current;
    return () => {
      for (const item of requests.values()) {
        clearTimeout(item.timer);
        item.reject(
          new Error("Page changed. Refresh to confirm the saved state."),
        );
      }
      requests.clear();
    };
  }, []);
  const transact = (intent: string, payload: Record<string, unknown>) =>
    new Promise<Experiment[]>((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const timer = setTimeout(() => {
        pending.current.delete(requestId);
        reject(
          new Error(
            "The operation is taking longer than expected. Refresh results before retrying; it may have completed.",
          ),
        );
      }, 120000);
      pending.current.set(requestId, { resolve, reject, timer });
      fetcher.submit(
        { intent, payload: JSON.stringify(payload), requestId },
        { method: "post" },
      );
    });
  return (
    <ABTests
      homeHref="/app"
      server={{
        ...data,
        initialTests: data.tests,
        transact,
        pickProduct,
        requestPermissions,
      }}
    />
  );
}
export const headers: HeadersFunction = (args) => boundary.headers(args);
