export type ThemeTemplate={sections:Record<string,{type:string;[key:string]:unknown}>;order:string[];[key:string]:unknown};
export function parseThemeTemplate(raw:string):ThemeTemplate{
  const value=JSON.parse(raw.replace(/^\s*\/\*[\s\S]*?\*\/\s*/,""));
  if(!value||typeof value.sections!=="object"||!Array.isArray(value.order))throw new Error("Theme template is not a supported JSON template.");
  return value;
}
export function mergeAppSections(sourceRaw:string,targetRaw:string|null){
  const source=parseThemeTemplate(sourceRaw);const target=targetRaw?parseThemeTemplate(targetRaw):{sections:{},order:[]} as ThemeTemplate;
  const owned=source.order.filter(id=>/^aip-/.test(source.sections[id]?.type||""));
  const output:ThemeTemplate=structuredClone(target);
  // Refresh matching app instances while retaining every unrelated target section.
  for(const id of owned){let key=id;while(output.sections[key]&&!/^aip-/.test(output.sections[key].type))key="aip_"+key;const present=output.order.includes(key);output.sections[key]=structuredClone(source.sections[id]);if(!present){const position=Math.min(source.order.indexOf(id),output.order.length);output.order.splice(position,0,key);}}
  return JSON.stringify(output,null,2);
}
