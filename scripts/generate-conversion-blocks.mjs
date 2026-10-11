import {build} from 'esbuild';
import fs from 'node:fs/promises';
const compiled=await build({entryPoints:['app/lib/conversion-blocks.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {conversionBlocks,commonBlockFields}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const root='extensions/ab-storefront';
const output='{{ block.settings.heading | escape }}';
const list=()=>`{% assign rows = block.settings.items | newline_to_br | split: '<br />' %}<ul class="cb-live-list">{% for row in rows %}{% if row != blank %}<li data-cb-list="items" data-cb-index="{{ forloop.index0 }}">{{ row | strip | escape }}</li>{% endif %}{% endfor %}</ul>`;
const form=(resource)=>`{% assign offered = ${resource} %}{% if offered != blank %}<h3>{{ offered.title | escape }}</h3>{% form 'product', offered, data-cb-form: 'true' %}<label>Variant<select name="id">{% for variant in offered.variants %}<option value="{{ variant.id }}" {% unless variant.available %}disabled{% endunless %} {% if variant.id == offered.selected_or_first_available_variant.id %}selected{% endif %}>{{ variant.title | escape }} — {{ variant.price | money }}</option>{% endfor %}</select></label><input type="hidden" name="quantity" value="1"><button type="submit" {% unless offered.available %}disabled{% endunless %}>{{ block.settings.label | escape }}</button>{% endform %}{% elsif request.design_mode %}<p>Select a product in this block's settings.</p>{% endif %}`;
const quotes=`{% assign quotes = block.settings.quotes | newline_to_br | split: '<br />' %}<div class="cb-live-carousel" data-cb-carousel>{% for quote in quotes %}{% if quote != blank %}<blockquote>{% if forloop.index == 1 and block.settings.image_1 != blank %}{{ block.settings.image_1 | image_url: width: 600 | image_tag: loading: 'lazy' }}{% elsif forloop.index == 2 and block.settings.image_2 != blank %}{{ block.settings.image_2 | image_url: width: 600 | image_tag: loading: 'lazy' }}{% endif %}<span data-cb-list="quotes" data-cb-index="{{ forloop.index0 }}">{{ quote | strip | escape }}</span><cite>{{ block.settings.attribution | escape }}</cite></blockquote>{% endif %}{% endfor %}</div><div class="cb-live-controls"><button type="button" data-cb-prev aria-label="Previous testimonial">‹</button><button type="button" data-cb-next aria-label="Next testimonial">›</button></div>`;
const bodies={
tabs:`<h3>${output}</h3><details open><summary>{{ block.settings.tab_1 | escape }}</summary><p>{{ block.settings.content_1 | escape | newline_to_br }}</p></details><details><summary>{{ block.settings.tab_2 | escape }}</summary><p>{{ block.settings.content_2 | escape | newline_to_br }}</p></details>{% if block.settings.expert != blank %}<blockquote>{{ block.settings.expert | escape }}</blockquote>{% endif %}`,
atc:form('product'),
video:`<h3>${output}</h3><div class="cb-live-carousel" data-cb-carousel>{% if block.settings.video_1 != blank %}{{ block.settings.video_1 | video_tag: controls: true, preload: 'none' }}{% endif %}{% if block.settings.video_2 != blank %}{{ block.settings.video_2 | video_tag: controls: true, preload: 'none' }}{% endif %}</div><div class="cb-live-controls"><button type="button" data-cb-prev aria-label="Previous video">‹</button><button type="button" data-cb-next aria-label="Next video">›</button></div>`,
addons:`<h3>${output}</h3>`+form('block.settings.offer_product'),
sticky:form('product'),
shipping:`<h3>${output}</h3><p data-cb-delivery data-min="{{ block.settings.min_days }}" data-max="{{ block.settings.max_days }}"></p><p>{{ block.settings.note | escape }}</p>`,
benefits:list(), 'benefits-list':list(), upsell:`<h3>${output}</h3>`+form('block.settings.offer_product'),
social:`<h3>${output}</h3>`+quotes,
payments:`<h3>${output}</h3><ul class="cb-live-list">{% for type in shop.enabled_payment_types %}<li>{{ type | payment_type_svg_tag }}</li>{% endfor %}</ul><p>{{ block.settings.custom | escape }}</p>{% if block.settings.custom_icon != blank %}{{ block.settings.custom_icon | image_url: width: 80 | image_tag: loading: 'lazy' }}{% endif %}`,
pulse:`<p class="cb-live-pulse">{% if block.settings.use_stock %}{% if product.selected_or_first_available_variant.available %}{{ block.settings.label | escape }}{% else %}{{ block.settings.unavailable | escape }}{% endif %}{% else %}{{ block.settings.label | escape }}{% endif %}</p>`,
badges:list(),
countdown:`<h3>${output}</h3><p data-cb-countdown data-end="{{ block.settings.ends_at | escape }}" data-expired="{{ block.settings.expired | escape }}" role="timer"></p>`,
rating:`{% if block.settings.count > 0 %}<p>{{ block.settings.rating | divided_by: 10.0 }} / 5 — {{ block.settings.count }} {{ block.settings.label | escape }}</p>{% elsif request.design_mode %}<p>Enter your real average rating and review count.</p>{% endif %}`,
coupon:`<h3>${output}</h3><button type="button" data-cb-copy="{{ block.settings.code | escape }}" data-copied="{{ block.settings.copied | escape }}">{{ block.settings.code | escape }}</button>`,
wrapper:`<h3>${output}</h3><p>{{ block.settings.content | escape | newline_to_br }}</p>`,
banner:`<p>${output}</p>{% if block.settings.dismissible %}<button type="button" data-cb-dismiss aria-label="Dismiss notice">×</button>{% endif %}`,
reviews:`<h3>${output}</h3>`+quotes,
space:`{% if block.settings.divider %}<hr>{% endif %}`,
};
for(const block of conversionBlocks){
 const settings=[...block.fields,...commonBlockFields].map(f=>{const field={...f};if(f.type==='range')field.unit='px';if(['min_days','max_days','rating','count'].includes(f.id))delete field.unit;return field;});
 const schema={name:block.name,target:'section',stylesheet:'conversion-blocks.css',javascript:'conversion-blocks.js',settings};
 const body=bodies[block.id].replace(/{{ block.settings.(heading|label|note|custom|unavailable|tab_1|tab_2|content_1|content_2|expert|content|attribution) \| escape( \| newline_to_br)? }}/g,(_,key,lines)=>`<span data-cb-text="${key}">{{ block.settings.${key} | escape${lines||''} }}</span>`);
 const stock=block.id==='pulse'?`data-use-stock="{{ block.settings.use_stock }}" data-variants="{{ product.variants | json | escape }}" data-initial-variant="{{ product.selected_or_first_available_variant.id }}" data-stock-label="{{ block.settings.label | escape }}" data-unavailable-label="{{ block.settings.unavailable | escape }}"`:'';
 const markup=`<ss-conversion-block data-kind="${block.id}" data-position="{{ block.settings.position | escape }}" data-full-width="{{ block.settings.full_width }}" ${stock} data-proxy="{{ block.settings.proxy_path | escape }}" data-wrap="{{ block.settings.wrap_section }}" data-design="{{ request.design_mode }}" data-add-url="{{ routes.cart_add_url }}.js" data-locale="{{ request.locale.iso_code }}" style="--cb-bg:{{ block.settings.background }};--cb-fg:{{ block.settings.foreground }};--cb-padding:{{ block.settings.padding }}px;--cb-radius:{{ block.settings.radius | default: 8 }}px;--cb-spacing:{{ block.settings.spacing | default: 0 }}px" class="cb-live cb-live-${block.id} cb-live-{{ block.settings.layout }}" {{ block.shopify_attributes }}>${body}<span class="cb-live-status" role="status" aria-live="polite"></span></ss-conversion-block>\n{% schema %}\n${JSON.stringify(schema,null,2)}\n{% endschema %}\n`;
 await fs.writeFile(`${root}/blocks/cb-${block.id}.liquid`,markup);
}
await fs.copyFile('app/storefront/conversion-blocks.js',root+'/assets/conversion-blocks.js');
await fs.copyFile('app/storefront/conversion-blocks.css',root+'/assets/conversion-blocks.css');
console.log('Generated 20 configurable Conversion Blocks and shared assets.');
