import type { CSSProperties } from "react";
import ColorPickerField from "./ColorPickerField";
export const cartPalettes = [
  {id:"store",name:"Store colors",bg:"#ffffff",text:"#000000",muted:"#666666",accent:"#000000",end:"#444444",soft:"#eeeeee"},
  {id:"slate",name:"Slate",bg:"#ffffff",text:"#111111",muted:"#6b7280",accent:"#6b7280",end:"#374151",soft:"#e5e7eb"},
  {id:"navy",name:"Navy",bg:"#f8fafc",text:"#0f172a",muted:"#475569",accent:"#334155",end:"#0f172a",soft:"#e2e8f0"},
  {id:"charcoal",name:"Charcoal",bg:"#fafafa",text:"#202124",muted:"#52525b",accent:"#52525b",end:"#18181b",soft:"#e4e4e7"},
  {id:"amber",name:"Amber",bg:"#fff7ed",text:"#492700",muted:"#a36105",accent:"#a36105",end:"#754000",soft:"#fde8cf"},
  {id:"rose",name:"Rose",bg:"#fff1f2",text:"#881337",muted:"#be123c",accent:"#e11d48",end:"#9f1239",soft:"#fecdd3"},
  {id:"orange",name:"Orange",bg:"#fff7ed",text:"#7c2d12",muted:"#c2410c",accent:"#f97316",end:"#c2410c",soft:"#fed7aa"},
];
export const readyGradients = [
 {name:"Midnight",colors:["#0f172a","#475569"],angle:110},
 {name:"Ocean",colors:["#1e3a8a","#0891b2"],angle:120},
 {name:"Forest",colors:["#14532d","#0f766e"],angle:110},
 {name:"Violet",colors:["#4c1d95","#9333ea"],angle:135},
 {name:"Berry",colors:["#881337","#db2777"],angle:110},
 {name:"Ember",colors:["#9a3412","#c2410c"],angle:120},
 {name:"Gold",colors:["#713f12","#a16207"],angle:110},
 {name:"Aurora",colors:["#4338ca","#7c3aed","#be185d"],angle:130},
 {name:"Lagoon",colors:["#164e63","#0d9488"],angle:90},
 {name:"Plum",colors:["#581c87","#9f1239"],angle:120},
 {name:"Graphite",colors:["#18181b","#52525b"],angle:110},
 {name:"Royal",colors:["#1e40af","#6d28d9"],angle:135},
];
export type SavedGradient = {name:string;colors:string[];angle:number};
export const gradientValue=(colors:string[],angle:number)=>`linear-gradient(${angle}deg, ${colors.join(", ")})`;
export type CartStyleConfig = {preset:string;gradient:boolean;bg:string;accent:string;gradientEnd:string;gradientStops:string[];gradientAngle:number;savedGradients:SavedGradient[];text:string;muted:string;soft:string;radius:number;width:number;imageRadius:number;imageRatio:string;imageStyle:string;size:string;errorBg:string;errorColor:string;errorSize:number;custom:boolean;css:string};
export function cartTitleStyles(css:string):CSSProperties {
 const block=css.match(/\.cart-title\s*\{([^}]*)\}/)?.[1]||"";
 const styles:CSSProperties={};
 const transform=block.match(/text-transform\s*:\s*(uppercase|lowercase|capitalize|none)\s*;/)?.[1];
 if(transform)styles.textTransform=transform as CSSProperties["textTransform"];
 const spacing=block.match(/letter-spacing\s*:\s*(-?\d+(?:\.\d+)?px)\s*;/)?.[1];
 if(spacing)styles.letterSpacing=spacing;
 return styles;
}
export default function CartStyles({config,onChange}:{config:CartStyleConfig;onChange:(patch:Partial<CartStyleConfig>)=>void}) {
 const applyGradient=(colors:string[],angle:number)=>onChange({gradient:true,gradientStops:[...colors],gradientAngle:angle,accent:colors[0],gradientEnd:colors[colors.length-1]});
 const swatch=(palette:typeof cartPalettes[number])=><span className="cs-swatch">{[palette.bg,palette.text,palette.soft,palette.accent].map((color,i)=><i key={i} style={{background:color}}/>)}</span>;
 const colorField=(label:string,key:"bg"|"errorBg"|"errorColor",hex=false)=><ColorPickerField label={label} value={config[key]} showHex={hex} onChange={value=>onChange({[key]:value})}/>;
 const numberField=(label:string,key:"radius"|"width"|"imageRadius"|"errorSize",unit?:string)=><label className="cd-field">{label}<span className="cs-number"><input type="number" min={key==="width"?280:0} max={key==="width"?600:100} value={config[key]} onChange={e=>onChange({[key]:Number(e.target.value)})}/>{unit&&<span>{unit}</span>}</span></label>;
 const selectField=(label:string,key:"imageRatio"|"imageStyle",options:string[])=><label className="cd-field">{label}<select value={config[key]} onChange={e=>onChange({[key]:e.target.value})}>{options.map(x=><option key={x}>{x}</option>)}</select></label>;
 const choosePalette=(palette:typeof cartPalettes[number])=>onChange({preset:palette.id,bg:palette.bg,text:palette.text,muted:palette.muted,accent:palette.accent,gradientEnd:palette.end,gradientStops:[palette.accent,palette.end],soft:palette.soft});
 return <div className="cs-layout"><p>Color presets</p><div className="cs-store-row"><button className="cs-palette cs-store" aria-label="Use Store colors palette" aria-pressed={config.preset==="store"} onClick={()=>choosePalette(cartPalettes[0])}>{swatch(cartPalettes[0])}</button><div className="cs-store-info"><p>Colors from your store.</p><label>Use gradients<input role="switch" aria-label="Use gradients" type="checkbox" checked={config.gradient} onChange={e=>onChange({gradient:e.target.checked})}/></label></div></div><div className="cs-palettes">{cartPalettes.slice(1).map(p=><button key={p.id} className="cs-palette" aria-label={`Use ${p.name} palette`} aria-pressed={config.preset===p.id} onClick={()=>choosePalette(p)}>{swatch(p)}</button>)}</div>{config.gradient&&<div className="cs-compact-gradients" aria-label="Ready-made gradients">{[...readyGradients,...config.savedGradients].map((g,i)=><button key={`${g.name}-${i}`} className="cs-palette" aria-label={`Use ${g.name} gradient`} title={g.name} aria-pressed={JSON.stringify(g.colors)===JSON.stringify(config.gradientStops)&&g.angle===config.gradientAngle} onClick={()=>applyGradient(g.colors,g.angle)}><span className="cs-swatch">{["#ffffff",g.colors[0],"#e5e7eb",gradientValue(g.colors,g.angle)].map((color,n)=><i key={n} style={{background:color}}/>)}</span></button>)}</div>}<p>Size presets</p><div className="cs-sizes">{["Compact","Balanced","Spacious"].map((size,i)=><button key={size} aria-pressed={config.size===size} onClick={()=>onChange({size,radius:[6,14,20][i],imageRadius:[0,14,18][i],errorSize:[12,13,14][i]})}><span className={`cs-size-icon cs-size-${i}`}><i/><i/></span>{size}</button>)}</div><div className="cs-fields">{colorField("Background","bg")}{numberField("Button radius","radius")}{numberField("Width (desktop)","width","px")}{selectField("Image ratio","imageRatio",["Adapt to image","Square","Portrait"])}{numberField("Image radius","imageRadius")}{selectField("Image style","imageStyle",["Frame","Plain"])}{colorField("Error background","errorBg")}{colorField("Error text","errorColor",true)}{numberField("Error text size","errorSize")}</div><div className="cs-custom"><label>Custom styles<input role="switch" aria-label="Custom styles" type="checkbox" checked={config.custom} onChange={e=>onChange({custom:e.target.checked})}/></label>{config.custom&&<div className="cs-code"><span aria-hidden="true">{config.css.split("\n").map((_,i)=><span key={i}>{i+1}</span>)}</span><textarea aria-label="Custom styles CSS" spellCheck={false} value={config.css} onChange={e=>onChange({css:e.target.value})}/></div>}</div></div>;
}
