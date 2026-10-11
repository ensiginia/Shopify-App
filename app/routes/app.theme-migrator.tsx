import {useAppBridge} from "@shopify/app-bridge-react";
import ThemeMigrator from "../components/ThemeMigrator";
export default function ThemeMigratorRoute(){const shopify=useAppBridge();return <ThemeMigrator live onPermissions={async()=>{const response=await shopify.scopes.request(["read_themes","write_themes"]);if(response.result!=="granted-all")throw new Error("Theme permissions were declined.");}}/>;}
