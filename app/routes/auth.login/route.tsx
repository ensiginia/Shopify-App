import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { login } from "../../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  if (new URL(request.url).searchParams.has("shop")) await login(request);
  return redirect("/");
}

export async function action() {
  return redirect("/");
}

