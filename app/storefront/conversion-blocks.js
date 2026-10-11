class ConversionBlock extends HTMLElement {
  connectedCallback(){
    this.abort?.abort();this.abort=new AbortController();const signal=this.abort.signal;
    if(this.dataset.kind==='pulse'&&this.dataset.useStock==='true'){
      let variants=[];try{const parsed=JSON.parse(this.dataset.variants||'[]');if(Array.isArray(parsed))variants=parsed;}catch{}
      const section=this.closest('.shopify-section')||document;
      this.updateStock=()=>{const form=Array.from(section.querySelectorAll('form[action*="/cart/add"]')).find(form=>!form.hasAttribute('data-cb-form'));const variantId=form?.querySelector('[name=id]')?.value||new URL(location.href).searchParams.get('variant')||this.dataset.initialVariant;const variant=variants.find(v=>String(v.id)===String(variantId));if(variant){const badge=this.querySelector('.cb-live-pulse');if(badge)badge.textContent=variant.available?this.dataset.stockLabel:this.dataset.unavailableLabel;}};
      document.addEventListener('change',this.updateStock,{signal});document.addEventListener('variant:change',this.updateStock,{signal});this.updateStock();
    }
    const proxy=this.dataset.proxy;
    if(/^\/apps\/[a-z0-9-]+$/.test(proxy||'')){
      ConversionBlock.languages??=new Map();const cacheKey=proxy+':'+this.dataset.locale;
      if(!ConversionBlock.languages.has(cacheKey))ConversionBlock.languages.set(cacheKey,fetch(proxy+'/conversion-translations?language='+encodeURIComponent(this.dataset.locale||'en'),{headers:{Accept:'application/json'}}).then(response=>response.ok?response.json():{content:{}}).catch(()=>({content:{}})));
      void ConversionBlock.languages.get(cacheKey).then(({content})=>{if(signal.aborted)return;const fields=content?.[this.dataset.kind]||{};for(const element of this.querySelectorAll('[data-cb-text]')){const text=fields[element.dataset.cbText];if(text)element.textContent=text;}for(const element of this.querySelectorAll('[data-cb-list]')){const text=fields[element.dataset.cbList];if(text){const line=text.split('\n')[Number(element.dataset.cbIndex)];if(line)element.textContent=line;}}const copy=this.querySelector('[data-cb-copy]');if(copy&&fields.copied)copy.dataset.copied=fields.copied;const timer=this.querySelector('[data-cb-countdown]');if(timer&&fields.expired)timer.dataset.expired=fields.expired;if(fields.label)this.dataset.stockLabel=fields.label;if(fields.unavailable)this.dataset.unavailableLabel=fields.unavailable;this.updateStock?.();});
    }
    const status=this.querySelector('.cb-live-status');
    this.addEventListener('click',async event=>{
      const copy=event.target.closest('[data-cb-copy]');
      if(copy){try{await navigator.clipboard.writeText(copy.dataset.cbCopy);status.textContent=copy.dataset.copied||'Copied!';}catch{status.textContent='Copy this code: '+copy.dataset.cbCopy;}}
      if(event.target.closest('[data-cb-dismiss]'))this.hidden=true;
      if(event.target.closest('[data-cb-prev],[data-cb-next]')){const carousel=this.querySelector('[data-cb-carousel]');const delta=event.target.closest('[data-cb-prev]')?-1:1;carousel?.scrollBy({left:delta*carousel.clientWidth,behavior:'smooth'});}
    },{signal});
    this.addEventListener('submit',async event=>{
      const form=event.target;if(!form.matches('[data-cb-form]'))return;event.preventDefault();
      if(this.dataset.design==='true'){status.textContent='Cart actions are disabled in the theme editor.';return;}
      const button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;status.textContent='Adding…';
      try{const response=await fetch(this.dataset.addUrl,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});const data=await response.json();if(!response.ok)throw new Error(data.description||'Unable to add this item.');status.textContent='Added to cart.';document.dispatchEvent(new CustomEvent('cart:refresh',{detail:{source:'conversion-blocks',item:data}}));}
      catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    },{signal});
    const delivery=this.querySelector('[data-cb-delivery]');if(delivery){const min=Math.max(0,Number(delivery.dataset.min)||0);const max=Math.max(min,Number(delivery.dataset.max)||0);const format=days=>{const date=new Date();date.setDate(date.getDate()+days);return date.toLocaleDateString(this.dataset.locale||undefined,{month:'short',day:'numeric'});};delivery.textContent=`${format(min)} – ${format(max)}`;}
    const timer=this.querySelector('[data-cb-countdown]');if(timer){const update=()=>{const end=Date.parse(timer.dataset.end);if(!Number.isFinite(end)){timer.textContent='Set a valid offer end date.';return;}let seconds=Math.max(0,Math.floor((end-Date.now())/1000));if(!seconds){timer.textContent=timer.dataset.expired;clearInterval(this.timer);return;}const days=Math.floor(seconds/86400);seconds%=86400;timer.textContent=`${days}d ${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};update();this.timer=setInterval(update,1000);}
    if(this.dataset.kind==='wrapper'&&this.dataset.wrap==='true'){this.wrapped=this.closest('.shopify-section');this.wrapped?.classList.add('cb-live-wrapped');}
  }
  disconnectedCallback(){this.abort?.abort();clearInterval(this.timer);this.wrapped?.classList.remove('cb-live-wrapped');}
}
if(!customElements.get('ss-conversion-block'))customElements.define('ss-conversion-block',ConversionBlock);
