import {useSearchParams} from "react-router";
import ResourcesLayout from "./ResourcesLayout";
import HelpResources from "./HelpResources";
export default function HelpPage({live=false}:{live?:boolean}){const [params]=useSearchParams();const raw=params.get("view")||"faq";const view=(["faq","inspiration","ideas"] as const).find(v=>v===raw)||"faq";const titles={faq:"Frequently asked questions",inspiration:"Section Inspiration",ideas:"Suggest Idea"};return <ResourcesLayout live={live} title={titles[view]} subtitle={view==="faq"?"Find answers and get help with your store.":view==="inspiration"?"Find inspiration and share your section designs.":"Suggest features and follow your requests."} active={view}><HelpResources key={view} live={live} fullPage initialView={view}/></ResourcesLayout>}
