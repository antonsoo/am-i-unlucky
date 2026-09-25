(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function e(){return{mode:`simple`,simple:{rate:`1/512`,n:900,k:1},pity:{baseRate:.006,softPityStart:74,softPityIncrement:.06,hardPity:90,featuredRate:.5,hasGuarantee:!0,pity:0,guaranteed:!1,target:1,budget:180,actualPulls:90},collection:{items:[{name:`Item A`,rate:`0.3`},{name:`Item B`,rate:`0.2`},{name:`Item C`,rate:`0.1`},{name:`Item D`,rate:`0.05`}],n:60},time:{sources:[{name:`Daily quest`,rate:`2%`,runsPerDay:1}],k:1}}}function t(e){let t=new URLSearchParams;switch(t.set(`mode`,e.mode),e.mode){case`simple`:{let n=e.simple;t.set(`rate`,n.rate),t.set(`n`,String(n.n)),t.set(`k`,String(n.k));break}case`pity`:{let n=e.pity;t.set(`base`,String(n.baseRate)),t.set(`soft`,String(n.softPityStart)),t.set(`inc`,String(n.softPityIncrement)),t.set(`hard`,String(n.hardPity)),t.set(`feat`,String(n.featuredRate)),t.set(`guar`,n.hasGuarantee?`1`:`0`),t.set(`pity0`,String(n.pity)),t.set(`g0`,n.guaranteed?`1`:`0`),t.set(`target`,String(n.target)),t.set(`budget`,String(n.budget)),t.set(`actual`,String(n.actualPulls));break}case`collection`:{let n=e.collection;t.set(`items`,JSON.stringify(n.items)),t.set(`n`,String(n.n));break}case`time`:{let n=e.time;t.set(`sources`,JSON.stringify(n.sources)),t.set(`k`,String(n.k));break}}return t.toString()}function n(e,t,n){let r=e.get(t);if(r===null)return n;let i=Number(r);return Number.isFinite(i)?i:n}function r(t){let r=e(),i=new URLSearchParams(t),a=i.get(`mode`);if(a===`simple`||a===`pity`||a===`collection`||a===`time`)r.mode=a;else return r;try{switch(r.mode){case`simple`:r.simple={rate:i.get(`rate`)??r.simple.rate,n:n(i,`n`,r.simple.n),k:n(i,`k`,r.simple.k)};break;case`pity`:r.pity={baseRate:n(i,`base`,r.pity.baseRate),softPityStart:n(i,`soft`,r.pity.softPityStart),softPityIncrement:n(i,`inc`,r.pity.softPityIncrement),hardPity:n(i,`hard`,r.pity.hardPity),featuredRate:n(i,`feat`,r.pity.featuredRate),hasGuarantee:(i.get(`guar`)??(r.pity.hasGuarantee?`1`:`0`))===`1`,pity:n(i,`pity0`,r.pity.pity),guaranteed:(i.get(`g0`)??(r.pity.guaranteed?`1`:`0`))===`1`,target:n(i,`target`,r.pity.target),budget:n(i,`budget`,r.pity.budget),actualPulls:n(i,`actual`,r.pity.actualPulls)};break;case`collection`:{let e=i.get(`items`);r.collection={items:e?JSON.parse(e):r.collection.items,n:n(i,`n`,r.collection.n)};break}case`time`:{let e=i.get(`sources`);r.time={sources:e?JSON.parse(e):r.time.sources,k:n(i,`k`,r.time.k)};break}}}catch{}return r}var i=7,a=[.9999999999998099,676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9984369578019572e-21,1.5056327351493116e-7];function o(e){if(e<=0)throw RangeError(`logGamma requires x > 0, got ${e}`);if(e<.5)return Math.log(Math.PI/Math.sin(Math.PI*e))-o(1-e);let t=e-1,n=a[0],r=t+i+.5;for(let e=1;e<a.length;e++)n+=a[e]/(t+e);return .5*Math.log(2*Math.PI)+(t+.5)*Math.log(r)-r+Math.log(n)}function s(e,t){return t<0||t>e?-1/0:t===0||t===e?0:o(e+1)-o(t+1)-o(e-t+1)}function c(e,t){return o(e)+o(t)-o(e+t)}var l=300,u=1e-15,d=1e-300;function f(e,t,n){let r=t+n,i=t+1,a=t-1,o=1,s=1-r*e/i;Math.abs(s)<d&&(s=d),s=1/s;let c=s;for(let f=1;f<=l;f++){let l=2*f,p=f*(n-f)*e/((a+l)*(t+l));s=1+p*s,Math.abs(s)<d&&(s=d),o=1+p/o,Math.abs(o)<d&&(o=d),s=1/s,c*=s*o,p=-(t+f)*(r+f)*e/((t+l)*(i+l)),s=1+p*s,Math.abs(s)<d&&(s=d),o=1+p/o,Math.abs(o)<d&&(o=d),s=1/s;let m=s*o;if(c*=m,Math.abs(m-1)<u)break}return c}function p(e,t,n){if(e<=0)return 0;if(e>=1)return 1;let r=Math.exp(t*Math.log(e)+n*Math.log1p(-e)-c(t,n));return e<(t+1)/(t+n+2)?r*f(e,t,n)/t:1-r*f(1-e,n,t)/n}function m(e){let t=0,n=0;for(let r of e){let e=r-n,i=t+e;n=i-t-e,t=i}return t}function h(e){return Number.isNaN(e)?NaN:Math.min(1,Math.max(0,e))}function g(e,t,n){if(n<=0)return 1;if(e<0)throw RangeError(`n must be >= 0`);return n>e||t<=0?0:t>=1?1:h(p(t,n,e-n+1))}function ee(e,t,n){if(e<1||!Number.isInteger(e)||n<e||!Number.isInteger(n)||t<=0)return 0;if(t>=1)return+(n===e);let r=s(n-1,e-1)+e*Math.log(t)+(n-e)*Math.log1p(-t);return Math.exp(r)}function _(e,t,n){return g(n,t,e)}function v(e,t,n){if(n<=0)return e;if(n>=1||t<=0)return 1/0;if(t>=1)return e;let r=e/t,i=Math.max(e,Math.ceil(r));for(;_(e,t,i)<n;)if(i*=2,!Number.isFinite(i)||i>0x38d7ea4c68000)return 1/0;let a=e;for(;a<i;){let r=a+Math.floor((i-a)/2);_(e,t,r)>=n?i=r:a=r+1}return a}function y(e){let{p:t,n,k:r}=e;if(t<0||t>1)throw RangeError(`p must be in [0, 1]`);if(n<0||!Number.isInteger(n))throw RangeError(`n must be a non-negative integer`);if(r<1||!Number.isInteger(r))throw RangeError(`k must be a positive integer`);let i=g(n,t,r),a=t>0?r/t:1/0,o=t>0?Math.sqrt(r*(1-t)/(t*t)):1/0;return{probabilityAtLeastK:i,luckPercentile:100*(1-i),expectedAttempts:a,stdDevAttempts:o,attemptsFor:{p50:v(r,t,.5),p90:v(r,t,.9),p99:v(r,t,.99)}}}function b(e,t,n=200){if(t<=0)return[];let r=v(e,t,.999),i=Number.isFinite(r)?r:Math.ceil(e/t*5),a=Math.max(1,i-e+1),o=Math.max(1,Math.ceil(a/n)),s=[];for(let n=e;n<=i;n+=o)s.push({n,pmf:ee(e,t,n),cdf:_(e,t,n)});return s}var x=class extends Error{constructor(e){super(e),this.name=`RateParseError`}};function S(e){let t=e.trim();if(t.length===0)throw new x(`Rate cannot be empty.`);let n=/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(t);if(n){let e=Number(n[1]),r=Number(n[2]);if(r===0)throw new x(`Denominator cannot be zero.`);return C(e/r,t)}let r=/^(\d+(?:\.\d+)?)\s*%$/.exec(t);if(r)return C(Number(r[1])/100,t);if(/^\d+(?:\.\d+)?$/.exec(t))return C(Number(t),t);throw new x(`Could not parse "${e}" as a rate. Use a fraction (1/512), a percent (0.2%), or a decimal (0.002).`)}function C(e,t){if(!Number.isFinite(e)||e<0||e>1)throw new x(`Rate "${t}" must resolve to a probability between 0 and 1 (got ${e}).`);return e}function w(e){if(e<=0)return`never`;if(e>=1)return`always`;let t=1/e,n=Math.round(t);return Math.abs(t-n)<1e-9?`1 in ${n.toLocaleString()}`:`1 in ${t.toFixed(1)}`}function te(e){let t=e*100;return t===0?`0%`:t>=1?`${t.toPrecision(4).replace(/\.?0+$/,``)}%`:`${t.toPrecision(2)}%`}function T(e,t){let n;return(...r)=>{n!==void 0&&clearTimeout(n),n=setTimeout(()=>{e(...r)},t)}}function E(e){return Number.isFinite(e)?Math.round(e).toLocaleString(`en-US`):`∞`}function D(e,t=1){return Number.isFinite(e)?Number.isNaN(e)?`—`:e.toLocaleString(`en-US`,{maximumFractionDigits:t,minimumFractionDigits:0}):`∞`}function O(e,t=2){if(Number.isNaN(e))return`—`;let n=e*100;return n>0&&n<10**-t?`<${10**-t}%`:`${n.toLocaleString(`en-US`,{maximumFractionDigits:t})}%`}function ne(e){return Number.isFinite(e)?e<1?`${D(e*24,1)} hours`:e<60?`${D(e,1)} days`:`${D(e/30.44,1)} months (${E(e)} days)`:`∞`}function k(e){return e.replace(/[&<>"']/g,e=>{switch(e){case`&`:return`&amp;`;case`<`:return`&lt;`;case`>`:return`&gt;`;case`"`:return`&quot;`;default:return`&#39;`}})}var re=[{tailAtMost:.5,tier:`legendary`},{tailAtMost:2,tier:`epic`},{tailAtMost:10,tier:`rare`},{tailAtMost:25,tier:`uncommon`},{tailAtMost:50,tier:`common`}];function A(e){let t=Math.min(100,Math.max(0,e)),n=Math.min(t,100-t);return{tier:re.find(e=>n<=e.tailAtMost)?.tier??`common`,direction:t>50?`lucky`:t<50?`unlucky`:`average`,tailPercent:n}}function j(e,t){return e===`common`?`Common`:`${e.charAt(0).toUpperCase()+e.slice(1)} ${t===`unlucky`?`bad luck`:`good luck`}`}var ie={common:`#9aa5b1`,uncommon:`#3fb950`,rare:`#3f8ef7`,epic:`#b366f6`,legendary:`#f7a83f`};function ae(e){let t=Math.min(100,Math.max(0,e));return t>60?{headline:`Lucky`,detail:`You beat ${D(t,1)}% of players.`,tone:`lucky`}:t<40?{headline:`Unlucky`,detail:`${D(100-t,1)}% of players would have gotten it sooner.`,tone:`unlucky`}:{headline:`About average`,detail:`Right in the middle of the pack.`,tone:`average`}}function M(e,t){let{tier:n,direction:r}=A(e),i=ae(e),a=Math.min(100,Math.max(0,e)),o=j(n,r);return`
    <div class="luck-verdict">
      <h3 class="luck-verdict-headline luck-${i.tone}">${i.headline}</h3>
      <p class="luck-verdict-detail">${k(i.detail)}</p>
    </div>
    <div class="luck-meter" role="img" aria-label="Luck percentile: ${a.toFixed(1)}, ${k(o)}">
      <div class="luck-meter-track">
        <div class="luck-meter-needle" style="left: ${a}%;"></div>
      </div>
      <div class="luck-meter-scale">
        <span class="luck-meter-scale-end">Unlucky</span>
        <span class="luck-meter-scale-center">Average</span>
        <span class="luck-meter-scale-end">Lucky</span>
      </div>
    </div>
    <div class="luck-readout">
      <span class="tier-badge ${n}">${k(o)}</span>
      <span class="luck-readout-precise">${D(a,1)}th percentile — ${k(t)}</span>
    </div>
  `}var N=640,oe=280,P=8,F=14,se=248,ce=272;function I(e,t,n=[]){if(e.length<2)return`<p class="note">Not enough data to chart yet.</p>`;let r=e.map(e=>e.x),i=Math.min(...r),a=Math.max(...r),o=Math.max(...e.map(e=>e.pmf),1e-12),s=e=>P+(e-i)/Math.max(1,a-i)*624,c=e=>232-e/o*218,l=e=>232-e*218,u=`M ${s(e[0].x).toFixed(2)} ${232 .toFixed(2)} `+e.map(e=>`L ${s(e.x).toFixed(2)} ${c(e.pmf).toFixed(2)}`).join(` `)+` L ${s(e[e.length-1].x).toFixed(2)} ${232 .toFixed(2)} Z`,d=e.map((e,t)=>`${t===0?`M`:`L`} ${s(e.x).toFixed(2)} ${l(e.cdf).toFixed(2)}`).join(` `),f=n.filter(e=>e.x>=i&&e.x<=a).map(e=>{let t=s(e.x).toFixed(2);return`<line x1="${t}" y1="${F}" x2="${t}" y2="232" class="chart-marker" />
        <text x="${t}" y="12" class="chart-marker-label" text-anchor="middle">${e.label}</text>`}).join(``),p=[0,.25,.5,.75,1];return`
  <svg viewBox="0 0 ${N} ${oe}" role="img" aria-label="Distribution chart over ${t}" class="chart-svg">
    <style>
      .chart-svg { width: 100%; height: auto; font-family: var(--font-mono, monospace); }
      .chart-area { fill: color-mix(in srgb, var(--accent, #4a63e0) 28%, transparent); }
      .chart-cdf { fill: none; stroke: var(--legendary, #b8790a); stroke-width: 2; }
      .chart-axis-label { fill: var(--ink-faint, #8288a3); font-size: 10px; }
      .chart-marker { stroke: var(--ink-faint, #8288a3); stroke-width: 1; stroke-dasharray: 3 3; }
      .chart-marker-label { fill: var(--ink-dim, #565b78); font-size: 9px; }
      .chart-baseline { stroke: var(--border, #d7dbe8); stroke-width: 1; }
    </style>
    <line x1="${P}" y1="232" x2="632" y2="232" class="chart-baseline" />
    <path d="${u}" class="chart-area" />
    <path d="${d}" class="chart-cdf" />
    ${f}
    ${p.map((e,t)=>({value:Math.round(i+(a-i)*e),anchor:t===0?`start`:t===p.length-1?`end`:`middle`})).map(e=>`<text x="${s(e.value).toFixed(2)}" y="${se}" class="chart-axis-label" text-anchor="${e.anchor}">${e.value.toLocaleString(`en-US`)}</text>`).join(``)}
    <text x="${N/2}" y="${ce}" class="chart-axis-label chart-axis-title" text-anchor="middle">${t}</text>
  </svg>`}var L=[{id:`shiny-base`,mode:`simple`,label:`Shiny hunt — 1/4096`,description:`Community shorthand for a base shiny encounter rate; matches the documented 1/4096 odds used since Generation VI in the mainline Pokémon games.`,rate:`1/4096`},{id:`shiny-charm`,mode:`simple`,label:`Shiny hunt with charm — 3/4096`,description:`The same base rate with three roll attempts per encounter, matching the documented effect of the in-game Shiny Charm item.`,rate:`3/4096`},{id:`mmo-rare`,mode:`simple`,label:`MMO rare drop — 1/1000`,description:`Generic archetype for a “rare drop” rate commonly quoted on MMO wikis. Edit freely.`,rate:`1/1000`},{id:`loot-box`,mode:`simple`,label:`Loot box — 0.5%`,description:`Generic archetype for a premium loot-box item rate. Edit freely.`,rate:`0.5%`}],R=[{id:`soft-pity-gacha`,mode:`pity`,label:`Soft-pity gacha`,description:`0.6% base, soft pity ramping from pull 74, hard pity at 90, 50/50 featured roll with a guaranteed win after a loss. A generic archetype that matches community-documented models of popular gacha games — not any single game's exact published numbers.`,config:{baseRate:.006,softPityStart:74,softPityIncrement:.06,hardPity:90,featuredRate:.5,hasGuarantee:!0}}];function le(e,t,n){let r=t.simple;e.innerHTML=`
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Inputs</h2>
          <p class="panel-subtitle">A fixed per-attempt rate, no pity. Works for shiny hunts, loot boxes, rare drops.</p>
          <div class="field">
            <label class="field-label" for="simple-rate">Drop rate <span class="field-hint">1/512, 0.2%, or 0.002</span></label>
            <input type="text" id="simple-rate" value="${k(r.rate)}" inputmode="decimal" autocomplete="off" />
            <div class="field-error" id="simple-rate-error"></div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="simple-n">Attempts made</label>
              <input type="number" id="simple-n" min="0" step="1" value="${r.n}" />
            </div>
            <div class="field">
              <label class="field-label" for="simple-k">Copies needed</label>
              <input type="number" id="simple-k" min="1" step="1" value="${r.k}" />
            </div>
          </div>
        </section>
        <section class="panel">
          <h2 class="panel-title">Presets</h2>
          <div class="preset-list">
            ${L.map(e=>`
              <button type="button" class="preset-chip" data-preset="${e.id}">
                <span class="preset-chip-name">${k(e.label)}</span>
                <span class="preset-chip-desc">${k(e.description)}</span>
              </button>`).join(``)}
          </div>
        </section>
      </div>
      <div id="simple-results"></div>
    </div>
  `;let i=e.querySelector(`#simple-rate`),a=e.querySelector(`#simple-n`),o=e.querySelector(`#simple-k`),s=e.querySelector(`#simple-rate-error`),c=e.querySelector(`#simple-results`);function l(){let e;try{e=S(i.value),s.textContent=``}catch(e){s.textContent=e instanceof x?e.message:`Invalid rate.`,c.innerHTML=`<section class="panel"><p class="note">Fix the rate above to see results.</p></section>`;return}let t=Math.max(0,Math.floor(Number(a.value)||0)),l=Math.max(1,Math.floor(Number(o.value)||1));r.rate=i.value,r.n=t,r.k=l;let u=y({p:e,n:t,k:l}),d=e<=0||e>=1,f=t>=1&&!d,p=w(e),m=te(e),h;h=d?e<=0?`<p class="note">A 0% rate never succeeds, no matter how many attempts you make — there's no meaningful luck percentile here.</p>`:`<p class="note">A 100% rate always succeeds immediately — every player gets the same result, so there's no luck involved.</p>`:f?M(u.luckPercentile,`based on ${E(t)} attempts at ${p} (${m}) odds needing ${l} cop${l===1?`y`:`ies`}`):`<p class="note">Enter at least 1 attempt to see your luck percentile.</p>`;let g=I(b(l,e,220).map(e=>({x:e.n,pmf:e.pmf,cdf:e.cdf})),`attempts`,[{x:u.attemptsFor.p50,label:`50%`},{x:u.attemptsFor.p90,label:`90%`},{x:u.attemptsFor.p99,label:`99%`}]);c.innerHTML=`
      <section class="panel">
        <h2 class="panel-title">Your luck</h2>
        <p class="panel-subtitle">Based on the negative-binomial distribution for ${l} success${l===1?``:`es`} at ${k(p)} odds.</p>
        ${h}
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">P(at least ${l} by ${E(t)})</div>
            <div class="stat-tile-value">${O(u.probabilityAtLeastK)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Expected attempts</div>
            <div class="stat-tile-value">${D(u.expectedAttempts,1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">50% by</div>
            <div class="stat-tile-value">${E(u.attemptsFor.p50)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">90% by</div>
            <div class="stat-tile-value">${E(u.attemptsFor.p90)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">99% by</div>
            <div class="stat-tile-value">${E(u.attemptsFor.p99)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Std. deviation</div>
            <div class="stat-tile-value">${D(u.stdDevAttempts,1)}</div>
          </div>
        </div>
        ${f?`<button type="button" class="btn btn-primary" id="simple-export" style="margin-top:16px;">Export luck card</button>`:``}
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <p class="panel-subtitle">Probability mass (area) and cumulative probability (line) over attempts, with the 50/90/99% marks.</p>
        <div class="chart-wrap">${g}</div>
      </section>
      <section class="panel">
        <details class="callout">
          <summary>What's "bad luck protection", and why doesn't simple mode have it?</summary>
          <p>Bad luck protection (pity) means the odds change based on how many attempts you've made without success — usually ramping up toward a guarantee. A plain drop rate like this one is <strong>memoryless</strong>: attempt 900 has exactly the same ${k(m)} chance as attempt 1, no matter how long you've gone without a drop. If a game promises a guarantee after N tries, that's a different system — model it in <strong>Pity system</strong> mode instead.</p>
        </details>
      </section>
    `,c.querySelector(`#simple-export`)?.addEventListener(`click`,()=>{n.openLuckCard({headline:`Took ${E(t)} attempts at ${p} odds for ${l} cop${l===1?`y`:`ies`}.`,percentile:u.luckPercentile,modeLabel:`Simple drop`,detail:`P(at least ${l} by ${E(t)}) = ${O(u.probabilityAtLeastK)}. Expected ${D(u.expectedAttempts,0)} attempts.`})}),n.onStateChange()}let u=T(l,120);i.addEventListener(`input`,u),a.addEventListener(`input`,u),o.addEventListener(`input`,u),e.querySelectorAll(`[data-preset]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=L.find(t=>t.id===e.dataset.preset);t&&(i.value=t.rate,l())})}),l()}var ue=2e5;function de(e,t){let n=e+1;if(n>=t.hardPity)return 1;if(n<t.softPityStart)return t.baseRate;let r=n-t.softPityStart+1;return Math.min(1,t.baseRate+r*t.softPityIncrement)}function z(e,t,n,r){return(e*r+t)*2+ +!!n}function B(e,t,n){e[t]=(e[t]??0)+n}function V(e,t,n){if(n<1||!Number.isInteger(n))throw RangeError(`target must be a positive integer`);if(e.hardPity<1)throw RangeError(`hardPity must be >= 1`);if(t.pity<0||t.pity>=e.hardPity)throw RangeError(`initial pity must be in [0, hardPity)`);let r=e.hasGuarantee?n*2*e.hardPity+1:Math.min(ue,Math.max(n*20*e.hardPity,5e3)),i=e.hardPity,a=n*i*2,o=new Float64Array(a);o[z(0,t.pity,t.guaranteed&&e.hasGuarantee,i)]=1;let s=new Float64Array(r+1);for(let t=1;t<=r;t++){let r=new Float64Array(a),c=0;for(let t=0;t<n;t++)for(let a=0;a<i;a++)for(let s of[!1,!0]){let l=o[z(t,a,s,i)];if(l===0)continue;let u=l*de(a,e),d=l-u;if(u>0){let a=u*(e.hasGuarantee&&s?1:e.featuredRate),o=u-a;a>0&&(t+1===n?c+=a:B(r,z(t+1,0,!1,i),a)),o>0&&B(r,z(t,0,e.hasGuarantee,i),o)}if(d>0){let e=Math.min(a+1,i-1);B(r,z(t,e,s,i),d)}}s[t]=c,o=r}let c=0;for(let e=0;e<=r;e++)c+=s[e];return{pmf:s,exact:e.hasGuarantee,tailMass:Math.max(0,1-c),horizon:r}}function H(e){let t=new Float64Array(e.length),n=0;for(let r=0;r<e.length;r++)n+=e[r],t[r]=n;return t}function fe(e){let{pmf:t}=e,n=0;for(let e=0;e<t.length;e++)n+=e*t[e];let r=0;for(let e=0;e<t.length;e++)r+=t[e]*(e-n)**2;let i=H(t),a=e=>{for(let t=0;t<i.length;t++)if(i[t]>=e)return t;return i.length-1};return{expectedPulls:n,stdDevPulls:Math.sqrt(Math.max(0,r)),pullsFor:{p50:a(.5),p90:a(.9),p99:a(.99)},probabilityWithinBudget:e=>{let t=Math.min(Math.max(0,Math.floor(e)),i.length-1);return h(i[t])}}}function pe(e,t){let n=H(e.pmf),r=Math.min(Math.max(0,Math.floor(t)),n.length-1);return 100*h(1-(r>0?n[r-1]:0))}function me(e,t=200){let n=H(e.pmf),r=e.pmf.length-1;for(;r>1&&n[r-1]>.9999;)r--;r=Math.min(e.pmf.length-1,r+2);let i=Math.max(1,Math.ceil(r/t)),a=[];for(let t=0;t<=r;t+=i)a.push({pulls:t,pmf:e.pmf[t],cdf:n[t]});return a}function he(e,t,n){let r=t.pity;e.innerHTML=`
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Pity configuration</h2>
          <p class="panel-subtitle">Soft pity ramps the rate linearly; hard pity guarantees a hit.</p>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-base">Base rate</label>
              <input type="text" id="pity-base" value="${U(r.baseRate)}" />
            </div>
            <div class="field">
              <label class="field-label" for="pity-hard">Hard pity (pull #)</label>
              <input type="number" id="pity-hard" min="1" step="1" value="${r.hardPity}" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-soft">Soft pity starts at pull</label>
              <input type="number" id="pity-soft" min="1" step="1" value="${r.softPityStart}" />
            </div>
            <div class="field">
              <label class="field-label" for="pity-inc">Ramp per pull</label>
              <input type="text" id="pity-inc" value="${U(r.softPityIncrement)}" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-feat">Featured rate</label>
              <input type="text" id="pity-feat" value="${U(r.featuredRate)}" />
            </div>
            <div class="field">
              <label class="field-label" style="visibility:hidden">.</label>
              <label class="checkbox-field"><input type="checkbox" id="pity-guar" ${r.hasGuarantee?`checked`:``}/> Guarantee after a loss</label>
            </div>
          </div>
        </section>
        <section class="panel">
          <h2 class="panel-title">Your situation</h2>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-pity0">Current pity counter</label>
              <input type="number" id="pity-pity0" min="0" step="1" value="${r.pity}" />
            </div>
            <div class="field">
              <label class="field-label" style="visibility:hidden">.</label>
              <label class="checkbox-field"><input type="checkbox" id="pity-g0" ${r.guaranteed?`checked`:``}/> On guarantee now</label>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-target">Copies wanted</label>
              <input type="number" id="pity-target" min="1" step="1" value="${r.target}" />
            </div>
            <div class="field">
              <label class="field-label" for="pity-budget">Pull budget</label>
              <input type="number" id="pity-budget" min="0" step="1" value="${r.budget}" />
            </div>
          </div>
          <div class="field">
            <label class="field-label" for="pity-actual">"How lucky was my history?" — pulls it actually took <span class="field-hint">optional</span></label>
            <input type="number" id="pity-actual" min="0" step="1" value="${r.actualPulls}" />
          </div>
        </section>
        <section class="panel">
          <h2 class="panel-title">Presets</h2>
          <div class="preset-list">
            ${R.map(e=>`
              <button type="button" class="preset-chip" data-preset="${e.id}">
                <span class="preset-chip-name">${k(e.label)}</span>
                <span class="preset-chip-desc">${k(e.description)}</span>
              </button>`).join(``)}
          </div>
        </section>
      </div>
      <div id="pity-results"></div>
    </div>
  `;let i={base:e.querySelector(`#pity-base`),hard:e.querySelector(`#pity-hard`),soft:e.querySelector(`#pity-soft`),inc:e.querySelector(`#pity-inc`),feat:e.querySelector(`#pity-feat`),guar:e.querySelector(`#pity-guar`),pity0:e.querySelector(`#pity-pity0`),g0:e.querySelector(`#pity-g0`),target:e.querySelector(`#pity-target`),budget:e.querySelector(`#pity-budget`),actual:e.querySelector(`#pity-actual`)},a=e.querySelector(`#pity-results`);function o(e,t){let n=e.trim();if(n.endsWith(`%`)){let e=Number(n.slice(0,-1))/100;return Number.isFinite(e)?e:t}let r=Number(n);return Number.isFinite(r)?r:t}function s(){let e=Math.max(1,Math.floor(Number(i.hard.value)||1)),t={baseRate:Math.min(1,Math.max(0,o(i.base.value,r.baseRate))),hardPity:e,softPityStart:Math.min(e,Math.max(1,Math.floor(Number(i.soft.value)||1))),softPityIncrement:Math.max(0,o(i.inc.value,r.softPityIncrement)),featuredRate:Math.min(1,Math.max(0,o(i.feat.value,r.featuredRate))),hasGuarantee:i.guar.checked},s=Math.min(e-1,Math.max(0,Math.floor(Number(i.pity0.value)||0))),c=Math.max(1,Math.floor(Number(i.target.value)||1)),l=Math.max(0,Math.floor(Number(i.budget.value)||0)),u=Math.max(0,Math.floor(Number(i.actual.value)||0));Object.assign(r,t,{pity:s,guaranteed:i.g0.checked,target:c,budget:l,actualPulls:u});let d;try{d=V(t,{pity:s,guaranteed:i.g0.checked},c)}catch(e){a.innerHTML=`<section class="panel"><p class="note">${k(e instanceof Error?e.message:`Invalid configuration.`)}</p></section>`;return}let f=fe(d),p=f.probabilityWithinBudget(l),m=pe(d,u),h=I(me(d,220).map(e=>({x:e.pulls,pmf:e.pmf,cdf:e.cdf})),`pulls`,[{x:f.pullsFor.p50,label:`50%`},{x:f.pullsFor.p90,label:`90%`},{x:f.pullsFor.p99,label:`99%`}]),g=M(m,`based on ${E(u)} pulls chasing ${c} cop${c===1?`y`:`ies`}`);a.innerHTML=`
      <section class="panel">
        <h2 class="panel-title">How lucky was my history?</h2>
        <p class="panel-subtitle">Computed from the exact pull-by-pull distribution, not a simulation.</p>
        ${g}
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Expected pulls</div>
            <div class="stat-tile-value">${D(f.expectedPulls,1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Std. deviation</div>
            <div class="stat-tile-value">${D(f.stdDevPulls,1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">P(success within ${E(l)})</div>
            <div class="stat-tile-value">${O(p)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">50% by</div>
            <div class="stat-tile-value">${E(f.pullsFor.p50)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">90% by</div>
            <div class="stat-tile-value">${E(f.pullsFor.p90)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">99% by</div>
            <div class="stat-tile-value">${E(f.pullsFor.p99)}</div>
          </div>
        </div>
        <button type="button" class="btn btn-primary" id="pity-export" style="margin-top:16px;">Export luck card</button>
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <p class="panel-subtitle">
          ${d.exact?`Exact — computed via dynamic programming over the pity Markov chain; the shown horizon is a true upper bound.`:`Not exactly bounded without the guarantee mechanic, so this truncates at a generous horizon (undistributed tail mass: ${O(d.tailMass,4)}).`}
        </p>
        <div class="chart-wrap">${h}</div>
      </section>
      <section class="panel">
        <details class="callout">
          <summary>Why can't I just use E[attempts] = 1/rate here?</summary>
          <p>Because the rate isn't constant. Once you're inside the soft-pity window the per-pull chance climbs every pull, and a lost 50/50 deterministically changes your next roll's odds. Both break the "memoryless" assumption that closed-form geometric/negative-binomial math relies on. This tool instead runs an exact dynamic-programming pass over the pity state machine (pity counter × guarantee flag × copies obtained) — see <a href="https://github.com/antonsoo/am-i-unlucky/blob/main/docs/MATH.md" target="_blank" rel="noopener">docs/MATH.md</a> for the derivation.</p>
        </details>
      </section>
    `,a.querySelector(`#pity-export`)?.addEventListener(`click`,()=>{n.openLuckCard({headline:`Took ${E(u)} pulls for ${c} cop${c===1?`y`:`ies`} under pity.`,percentile:m,modeLabel:`Pity system`,detail:`Expected ${D(f.expectedPulls,0)} pulls. P(success within ${E(l)}) = ${O(p)}.`})}),n.onStateChange()}let c=T(s,150);Object.values(i).forEach(e=>{e.addEventListener(e.type===`checkbox`?`change`:`input`,c)}),e.querySelectorAll(`[data-preset]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=R.find(t=>t.id===e.dataset.preset);t&&(i.base.value=U(t.config.baseRate),i.hard.value=String(t.config.hardPity),i.soft.value=String(t.config.softPityStart),i.inc.value=U(t.config.softPityIncrement),i.feat.value=U(t.config.featuredRate),i.guar.checked=t.config.hasGuarantee,s())})}),s()}function U(e){return`${(e*100).toString()}%`}function W(e){let t=0;for(;e;)e&=e-1,t++;return t}function G(e){let t=e.length,n=new Float64Array(1<<t);for(let r=1;r<1<<t;r++){let t=r&-r,i=Math.log2(t);n[r]=n[r&r-1]+e[i]}return n}function ge(e){let t=e.length;if(t===0)return{expectedAttempts:0,exact:!0};if(e.some(e=>e<=0))return{expectedAttempts:1/0,exact:!0};if(t>24)throw RangeError(`Exact expectation supports at most 24 items (got ${t}).`);let n=G(e),r=[];for(let e=1;e<1<<t;e++){let t=W(e)%2==1?1:-1;r.push(t/n[e])}return{expectedAttempts:m(r),exact:!0}}function K(e,t){let n=e.length;if(n===0)return 1;if(n>18)throw RangeError(`Exact CDF supports at most 18 items (got ${n}).`);if(t<0)return 0;let r=G(e),i=Array(1<<n).fill(0);for(let e=0;e<1<<n;e++){let n=W(e)%2==0?1:-1,a=1-r[e];i[e]=n*a**+t}let a=m(i);return Math.min(1,Math.max(0,a))}function _e(e,t,n=200){let r=Math.max(1,Math.ceil(t/n)),i=[];for(let n=0;n<=t;n+=r)i.push({n,cdf:K(e,n)});return i}function ve(e){let t=e>>>0;return()=>{t|=0,t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}function ye(e,t,n=ve(12648430),r=2e6){let i=e.length,a=[],o=0;for(let t of e)o+=t,a.push(o);let s=[],c=0;for(let e=0;e<t;e++){let e=Array(i).fill(!1),t=i,o=0;for(;t>0&&o<r;){o++;let r=n(),s=-1;for(let e=0;e<i;e++)if(r<a[e]){s=e;break}s>=0&&!e[s]&&(e[s]=!0,t--)}t>0?c++:s.push(o)}let l=s.length,u=l>0?s.reduce((e,t)=>e+t,0)/l:1/0,d=l>1?s.reduce((e,t)=>e+(t-u)**2,0)/(l-1):0,f=Math.sqrt(d),p=l>0?f/Math.sqrt(l):1/0;return{sampleSize:t,mean:u,stdDev:f,ci95:[u-1.96*p,u+1.96*p],censored:c}}function be(e,t,n){let r=t.collection;function i(){return r.items.map((e,t)=>`
      <div class="item-row" data-index="${t}">
        <input type="text" class="item-name" value="${k(e.name)}" placeholder="Item name" aria-label="Item ${t+1} name" />
        <input type="text" class="item-rate" value="${k(e.rate)}" placeholder="rate" aria-label="Item ${t+1} drop rate" />
        <button type="button" class="item-remove" aria-label="Remove ${k(e.name)||`item ${t+1}`}" title="Remove">✕</button>
      </div>`).join(``)}e.innerHTML=`
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Items to collect</h2>
          <p class="panel-subtitle">Independent per-attempt probability for each item. Duplicates don't help.</p>
          <div id="item-rows">${i()}</div>
          <button type="button" class="btn btn-ghost btn-block" id="add-item">+ Add item</button>
        </section>
        <section class="panel">
          <div class="field">
            <label class="field-label" for="coll-n">Attempts to check P(complete by)</label>
            <input type="number" id="coll-n" min="0" step="1" value="${r.n}" />
          </div>
        </section>
      </div>
      <div id="collection-results"></div>
    </div>
  `;let a=e.querySelector(`#item-rows`),o=e.querySelector(`#add-item`),s=e.querySelector(`#coll-n`),c=e.querySelector(`#collection-results`);function l(){return Array.from(a.querySelectorAll(`.item-row`)).map(e=>({name:e.querySelector(`.item-name`).value||`Item`,rate:e.querySelector(`.item-rate`).value}))}function u(){r.items=l(),r.n=Math.max(0,Math.floor(Number(s.value)||0));let e=[],t=``;for(let n of r.items)try{e.push(S(n.rate))}catch(e){t=e instanceof x?e.message:`Invalid rate.`;break}if(t||e.length===0){c.innerHTML=`<section class="panel"><p class="note">${k(t||`Add at least one item.`)}</p></section>`;return}if(e.length>24){c.innerHTML=`<section class="panel"><p class="note">Exact math supports up to 24 items (inclusion-exclusion is O(2^m)). Remove some items, or treat this as a Monte-Carlo-only estimate in a future version.</p></section>`;return}let{expectedAttempts:i}=ge(e),a=e.length<=18,o=a?K(e,r.n):NaN,u=ye(e,2e4),d=(u.ci95[1]-u.ci95[0])/2,f=a?I(_e(e,Math.max(20,Math.ceil(i*3||50)),200).map(e=>({x:e.n,pmf:0,cdf:e.cdf})),`attempts`,[{x:r.n,label:`n`}]):`<p class="note">Exact CDF curve supports up to 18 items; showing Monte Carlo summary only for ${e.length} items.</p>`;c.innerHTML=`
      <section class="panel">
        <h2 class="panel-title">Collection stats</h2>
        <p class="panel-subtitle">Exact via inclusion-exclusion over ${e.length} item${e.length===1?``:`s`} (${e.length<=18?`2^`+e.length.toString()+` subsets`:`expectation only`}).</p>
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Expected attempts</div>
            <div class="stat-tile-value">${D(i,1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">P(complete by ${E(r.n)})</div>
            <div class="stat-tile-value">${a?O(o):`—`}</div>
          </div>
        </div>
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <div class="chart-wrap">${f}</div>
      </section>
      <section class="panel">
        <h2 class="panel-title">Monte Carlo cross-check</h2>
        <p class="panel-subtitle">Independent simulation, not used for the headline numbers above.</p>
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Sample size</div>
            <div class="stat-tile-value">${E(u.sampleSize)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Mean attempts</div>
            <div class="stat-tile-value">${D(u.mean,1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">95% CI</div>
            <div class="stat-tile-value">±${D(d,2)}</div>
          </div>
        </div>
        <p class="note">Simulated mean ${D(u.mean,2)} vs. exact ${D(i,2)} — difference of ${D(Math.abs(u.mean-i),2)}, within the confidence interval above.</p>
      </section>
    `,n.onStateChange()}let d=T(u,150);function f(e){e.querySelector(`.item-name`).addEventListener(`input`,d),e.querySelector(`.item-rate`).addEventListener(`input`,d),e.querySelector(`.item-remove`).addEventListener(`click`,()=>{a.children.length<=1||(e.remove(),u())})}a.querySelectorAll(`.item-row`).forEach(f),o.addEventListener(`click`,()=>{let e=document.createElement(`div`);e.className=`item-row`,e.innerHTML=`
      <input type="text" class="item-name" value="Item ${a.children.length+1}" placeholder="Item name" />
      <input type="text" class="item-rate" value="0.05" placeholder="rate" />
      <button type="button" class="item-remove" aria-label="Remove item" title="Remove">✕</button>`,a.appendChild(e),f(e),u()}),s.addEventListener(`input`,d),u()}function q(e){if(e.length===0)return 0;let t=1;for(let n of e){if(n.runsPerDay<0)throw RangeError(`runsPerDay must be >= 0`);t*=(1-n.p)**n.runsPerDay}return 1-t}function J(e){let{sources:t,k:n}=e;if(n<1||!Number.isInteger(n))throw RangeError(`k must be a positive integer`);let r=q(t),i=t.reduce((e,t)=>e+t.runsPerDay,0),a=r>0?n/r:1/0;return{dailySuccessRate:r,totalRunsPerDay:i,expectedDays:a,expectedHours:a*24,daysFor:{p50:v(n,r,.5),p90:v(n,r,.9),p99:v(n,r,.99)},probabilityWithinDays:e=>g(Math.floor(e),r,n)}}function xe(e,t,n=200){return b(t,q(e),n)}function Se(e,t,n){let r=t.time;function i(){return r.sources.map((e,t)=>`
      <div class="source-row" data-index="${t}">
        <input type="text" class="src-name" value="${k(e.name)}" placeholder="Source name" aria-label="Source ${t+1} name" />
        <input type="text" class="src-rate" value="${k(e.rate)}" placeholder="rate" aria-label="Source ${t+1} rate" />
        <input type="number" class="src-runs" value="${e.runsPerDay}" min="0" step="any" placeholder="runs/day" aria-label="Source ${t+1} runs per day" />
        <button type="button" class="item-remove" aria-label="Remove source" title="Remove">✕</button>
      </div>`).join(``)}e.innerHTML=`
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Attempt sources</h2>
          <p class="panel-subtitle">Each source has its own rate and how many runs/day it gives you.</p>
          <div class="source-row" style="font-size:0.72rem;color:var(--ink-faint);font-weight:600;text-transform:uppercase;">
            <span>Source</span><span>Rate</span><span>Runs/day</span><span></span>
          </div>
          <div id="source-rows">${i()}</div>
          <button type="button" class="btn btn-ghost btn-block" id="add-source">+ Add source</button>
        </section>
        <section class="panel">
          <div class="field">
            <label class="field-label" for="time-k">Copies needed</label>
            <input type="number" id="time-k" min="1" step="1" value="${r.k}" />
          </div>
        </section>
      </div>
      <div id="time-results"></div>
    </div>
  `;let a=e.querySelector(`#source-rows`),o=e.querySelector(`#add-source`),s=e.querySelector(`#time-k`),c=e.querySelector(`#time-results`);function l(){return Array.from(a.querySelectorAll(`.source-row`)).map(e=>({name:e.querySelector(`.src-name`).value||`Source`,rate:e.querySelector(`.src-rate`).value,runsPerDay:Math.max(0,Number(e.querySelector(`.src-runs`).value)||0)}))}function u(){r.sources=l(),r.k=Math.max(1,Math.floor(Number(s.value)||1));let e=[],t=``;for(let n of r.sources)try{e.push({name:n.name,p:S(n.rate),runsPerDay:n.runsPerDay})}catch(e){t=e instanceof x?e.message:`Invalid rate.`;break}if(t||e.length===0){c.innerHTML=`<section class="panel"><p class="note">${k(t||`Add at least one source.`)}</p></section>`;return}let i=J({sources:e,k:r.k}),a=xe(e,r.k,200),o=i.dailySuccessRate>0?I(a.map(e=>({x:e.n,pmf:e.pmf,cdf:e.cdf})),`days`,[{x:i.daysFor.p50,label:`50%`},{x:i.daysFor.p90,label:`90%`},{x:i.daysFor.p99,label:`99%`}]):`<p class="note">Every source has a zero rate — this can never happen.</p>`;c.innerHTML=`
      <section class="panel">
        <h2 class="panel-title">Time to drop</h2>
        <p class="panel-subtitle">Combined across ${e.length} source${e.length===1?``:`s`}, ${D(i.totalRunsPerDay,2)} runs/day total.</p>
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Daily success rate</div>
            <div class="stat-tile-value">${O(i.dailySuccessRate)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Expected time</div>
            <div class="stat-tile-value">${ne(i.expectedDays)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">50% by</div>
            <div class="stat-tile-value">${E(i.daysFor.p50)} days</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">90% by</div>
            <div class="stat-tile-value">${E(i.daysFor.p90)} days</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">99% by</div>
            <div class="stat-tile-value">${E(i.daysFor.p99)} days</div>
          </div>
        </div>
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <div class="chart-wrap">${o}</div>
      </section>
    `,n.onStateChange()}let d=T(u,150);function f(e){e.querySelectorAll(`input`).forEach(e=>e.addEventListener(`input`,d)),e.querySelector(`.item-remove`).addEventListener(`click`,()=>{a.children.length<=1||(e.remove(),u())})}a.querySelectorAll(`.source-row`).forEach(f),o.addEventListener(`click`,()=>{let e=document.createElement(`div`);e.className=`source-row`,e.innerHTML=`
      <input type="text" class="src-name" value="Source ${a.children.length+1}" placeholder="Source name" />
      <input type="text" class="src-rate" value="1%" placeholder="rate" />
      <input type="number" class="src-runs" value="1" min="0" step="any" placeholder="runs/day" />
      <button type="button" class="item-remove" aria-label="Remove source" title="Remove">✕</button>`,a.appendChild(e),f(e),u()}),s.addEventListener(`input`,d),u()}var Y=1080,X=1350,Ce={common:`#3a3f55`,uncommon:`#0f3d2c`,rare:`#0f2b57`,epic:`#3b1259`,legendary:`#5a3c06`};function we(e,t,n,r,i,a){e.beginPath(),e.moveTo(t+a,n),e.arcTo(t+r,n,t+r,n+i,a),e.arcTo(t+r,n+i,t,n+i,a),e.arcTo(t,n+i,t,n,a),e.arcTo(t,n,t+r,n,a),e.closePath()}function Te(e,t){e.width=Y,e.height=X;let n=e.getContext(`2d`);if(!n)return;let{tier:r,direction:i}=A(t.percentile),a=ie[r],o=Ce[r];n.fillStyle=`#0f1120`,n.fillRect(0,0,Y,X);let s=n.createRadialGradient(Y/2,X*.36,40,Y/2,X*.36,Y*.85);s.addColorStop(0,o),s.addColorStop(1,`#0f1120`),n.fillStyle=s,n.fillRect(0,0,Y,X),n.strokeStyle=a,n.lineWidth=6,we(n,40,40,1e3,1270,36),n.stroke(),n.fillStyle=`#aab0d6`,n.font=`600 30px 'IBM Plex Mono', monospace`,n.textAlign=`center`,n.fillText(`AM I UNLUCKY?`,Y/2,160),n.fillStyle=`#767ca3`,n.font=`500 26px 'IBM Plex Mono', monospace`,n.fillText(t.modeLabel.toUpperCase(),Y/2,200),n.font=`800 64px 'Bricolage Grotesque', sans-serif`,n.fillStyle=a,n.fillText(r.toUpperCase(),Y/2,330),n.font=`700 220px 'IBM Plex Mono', monospace`,n.fillStyle=`#f5f6fb`;let c=`${Math.round(t.percentile)}%`;n.fillText(c,Y/2,620),n.font=`500 42px 'IBM Plex Sans', sans-serif`,n.fillStyle=`#edeffb`,Z(n,t.headline,Y/2,760,880,52),n.font=`600 30px 'IBM Plex Mono', monospace`,n.fillStyle=`#aab0d6`,n.fillText(j(r,i).toLowerCase(),Y/2,900),n.font=`400 28px 'IBM Plex Sans', sans-serif`,n.fillStyle=`#8288a3`,Z(n,t.detail,Y/2,1010,860,38),n.font=`500 26px 'IBM Plex Mono', monospace`,n.fillStyle=`#565b78`,n.fillText(`am-i-unlucky — exact drop-rate & pity math`,Y/2,1260)}function Z(e,t,n,r,i,a){let o=t.split(` `),s=``,c=r,l=[];for(let t of o){let n=s.length>0?`${s} ${t}`:t;e.measureText(n).width>i&&s.length>0?(l.push(s),s=t):s=n}s.length>0&&l.push(s);for(let t of l.slice(0,3))e.fillText(t,n,c),c+=a}var Ee=[{id:`simple`,label:`Simple drop`,key:`1`},{id:`pity`,label:`Pity system`,key:`2`},{id:`collection`,label:`Collection`,key:`3`},{id:`time`,label:`Time to drop`,key:`4`}],De={simple:{title:`Am I unlucky?`,body:`Plug in a fixed drop rate and see exactly how unlucky (or lucky) your run really was — computed from the true negative-binomial distribution, not a rule of thumb.`},pity:{title:`Pity system calculator`,body:`Soft pity, hard pity, and 50/50 guarantees make the odds path-dependent. This runs an exact dynamic-programming pass over the pity state machine instead of a simulation.`},collection:{title:`Collection completion`,body:`How many attempts to collect every item in a set with unequal drop rates? Exact via inclusion-exclusion, cross-checked with Monte Carlo.`},time:{title:`Time to drop`,body:`Turn attempt rates and runs-per-day into a realistic time estimate, in hours, days, or months.`}};function Oe(){try{let e=localStorage.getItem(`aiu-theme`);(e===`light`||e===`dark`)&&(document.documentElement.dataset.theme=e)}catch{}}var ke=`<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/>`,Ae=`<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5Z"/>`;function Q(){let e=document.documentElement.dataset.theme,t=window.matchMedia(`(prefers-color-scheme: dark)`).matches;return e?e===`dark`:t}function $(){let e=document.querySelector(`#theme-btn svg`);e&&(e.innerHTML=Q()?Ae:ke)}function je(){let e=Q()?`light`:`dark`;document.documentElement.dataset.theme=e;try{localStorage.setItem(`aiu-theme`,e)}catch{}$()}function Me(){let e=document.getElementById(`app`);return e.innerHTML=`
    <div class="page">
      <header class="site-header">
        <div class="header-row">
          <div class="brand">
            <svg class="brand-die" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16 2 29 9.5V22.5L16 30 3 22.5V9.5Z" fill="none" stroke="var(--legendary)" stroke-width="2" stroke-linejoin="round"/>
              <circle cx="16" cy="16" r="3.4" fill="var(--legendary)"/>
            </svg>
            <span>am I unlucky?</span>
          </div>
          <div class="header-actions">
            <button type="button" class="icon-btn" id="share-btn" aria-label="Copy shareable link" title="Copy shareable link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/></svg>
            </button>
            <button type="button" class="icon-btn" id="theme-btn" aria-label="Toggle light and dark theme" title="Toggle theme">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>
            </button>
            <a class="icon-btn" href="https://github.com/antonsoo/am-i-unlucky" target="_blank" rel="noopener" aria-label="View source on GitHub" title="View source on GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a10.9 10.9 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.12 3.06.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .3.21.66.8.55A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"/></svg>
            </a>
          </div>
        </div>
        <nav class="mode-tabs" role="tablist" aria-label="Calculator mode" id="mode-tabs"></nav>
      </header>
      <main id="main-content"></main>
      <footer class="site-footer">
        <p>Exact wherever feasible; Monte Carlo cross-checks shown where it isn't. See <a href="https://github.com/antonsoo/am-i-unlucky/blob/main/docs/MATH.md" target="_blank" rel="noopener">docs/MATH.md</a> for derivations. MIT licensed — <a href="https://github.com/antonsoo/am-i-unlucky" target="_blank" rel="noopener">source on GitHub</a>.</p>
      </footer>
    </div>
    <div class="sr-live" role="status" aria-live="polite" id="live-region"></div>
  `,{app:e,tabsEl:document.getElementById(`mode-tabs`),mainEl:document.getElementById(`main-content`),liveEl:document.getElementById(`live-region`)}}function Ne(e){let t=document.createElement(`div`);t.className=`modal-backdrop`,t.innerHTML=`
    <div class="modal" role="dialog" aria-modal="true" aria-label="Luck card">
      <h2>Your luck card</h2>
      <canvas id="luck-card-canvas" width="1080" height="1350"></canvas>
      <div class="modal-actions">
        <button type="button" class="btn btn-primary btn-block" id="download-card">Download PNG</button>
        <button type="button" class="btn btn-ghost" id="close-card">Close</button>
      </div>
    </div>
  `,document.body.appendChild(t);let n=t.querySelector(`#luck-card-canvas`);Te(n,e);let r=document.activeElement,i=t.querySelector(`#download-card`),a=t.querySelector(`#close-card`);i.focus();function o(){t.remove(),document.removeEventListener(`keydown`,s),r?.focus()}function s(e){if(e.key===`Escape`){o();return}e.key===`Tab`&&(e.preventDefault(),(document.activeElement===i?a:i).focus())}document.addEventListener(`keydown`,s),t.addEventListener(`click`,e=>{e.target===t&&o()}),a.addEventListener(`click`,o),i.addEventListener(`click`,()=>{let e=document.createElement(`a`);e.download=`am-i-unlucky-luck-card.png`,e.href=n.toDataURL(`image/png`),e.click()})}function Pe(){Oe();let{tabsEl:e,mainEl:n,liveEl:i}=Me(),a=r(window.location.search),o=T(()=>{let e=t(a),n=`${window.location.pathname}?${e}`;window.history.replaceState(null,``,n)},300);function s(t){t!==a.mode&&(a.mode=t,c(),l(),o(),e.querySelector(`[data-mode="${t}"]`)?.focus())}function c(){e.innerHTML=Ee.map((e,t)=>`
      <button type="button" id="tab-${e.id}" class="mode-tab" role="tab" aria-selected="${e.id===a.mode}"
        aria-controls="mode-mount" tabindex="${e.id===a.mode?`0`:`-1`}" data-mode="${e.id}" data-index="${t}">
        ${e.label} <span class="tab-key">${e.key}</span>
      </button>`).join(``);let t=Array.from(e.querySelectorAll(`.mode-tab`));t.forEach(e=>{e.addEventListener(`click`,()=>{s(e.dataset.mode)}),e.addEventListener(`keydown`,n=>{let r=Number(e.dataset.index);if(n.key===`ArrowRight`||n.key===`ArrowLeft`){n.preventDefault();let e=n.key===`ArrowRight`?1:-1,i=t[(r+e+t.length)%t.length];s(i.dataset.mode)}})})}function l(){let e=De[a.mode];n.innerHTML=`
      <div class="intro">
        <h1>${e.title}</h1>
        <p>${e.body}</p>
      </div>
      <div id="mode-mount" role="tabpanel" aria-labelledby="tab-${a.mode}" tabindex="-1"></div>
    `;let t=document.getElementById(`mode-mount`),r={onStateChange:()=>{o()},openLuckCard:Ne};switch(a.mode){case`simple`:le(t,a,r);break;case`pity`:he(t,a,r);break;case`collection`:be(t,a,r);break;case`time`:Se(t,a,r)}}$(),document.getElementById(`theme-btn`).addEventListener(`click`,je),document.getElementById(`share-btn`).addEventListener(`click`,()=>{let e=t(a),n=`${window.location.origin}${window.location.pathname}?${e}`;navigator.clipboard.writeText(n).then(()=>{i.textContent=`Link copied to clipboard.`}).catch(()=>{i.textContent=n})}),window.addEventListener(`popstate`,()=>{a=r(window.location.search),c(),l()}),c(),l()}Pe();
//# sourceMappingURL=index-CEdKjXtf.js.map