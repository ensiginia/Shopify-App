import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import styles from "./styles.module.css";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  if (url.searchParams.has("shop") || url.searchParams.has("id_token")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return null;
}

export default function App() {
  return <main className={styles.index}><div className={styles.content}>
    <h1 className={styles.heading}>Storefront tools for Shopify</h1>
    <p className={styles.text}>Build pages, customize storefront blocks, and manage your store experiments inside Shopify.</p>
    <p>Open this app from your Shopify admin under Apps. To install it, use its Shopify App Store listing or the installation link supplied by your store administrator.</p>
    <a href="https://admin.shopify.com" className={styles.button}>Open Shopify admin</a>
  </div></main>;
}

