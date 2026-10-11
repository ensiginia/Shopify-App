import SavedSections from "../components/SavedSections";
import {useLoaderData,type LoaderFunctionArgs} from "react-router";
import {authenticate} from "../shopify.server";
export async function loader({request}:LoaderFunctionArgs){const {session}=await authenticate.admin(request);return {shop:session.shop};}
export default function SavedSectionsRoute(){const {shop}=useLoaderData<typeof loader>();return <SavedSections live shop={shop}/>;}
