(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function e(){return{mode:`simple`,simple:{rate:`1/512`,n:900,k:1,got:!1},pity:{baseRate:.006,softPityStart:74,softPityIncrement:.06,hardPity:90,featuredRate:.5,hasGuarantee:!0,pity:0,guaranteed:!1,target:1,budget:180,actualPulls:90},collection:{items:[{name:`Item A`,rate:`0.3`},{name:`Item B`,rate:`0.2`},{name:`Item C`,rate:`0.1`},{name:`Item D`,rate:`0.05`}],n:60},time:{sources:[{name:`Daily quest`,rate:`2%`,attempts:1,everyDays:1}],k:1,days:30}}}function t(e){let t=new URLSearchParams;switch(t.set(`mode`,e.mode),e.mode){case`simple`:{let n=e.simple;t.set(`rate`,n.rate),t.set(`n`,String(n.n)),t.set(`k`,String(n.k)),t.set(`got`,n.got?`1`:`0`);break}case`pity`:{let n=e.pity;t.set(`base`,String(n.baseRate)),t.set(`soft`,String(n.softPityStart)),t.set(`inc`,String(n.softPityIncrement)),t.set(`hard`,String(n.hardPity)),t.set(`feat`,String(n.featuredRate)),t.set(`guar`,n.hasGuarantee?`1`:`0`),t.set(`pity0`,String(n.pity)),t.set(`g0`,n.guaranteed?`1`:`0`),t.set(`target`,String(n.target)),t.set(`budget`,String(n.budget)),t.set(`actual`,String(n.actualPulls));break}case`collection`:{let n=e.collection;t.set(`items`,JSON.stringify(n.items)),t.set(`n`,String(n.n));break}case`time`:{let n=e.time;t.set(`sources`,JSON.stringify(n.sources)),t.set(`k`,String(n.k)),t.set(`days`,String(n.days));break}}return t.toString()}function n(e,t,n){let r=e.get(t);if(r===null)return n;let i=Number(r);return Number.isFinite(i)?i:n}var r=class extends Error{};function i(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function a(e){if(!Array.isArray(e)||e.length===0)throw new r;return e.map(e=>{if(!i(e)||typeof e.name!=`string`||typeof e.rate!=`string`)throw new r;return{name:e.name,rate:e.rate}})}function o(e){return a(e).map((t,n)=>{let a=e[n];if(!i(a))throw new r;let o=!(`attempts`in a)&&`runsPerDay`in a,s=o?a.runsPerDay:a.attempts,c=o?1:a.everyDays;if(typeof s!=`number`||!Number.isFinite(s)||typeof c!=`number`||!Number.isFinite(c))throw new r;return{...t,attempts:s,everyDays:c}})}function s(t){let r=e(),i=new URLSearchParams(t),s=i.get(`mode`);if(s===`simple`||s===`pity`||s===`collection`||s===`time`)r.mode=s;else return r;try{switch(r.mode){case`simple`:r.simple={rate:i.get(`rate`)??r.simple.rate,n:n(i,`n`,r.simple.n),k:n(i,`k`,r.simple.k),got:(i.get(`got`)??`1`)===`1`};break;case`pity`:r.pity={baseRate:n(i,`base`,r.pity.baseRate),softPityStart:n(i,`soft`,r.pity.softPityStart),softPityIncrement:n(i,`inc`,r.pity.softPityIncrement),hardPity:n(i,`hard`,r.pity.hardPity),featuredRate:n(i,`feat`,r.pity.featuredRate),hasGuarantee:(i.get(`guar`)??(r.pity.hasGuarantee?`1`:`0`))===`1`,pity:n(i,`pity0`,r.pity.pity),guaranteed:(i.get(`g0`)??(r.pity.guaranteed?`1`:`0`))===`1`,target:n(i,`target`,r.pity.target),budget:n(i,`budget`,r.pity.budget),actualPulls:n(i,`actual`,r.pity.actualPulls)};break;case`collection`:{let e=i.get(`items`);r.collection={items:e?a(JSON.parse(e)):r.collection.items,n:n(i,`n`,r.collection.n)};break}case`time`:{let e=i.get(`sources`);r.time={sources:e?o(JSON.parse(e)):r.time.sources,k:n(i,`k`,r.time.k),days:n(i,`days`,r.time.days)};break}}}catch{}return r}var c=Math.log(2*Math.PI),l=(()=>{let e=[0],t=1;for(let n=1;n<=15;n++)t*=n,e.push(Math.log(t));return e})();function u(e){if(e<=15)return l[e]-((e+.5)*Math.log(e)-e+.5*c);let t=e*e;return e>500?(1/12-1/360/t)/e:e>80?(1/12-(1/360-1/1260/t)/t)/e:e>35?(1/12-(1/360-(1/1260-1/1680/t)/t)/t)/e:(1/12-(1/360-(1/1260-(1/1680-1/1188/t)/t)/t)/t)/e}function d(e,t){if(Math.abs(e-t)<.1*(e+t)){let n=(e-t)/(e+t),r=(e-t)*n,i=2*e*n;n*=n;for(let e=1;e<1e3;e++){i*=n;let t=r+i/(2*e+1);if(t===r)return t;r=t}return r}return e*Math.log(e/t)+t-e}function f(e,t,n){if(n<0||n>e||!Number.isInteger(n))return 0;if(t<=0)return+(n===0);if(t>=1)return+(n===e);if(n===0)return Math.exp(e*Math.log1p(-t));if(n===e)return Math.exp(e*Math.log(t));let r=u(e)-u(n)-u(e-n)-d(n,e*t)-d(e-n,e*(1-t)),i=c+Math.log(n)+Math.log1p(-n/e);return Math.exp(r-.5*i)}function p(e){let t=0,n=0;for(let r of e){let e=r-n,i=t+e;n=i-t-e,t=i}return t}function m(e){return Number.isNaN(e)?NaN:Math.min(1,Math.max(0,e))}function h(e,t,n,r){let i=f(e,t,n),a=i;if(i===0)return 0;let o=t/(1-t);if(r===1)for(let t=n;t<e&&(i*=(e-t)/(t+1)*o,a+=i,!(i<a*1e-17));t++);else for(let t=n;t>0&&(i*=t/(e-t+1)/o,a+=i,!(i<a*1e-17));t--);return a}function g(e,t,n){if(n<=0)return 1;if(e<0)throw RangeError(`n must be >= 0`);if(n>e||t<=0)return 0;if(t>=1)return 1;if(e*t*(1-t)>1e10)throw RangeError(`Too many expected drops to compute exactly: this handles up to about ten billion.`);return n>e*t?m(h(e,t,n,1)):m(1-h(e,t,n-1,-1))}function _(e,t,n){return e<1||!Number.isInteger(e)||n<e||!Number.isInteger(n)||t<=0?0:t>=1?+(n===e):e/n*f(n,t,e)}function v(e,t,n){return g(n,t,e)}function y(e,t,n){if(n<=0)return e;if(n>=1||t<=0)return 1/0;if(t>=1)return e;let r=e/t,i=Math.max(e,Math.ceil(r));for(;v(e,t,i)<n;)if(i*=2,!Number.isFinite(i)||i>0x38d7ea4c68000)return 1/0;let a=e;for(;a<i;){let r=a+Math.floor((i-a)/2);v(e,t,r)>=n?i=r:a=r+1}return a}function b(e,t,n){return 100*(1-g(e,t,n))}function x(e){let{p:t,n,k:r}=e;if(t<0||t>1)throw RangeError(`p must be in [0, 1]`);if(n<0||!Number.isInteger(n))throw RangeError(`n must be a non-negative integer`);if(r<1||!Number.isInteger(r))throw RangeError(`k must be a positive integer`);let i=g(n,t,r),a=t>0?r/t:1/0,o=t>0?Math.sqrt(r*(1-t)/(t*t)):1/0;return{probabilityAtLeastK:i,luckPercentile:100*(1-i),expectedAttempts:a,stdDevAttempts:o,attemptsFor:{p50:y(r,t,.5),p90:y(r,t,.9),p99:y(r,t,.99)}}}function ee(e,t,n=200){if(t<=0)return[];let r=y(e,t,.999),i=Number.isFinite(r)?r:Math.ceil(e/t*5),a=Math.max(1,i-e+1),o=Math.max(1,Math.ceil(a/n)),s=[];for(let n=e;n<=i;n+=o)s.push({n,pmf:_(e,t,n),cdf:v(e,t,n)});return s}var S=class extends Error{constructor(e){super(e),this.name=`RateParseError`}};function C(e){let t=e.trim();if(t.length===0)throw new S(`Rate cannot be empty.`);let n=/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(t);if(n){let e=Number(n[1]),r=Number(n[2]);if(r===0)throw new S(`Denominator cannot be zero.`);return w(e/r,t)}let r=/^(\d+(?:\.\d+)?)\s*%$/.exec(t);if(r)return w(Number(r[1])/100,t);if(/^\d+(?:\.\d+)?$/.exec(t))return w(Number(t),t);throw new S(`Could not parse "${e}" as a rate. Use a fraction (1/512), a percent (0.2%), or a decimal (0.002).`)}function w(e,t){if(!Number.isFinite(e)||e<0||e>1)throw new S(`Rate "${t}" must resolve to a probability between 0 and 1 (got ${e}).`);return e}function te(e){if(e<=0)return`never`;if(e>=1)return`always`;let t=1/e,n=Math.round(t);return Math.abs(t-n)<1e-9?`1 in ${n.toLocaleString(`en-US`)}`:`1 in ${t.toFixed(1)}`}function ne(e){let t=e*100;return t===0?`0%`:t>=1?`${t.toPrecision(4).replace(/\.?0+$/,``)}%`:`${t.toPrecision(2)}%`}function T(e,t,n){let r,i=()=>{r!==void 0&&clearTimeout(r),r=void 0};return n?.addEventListener(`abort`,i,{once:!0}),Object.assign((...a)=>{i(),!n?.aborted&&(r=setTimeout(()=>{r=void 0,e(...a)},t))},{cancel:i})}function E(e){return Number.isFinite(e)?Math.round(e).toLocaleString(`en-US`):`∞`}function D(e,t=1){return Number.isNaN(e)?`—`:Number.isFinite(e)?e.toLocaleString(`en-US`,{maximumFractionDigits:t,minimumFractionDigits:0}):`∞`}function O(e,t=1){let n=D(e,t),r=n.replace(/\D/g,``).slice(-2),i=r.slice(-1);return r.length===2&&r.startsWith(`1`)?`${n}th`:i===`1`?`${n}st`:i===`2`?`${n}nd`:i===`3`?`${n}rd`:`${n}th`}function k(e,t=2){if(Number.isNaN(e))return`—`;let n=e*100;return n>0&&n<10**-t?`<${10**-t}%`:`${n.toLocaleString(`en-US`,{maximumFractionDigits:t})}%`}function re(e){return Number.isFinite(e)?e===1?`1 day`:e<1?`${D(e*24,1)} hours`:e<60?`${D(e,1)} days`:`${D(e/30.44,1)} months (${E(e)} days)`:`∞`}function A(e){return e.replace(/[&<>"']/g,e=>{switch(e){case`&`:return`&amp;`;case`<`:return`&lt;`;case`>`:return`&gt;`;case`"`:return`&quot;`;default:return`&#39;`}})}var ie=[{tailAtMost:.5,tier:`legendary`},{tailAtMost:2,tier:`epic`},{tailAtMost:10,tier:`rare`},{tailAtMost:25,tier:`uncommon`},{tailAtMost:50,tier:`common`}];function j(e){let t=Math.min(100,Math.max(0,e)),n=Math.min(t,100-t);return{tier:ie.find(e=>n<=e.tailAtMost)?.tier??`common`,direction:t>50?`lucky`:t<50?`unlucky`:`average`,tailPercent:n}}function M(e,t){return e===`common`?`Common`:`${e.charAt(0).toUpperCase()+e.slice(1)} ${t===`unlucky`?`bad luck`:`good luck`}`}var ae={common:`#9aa5b1`,uncommon:`#3fb950`,rare:`#3f8ef7`,epic:`#b366f6`,legendary:`#f7a83f`};function oe(e,t=!0){let n=Math.min(100,Math.max(0,e));if(!t){let e=D(100-n,1);return n<40?{headline:`Unlucky`,detail:`${e}% of players would have it by now.`,tone:`unlucky`}:{headline:`Not unlucky yet`,detail:`Only ${e}% of players would have it by now, so still waiting is normal.`,tone:`average`}}return n>60?{headline:`Lucky`,detail:`You beat ${D(n,1)}% of players.`,tone:`lucky`}:n<40?{headline:`Unlucky`,detail:`${D(100-n,1)}% of players would have gotten it sooner.`,tone:`unlucky`}:{headline:`About average`,detail:`Right in the middle of the pack.`,tone:`average`}}function se(e,t=!0){let n=Math.min(100,Math.max(0,e));return t?n:Math.min(n,50)}function N(e,t,n=!0,r=e){let i=n?e:r,a=se(i,n),{tier:o,direction:s}=j(a),c=oe(e,n),l=Math.min(100,Math.max(0,i)),u=M(o,s),d=n?`${O(l,1)} percentile`:`At best the ${O(l,1)} percentile, if it comes on your next attempt`;return`
    <div class="luck-verdict">
      <h3 class="luck-verdict-headline luck-${c.tone}">${c.headline}</h3>
      <p class="luck-verdict-detail">${A(c.detail)}</p>
    </div>
    <div class="luck-meter" role="img" aria-label="Luck percentile: ${n?``:`at best `}${l.toFixed(1)}, ${A(u)}">
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
      <span class="tier-badge ${o}">${A(u)}</span>
      <span class="luck-readout-precise">${A(d)} — ${A(t)}</span>
    </div>
  `}var P=640,ce=280,F=8,le=14,ue=248,de=272;function I(e,t,n=[]){if(e.length<2)return`<p class="note">Not enough data to chart yet.</p>`;let r=e.map(e=>e.x),i=Math.min(...r),a=Math.max(...r),o=Math.max(...e.map(e=>e.pmf),1e-12),s=e=>F+(e-i)/Math.max(1,a-i)*624,c=e=>232-e/o*218,l=e=>232-e*218,u=`M ${s(e[0].x).toFixed(2)} ${232 .toFixed(2)} `+e.map(e=>`L ${s(e.x).toFixed(2)} ${c(e.pmf).toFixed(2)}`).join(` `)+` L ${s(e[e.length-1].x).toFixed(2)} ${232 .toFixed(2)} Z`,d=e.map((e,t)=>`${t===0?`M`:`L`} ${s(e.x).toFixed(2)} ${l(e.cdf).toFixed(2)}`).join(` `),f=new Map;for(let e of n){let t=f.get(e.x)??[];t.push(e.label),f.set(e.x,t)}let p=Array.from(f,([e,t])=>({x:e,label:t.join(` / `)})).filter(e=>e.x>=i&&e.x<=a).map(e=>{let t=s(e.x),n=t.toFixed(2),r=e.label.length*3;return`<line x1="${n}" y1="${le}" x2="${n}" y2="232" class="chart-marker" />
        <text x="${n}" y="12" class="chart-marker-label" text-anchor="${t<r+F?`start`:t>632-r?`end`:`middle`}">${e.label}</text>`}).join(``),m=[...new Set([0,.25,.5,.75,1].map(e=>Math.round(i+(a-i)*e)))];return`
  <svg viewBox="0 0 ${P} ${ce}" role="img" aria-label="Distribution chart over ${t}" class="chart-svg">
    <style>
      .chart-svg { width: 100%; height: auto; font-family: var(--font-mono, monospace); }
      .chart-area { fill: color-mix(in srgb, var(--accent, #4a63e0) 28%, transparent); }
      .chart-cdf { fill: none; stroke: var(--legendary, #b8790a); stroke-width: 2; }
      .chart-axis-label { fill: var(--ink-faint, #8288a3); font-size: 10px; }
      .chart-marker { stroke: var(--ink-faint, #8288a3); stroke-width: 1; stroke-dasharray: 3 3; }
      .chart-marker-label { fill: var(--ink-dim, #565b78); font-size: 9px; }
      .chart-baseline { stroke: var(--border, #d7dbe8); stroke-width: 1; }
    </style>
    <line x1="${F}" y1="232" x2="632" y2="232" class="chart-baseline" />
    <path d="${u}" class="chart-area" />
    <path d="${d}" class="chart-cdf" />
    ${p}
    ${m.map((e,t)=>({value:e,anchor:t===0?`start`:t===m.length-1?`end`:`middle`})).map(e=>`<text x="${s(e.value).toFixed(2)}" y="${ue}" class="chart-axis-label" text-anchor="${e.anchor}">${e.value.toLocaleString(`en-US`)}</text>`).join(``)}
    <text x="${P/2}" y="${de}" class="chart-axis-label chart-axis-title" text-anchor="middle">${t}</text>
  </svg>`}var L=[{id:`shiny-base`,mode:`simple`,label:`Shiny hunt — 1/4096`,description:`Community shorthand for a base shiny encounter rate; matches the documented 1/4096 odds used since Generation VI in the mainline Pokémon games.`,rate:`1/4096`},{id:`shiny-charm`,mode:`simple`,label:`Shiny hunt with charm — 3/4096`,description:`The same base rate with three roll attempts per encounter, matching the documented effect of the in-game Shiny Charm item.`,rate:`3/4096`},{id:`mmo-rare`,mode:`simple`,label:`MMO rare drop — 1/1000`,description:`Generic archetype for a “rare drop” rate commonly quoted on MMO wikis. Edit freely.`,rate:`1/1000`},{id:`loot-box`,mode:`simple`,label:`Loot box — 0.5%`,description:`Generic archetype for a premium loot-box item rate. Edit freely.`,rate:`0.5%`}],R=[{id:`soft-pity-gacha`,mode:`pity`,label:`Soft-pity gacha`,description:`0.6% base, soft pity ramping from pull 74, hard pity at 90, 50/50 featured roll with a guaranteed win after a loss. A generic archetype that matches community-documented models of popular gacha games — not any single game's exact published numbers.`,config:{baseRate:.006,softPityStart:74,softPityIncrement:.06,hardPity:90,featuredRate:.5,hasGuarantee:!0}}];function fe(e,t,n){let r=t.simple;e.innerHTML=`
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Inputs</h2>
          <p class="panel-subtitle">A fixed per-attempt rate, no pity. Works for shiny hunts, loot boxes, rare drops.</p>
          <div class="field">
            <label class="field-label" for="simple-rate">Drop rate <span class="field-hint">1/512, 0.2%, or 0.002</span></label>
            <input type="text" id="simple-rate" value="${A(r.rate)}" inputmode="decimal" autocomplete="off" aria-describedby="simple-rate-error" />
            <div class="field-error" id="simple-rate-error" aria-live="polite"></div>
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
          <div class="field">
            <label class="checkbox-field"><input type="checkbox" id="simple-got" ${r.got?`checked`:``}/> <span id="simple-got-label">Got it on the last of those attempts</span></label>
            <p class="field-note">Leave it unchecked if you're still waiting.</p>
          </div>
        </section>
        <section class="panel">
          <h2 class="panel-title">Presets</h2>
          <div class="preset-list">
            ${L.map(e=>`
              <button type="button" class="preset-chip" data-preset="${e.id}">
                <span class="preset-chip-name">${A(e.label)}</span>
                <span class="preset-chip-desc">${A(e.description)}</span>
              </button>`).join(``)}
          </div>
        </section>
      </div>
      <div id="simple-results"></div>
    </div>
  `;let i=e.querySelector(`#simple-rate`),a=e.querySelector(`#simple-n`),o=e.querySelector(`#simple-k`),s=e.querySelector(`#simple-got`),c=e.querySelector(`#simple-got-label`),l=e.querySelector(`#simple-rate-error`),u=e.querySelector(`#simple-results`);function d(){r.rate=i.value,r.n=Math.max(0,Math.floor(Number(a.value)||0)),r.k=Math.max(1,Math.floor(Number(o.value)||1)),r.got=s.checked}n.registerCapture(d);function f(){try{p()}catch(e){if(!(e instanceof RangeError))throw e;u.innerHTML=`<section class="panel"><p class="note">${A(e.message)}</p></section>`}}function p(){d();let e;try{e=C(i.value),l.textContent=``,i.removeAttribute(`aria-invalid`)}catch(e){l.textContent=e instanceof S?e.message:`Invalid rate.`,i.setAttribute(`aria-invalid`,`true`),u.innerHTML=`<section class="panel"><p class="note">Fix the rate above to see results.</p></section>`;return}let{n:t,k:a,got:o}=r;c.textContent=a===1?`Got it on the last of those attempts`:`Got copy ${a} on the last of those attempts`;let s=x({p:e,n:t,k:a}),f=o?s.luckPercentile:b(t+1,e,a),p=e<=0||e>=1,m=t>=1&&!p,h=te(e),g=ne(e),_;_=p?e<=0?`<p class="note">A 0% rate never succeeds, no matter how many attempts you make — there's no meaningful luck percentile here.</p>`:`<p class="note">A 100% rate always succeeds immediately — every player gets the same result, so there's no luck involved.</p>`:m?N(s.luckPercentile,o?`based on ${E(t)} attempts at ${h} (${g}) odds needing ${a} cop${a===1?`y`:`ies`}`:`still waiting after ${E(t)} attempts at ${h} (${g}) odds, needing ${a} cop${a===1?`y`:`ies`}`,o,f):`<p class="note">Enter at least 1 attempt to see your luck percentile.</p>`;let v=I(ee(a,e,220).map(e=>({x:e.n,pmf:e.pmf,cdf:e.cdf})),`attempts`,[{x:s.attemptsFor.p50,label:`50%`},{x:s.attemptsFor.p90,label:`90%`},{x:s.attemptsFor.p99,label:`99%`}]);u.innerHTML=`
      <section class="panel">
        <h2 class="panel-title">Your luck</h2>
        <p class="panel-subtitle">Based on the negative-binomial distribution for ${a} success${a===1?``:`es`} at ${A(h)} odds.</p>
        ${_}
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">P(at least ${a} by ${E(t)})</div>
            <div class="stat-tile-value">${k(s.probabilityAtLeastK)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Expected attempts</div>
            <div class="stat-tile-value">${D(s.expectedAttempts,1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">50% by</div>
            <div class="stat-tile-value">${E(s.attemptsFor.p50)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">90% by</div>
            <div class="stat-tile-value">${E(s.attemptsFor.p90)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">99% by</div>
            <div class="stat-tile-value">${E(s.attemptsFor.p99)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Std. deviation</div>
            <div class="stat-tile-value">${D(s.stdDevAttempts,1)}</div>
          </div>
        </div>
        ${m&&(o||s.luckPercentile<40)?`<button type="button" class="btn btn-primary" id="simple-export" style="margin-top:16px;">Export luck card</button>`:``}
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <p class="panel-subtitle">Probability mass (area) and cumulative probability (line) over attempts, with the 50/90/99% marks.</p>
        <div class="chart-wrap">${v}</div>
      </section>
      <section class="panel">
        <details class="callout">
          <summary>What's "bad luck protection", and why doesn't simple mode have it?</summary>
          <p>Bad luck protection (pity) means the odds change based on how many attempts you've made without success — usually ramping up toward a guarantee. A plain drop rate like this one is <strong>memoryless</strong>: attempt 900 has exactly the same ${A(g)} chance as attempt 1, no matter how long you've gone without a drop. If a game promises a guarantee after N tries, that's a different system — model it in <strong>Pity system</strong> mode instead.</p>
        </details>
      </section>
    `,u.querySelector(`#simple-export`)?.addEventListener(`click`,()=>{n.openLuckCard({headline:o?`Took ${E(t)} attempts at ${h} odds for ${a} cop${a===1?`y`:`ies`}.`:`${E(t)} attempts at ${h} odds and still waiting for ${a===1?`it`:`copy ${a}`}.`,percentile:f,modeLabel:`Simple drop`,detail:`P(at least ${a} by ${E(t)}) = ${k(s.probabilityAtLeastK)}. Expected ${D(s.expectedAttempts,0)} attempts.`})}),n.onStateChange()}let m=T(f,120,n.signal);i.addEventListener(`input`,m),a.addEventListener(`input`,m),o.addEventListener(`input`,m),s.addEventListener(`change`,f),e.querySelectorAll(`[data-preset]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=L.find(t=>t.id===e.dataset.preset);t&&(i.value=t.rate,f())})}),f()}var pe=2e5,me=8e3,z=1e-15;function he(e,t){let n=e+1;if(n>=t.hardPity)return 1;if(n<t.softPityStart)return t.baseRate;let r=n-t.softPityStart+1;return Math.min(1,t.baseRate+r*t.softPityIncrement)}function B(e,t,n,r){return(e*r+t)*2+ +!!n}function V(e,t,n){e[t]=(e[t]??0)+n}function ge(e,t,n){if(n<1||!Number.isInteger(n))throw RangeError(`target must be a positive integer`);if(e.hardPity<1)throw RangeError(`hardPity must be >= 1`);if(t.pity<0||t.pity>=e.hardPity)throw RangeError(`initial pity must be in [0, hardPity)`);let r=e.hasGuarantee?n*2*e.hardPity+1:Math.min(pe,Math.max(n*20*e.hardPity,5e3)),i=e.hardPity,a=n*i*2;if(a>8e3)throw RangeError(`That is ${n} copies at a hard pity of ${i}: more states than this tracks exactly (the product can be at most ${me/2}). Lower one of them.`);let o=new Float64Array(a),s=new Float64Array(a);o[B(0,t.pity,t.guaranteed&&e.hasGuarantee,i)]=1;let c=new Float64Array(r+1),l=r;for(let t=1;t<=r;t++){s.fill(0);let r=0;for(let t=0;t<n;t++)for(let a=0;a<i;a++)for(let c of[!1,!0]){let l=o[B(t,a,c,i)];if(l===0)continue;let u=l*he(a,e),d=l-u;if(u>0){let a=u*(e.hasGuarantee&&c?1:e.featuredRate),o=u-a;a>0&&(t+1===n?r+=a:V(s,B(t+1,0,!1,i),a)),o>0&&V(s,B(t,0,e.hasGuarantee,i),o)}if(d>0){let e=Math.min(a+1,i-1);V(s,B(t,e,c,i),d)}}if(c[t]=r,[o,s]=[s,o],t%32==0){let e=0;for(let t=0;t<a;t++)e+=o[t];if(e<z){l=t;break}}}let u=0;for(let e=0;e<=l;e++)u+=c[e];return{pmf:l<r?c.slice(0,l+1):c,exact:e.hasGuarantee,tailMass:Math.max(0,1-u),horizon:l}}function H(e){let t=new Float64Array(e.length),n=0;for(let r=0;r<e.length;r++)n+=e[r],t[r]=n;return t}function _e(e){let{pmf:t}=e,n=0;for(let e=0;e<t.length;e++)n+=e*t[e];let r=0;for(let e=0;e<t.length;e++)r+=t[e]*(e-n)**2;let i=H(t),a=e=>{for(let t=0;t<i.length;t++)if(i[t]>=e)return t;return i.length-1};return{expectedPulls:n,stdDevPulls:Math.sqrt(Math.max(0,r)),pullsFor:{p50:a(.5),p90:a(.9),p99:a(.99)},probabilityWithinBudget:e=>{let t=Math.min(Math.max(0,Math.floor(e)),i.length-1);return m(i[t])}}}function ve(e,t){let n=H(e.pmf),r=Math.min(Math.max(0,Math.floor(t)),n.length-1);return 100*m(1-(r>0?n[r-1]:0))}function U(e,t=200){let n=H(e.pmf),r=e.pmf.length-1;for(;r>1&&n[r-1]>.9999;)r--;r=Math.min(e.pmf.length-1,r+2);let i=Math.max(1,Math.ceil(r/t)),a=[];for(let t=0;t<=r;t+=i)a.push({pulls:t,pmf:e.pmf[t],cdf:n[t]});return a}function ye(e,t,n){let r=t.pity;e.innerHTML=`
    <div class="workspace">
      <div>
        <section class="panel">
          <h2 class="panel-title">Pity configuration</h2>
          <p class="panel-subtitle">Soft pity ramps the rate linearly; hard pity guarantees a hit.</p>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-base">Base rate</label>
              <input type="text" id="pity-base" value="${W(r.baseRate)}" />
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
              <input type="text" id="pity-inc" value="${W(r.softPityIncrement)}" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label" for="pity-feat">Featured rate</label>
              <input type="text" id="pity-feat" value="${W(r.featuredRate)}" />
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
                <span class="preset-chip-name">${A(e.label)}</span>
                <span class="preset-chip-desc">${A(e.description)}</span>
              </button>`).join(``)}
          </div>
        </section>
      </div>
      <div id="pity-results"></div>
    </div>
  `;let i={base:e.querySelector(`#pity-base`),hard:e.querySelector(`#pity-hard`),soft:e.querySelector(`#pity-soft`),inc:e.querySelector(`#pity-inc`),feat:e.querySelector(`#pity-feat`),guar:e.querySelector(`#pity-guar`),pity0:e.querySelector(`#pity-pity0`),g0:e.querySelector(`#pity-g0`),target:e.querySelector(`#pity-target`),budget:e.querySelector(`#pity-budget`),actual:e.querySelector(`#pity-actual`)},a=e.querySelector(`#pity-results`);function o(e,t){let n=e.trim();if(n.endsWith(`%`)){let e=Number(n.slice(0,-1))/100;return Number.isFinite(e)?e:t}let r=Number(n);return Number.isFinite(r)?r:t}function s(){let e=Math.max(1,Math.floor(Number(i.hard.value)||1)),t={baseRate:Math.min(1,Math.max(0,o(i.base.value,r.baseRate))),hardPity:e,softPityStart:Math.min(e,Math.max(1,Math.floor(Number(i.soft.value)||1))),softPityIncrement:Math.max(0,o(i.inc.value,r.softPityIncrement)),featuredRate:Math.min(1,Math.max(0,o(i.feat.value,r.featuredRate))),hasGuarantee:i.guar.checked},n=Math.min(e-1,Math.max(0,Math.floor(Number(i.pity0.value)||0))),a=Math.max(1,Math.floor(Number(i.target.value)||1)),s=Math.max(0,Math.floor(Number(i.budget.value)||0)),c=Math.max(0,Math.floor(Number(i.actual.value)||0));return Object.assign(r,t,{pity:n,guaranteed:i.g0.checked,target:a,budget:s,actualPulls:c}),{config:t,pity0:n,target:a,budget:s,actualPulls:c}}n.registerCapture(()=>{s()});function c(){let{config:e,pity0:t,target:r,budget:o,actualPulls:c}=s(),l;try{l=ge(e,{pity:t,guaranteed:i.g0.checked},r)}catch(e){a.innerHTML=`<section class="panel"><p class="note">${A(e instanceof Error?e.message:`Invalid configuration.`)}</p></section>`;return}let u=_e(l),d=u.probabilityWithinBudget(o),f=ve(l,c),p=I(U(l,220).map(e=>({x:e.pulls,pmf:e.pmf,cdf:e.cdf})),`pulls`,[{x:u.pullsFor.p50,label:`50%`},{x:u.pullsFor.p90,label:`90%`},{x:u.pullsFor.p99,label:`99%`}]),m=N(f,`based on ${E(c)} pulls chasing ${r} cop${r===1?`y`:`ies`}`);a.innerHTML=`
      <section class="panel">
        <h2 class="panel-title">How lucky was my history?</h2>
        <p class="panel-subtitle">Computed from the exact pull-by-pull distribution, not a simulation.</p>
        ${m}
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-tile-label">Expected pulls</div>
            <div class="stat-tile-value">${D(u.expectedPulls,1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">Std. deviation</div>
            <div class="stat-tile-value">${D(u.stdDevPulls,1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">P(success within ${E(o)})</div>
            <div class="stat-tile-value">${k(d)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">50% by</div>
            <div class="stat-tile-value">${E(u.pullsFor.p50)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">90% by</div>
            <div class="stat-tile-value">${E(u.pullsFor.p90)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-label">99% by</div>
            <div class="stat-tile-value">${E(u.pullsFor.p99)}</div>
          </div>
        </div>
        <button type="button" class="btn btn-primary" id="pity-export" style="margin-top:16px;">Export luck card</button>
      </section>
      <section class="panel">
        <h2 class="panel-title">Distribution</h2>
        <p class="panel-subtitle">
          ${l.exact?`Exact — computed via dynamic programming over the pity Markov chain; the shown horizon is a true upper bound.`:`Not exactly bounded without the guarantee mechanic, so this truncates at a generous horizon (undistributed tail mass: ${k(l.tailMass,4)}).`}
        </p>
        <div class="chart-wrap">${p}</div>
      </section>
      <section class="panel">
        <details class="callout">
          <summary>Why can't I just use E[attempts] = 1/rate here?</summary>
          <p>Because the rate isn't constant. Once you're inside the soft-pity window the per-pull chance climbs every pull, and a lost 50/50 deterministically changes your next roll's odds. Both break the "memoryless" assumption that closed-form geometric/negative-binomial math relies on. This tool instead runs an exact dynamic-programming pass over the pity state machine (pity counter × guarantee flag × copies obtained) — see <a href="https://github.com/antonsoo/am-i-unlucky/blob/main/docs/MATH.md" target="_blank" rel="noopener">docs/MATH.md</a> for the derivation.</p>
        </details>
      </section>
    `,a.querySelector(`#pity-export`)?.addEventListener(`click`,()=>{n.openLuckCard({headline:`Took ${E(c)} pulls for ${r} cop${r===1?`y`:`ies`} under pity.`,percentile:f,modeLabel:`Pity system`,detail:`Expected ${D(u.expectedPulls,0)} pulls. P(success within ${E(o)}) = ${k(d)}.`})}),n.onStateChange()}let l=T(c,150,n.signal);Object.values(i).forEach(e=>{e.addEventListener(e.type===`checkbox`?`change`:`input`,l)}),e.querySelectorAll(`[data-preset]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=R.find(t=>t.id===e.dataset.preset);t&&(i.base.value=W(t.config.baseRate),i.hard.value=String(t.config.hardPity),i.soft.value=String(t.config.softPityStart),i.inc.value=W(t.config.softPityIncrement),i.feat.value=W(t.config.featuredRate),i.guar.checked=t.config.hasGuarantee,c())})}),c()}function W(e){return`${(e*100).toString()}%`}var G=1e9;function be(e){if(e.length>32)throw RangeError(`Use at most 32 items.`);if(e.some(e=>!Number.isFinite(e)||e<0||e>1))throw RangeError(`Every item rate must be a finite probability from 0% to 100%.`);if(p(e)>1+4*2**-52)throw RangeError(`Item rates must add up to at most 100%: one attempt can drop only one listed item.`)}function xe(e){if(!Number.isInteger(e)||e<0||e>1e9)throw RangeError(`Your attempt budget must be a whole number from 0 to ${G.toLocaleString(`en-US`)}.`)}function K(e,t,n,r){return new Promise((i,a)=>{let o,s,c=!1;function l(e,t){c||(c=!0,clearTimeout(s),n.removeEventListener(`abort`,u),o?.terminate(),e?i(e):a(t instanceof Error?t:Error(`Unable to complete this calculation.`)))}function u(){l(void 0,new DOMException(`Calculation cancelled.`,`AbortError`))}if(n.aborted){u();return}n.addEventListener(`abort`,u,{once:!0});try{o=e(),o.onmessage=e=>{l(e.data?.result,Error(e.data?.error??`The calculation returned no result. Try again.`))},o.onerror=e=>{e.preventDefault(),l(void 0,Error(`The calculator could not start. Check your connection and try again.`))},o.addEventListener(`messageerror`,()=>{l(void 0,Error(`The calculation could not be read. Try again.`))}),s=setTimeout(()=>{l(void 0,Error(r))},15e3),o.postMessage(t)}catch(e){l(void 0,e)}})}function Se(e,t){return K(()=>new Worker(new URL(`/am-i-unlucky/assets/collection-worker-BbphLwwp.js`,``+import.meta.url),{type:`module`}),e,t,`The calculation took too long. Try fewer items, then try again.`)}function Ce(e,t,n){let r=t.collection,i=0,a,o;function s(e){let t=`collection-item-${i++}`;return`<fieldset class="collection-item">
      <legend>Item</legend>
      <div class="collection-item-fields">
        <div class="field"><label class="field-label" for="${t}-name">Name</label>
          <input type="text" id="${t}-name" class="item-name" value="${A(e.name)}" maxlength="120" /></div>
        <div class="field"><label class="field-label" for="${t}-rate">Rate per attempt</label>
        <input type="text" id="${t}-rate" class="item-rate" value="${A(e.rate)}" placeholder="5% or 1/20" required /></div>
        <button type="button" class="item-remove" aria-label="Remove item" title="Remove item">&#215;</button>
      </div>
    </fieldset>`}e.innerHTML=`<div class="workspace collection-workspace">
    <div>
      <section class="panel">
        <div class="field"><label class="field-label" for="coll-n">Attempt budget</label>
          <input type="number" id="coll-n" value="${r.n}" min="0" max="${G}" step="1" required /></div>
        <p id="collection-total" class="field-note"></p>
        <button type="button" class="btn btn-ghost btn-block collection-jump">View results</button>
      </section>
      <section class="panel">
        <h2 class="panel-title">Items you still need</h2>
        <p class="panel-subtitle">One listed item at most per attempt. Collect one of each; duplicates don't help.</p>
        <div id="item-rows">${r.items.map(s).join(``)}</div>
        <button type="button" class="btn btn-ghost btn-block" id="add-item">+ Add item</button>
        <p class="field-note">Up to 32 items. Already own one? Leave it out of this list.</p>
      </section>
      <section class="panel collection-assumptions">
        <h2 class="panel-title">How drops are counted</h2>
        <p>Attempts are independent, with fixed rates and no pity. Item outcomes within one attempt are mutually exclusive, so their rates must total at most 100%.</p>
        <p>The remaining chance covers everything outside this list, including no drop. Owned items and duplicates still consume an attempt. Separate rolls that can drop several listed items at once are not modeled here.</p>
      </section>
    </div>
    <div><p id="collection-status" class="field-note" role="status" aria-live="polite"></p>
      <div id="collection-results" role="region" aria-label="Collection results" tabindex="-1" aria-busy="false"></div></div>
  </div>`;let c=e.querySelector(`#item-rows`),l=e.querySelector(`#add-item`),u=e.querySelector(`#coll-n`),d=e.querySelector(`#collection-results`),f=e.querySelector(`#collection-status`),m=e.querySelector(`#collection-total`);e.querySelector(`.collection-jump`).addEventListener(`click`,()=>{d.focus({preventScroll:!0}),d.scrollIntoView({block:`start`})});let h=e=>e>=1e10?e.toExponential(3):D(e,2);function g(e,t){let n=e.simulation,r=e.possible?e.expectedAttempts===null?e.analytic?`Beyond numeric range`:`Not estimated`:h(e.expectedAttempts):`Not reachable`,i=e.belowResolution?`&lt;0.01%`:A(k(e.probability)),a=e.probabilityInterval,o=e.points.at(-1),s=e.agreement===null?``:e.agreement?`The calculated mean is inside this simulation's interval.`:`The calculated mean is outside this simulation's interval. A 95% interval can miss; agreement is not guaranteed.`;d.innerHTML=`<section class="panel">
      <h2 class="panel-title">Completing your collection</h2>
      <p class="panel-subtitle">${e.analytic?`Calculated from the drop table`:`Simulation estimate for ${t.probabilities.length} items`}. ${t.probabilities.length} distinct ${t.probabilities.length===1?`item`:`items`} needed.</p>
      <div class="time-budget">
        <div class="stat-tile-label">${e.analytic||!e.possible?`Chance`:`Estimated chance`} within ${E(t.n)} attempts</div>
        <div class="time-budget-value" data-testid="collection-chance">${i}</div>
        <p>${a?`Approximate 95% interval: ${A(k(a[0],3))} to ${A(k(a[1],3))}.`:`Chance of having every listed item by this attempt budget.`}</p>
      </div>
      <div class="stat-grid"><div class="stat-tile">
        <div class="stat-tile-label">${e.analytic?`Expected`:`Estimated mean`} attempts</div>
        <div class="stat-tile-value" data-testid="collection-mean">${r}</div>
      </div></div>
      ${e.possible?`<p class="field-note">The mean is an average over repeated collections, not a deadline or a guarantee. Percentages are rounded.</p>`:`<p class="note">At least one item has a 0% rate. The full set cannot be completed with these inputs.</p>`}
      ${e.belowResolution?`<p class="note">Completion is possible, but the chance is below displayed precision. Extremely small probabilities may also fall below numerical resolution.</p>`:``}
      ${e.analytic?``:`<p class="note">Exact calculations support up to 16 items. This larger set uses ${E(n.trials)} seeded simulation runs; its headline numbers and chart are estimates.</p>`}
    </section>
    ${e.possible?`<section class="panel">
      <h2 class="panel-title">When you could finish</h2>
      <div class="chart-wrap">${I(e.points,`attempts`,[{x:t.n,label:`budget`}])}</div>
      <p class="field-note">${e.analytic?`Calculated distribution.`:`Empirical distribution from the same simulation.`} Shading shows completion probability in each plotted interval; the gold line joins cumulative chances. ${o?`Through ${E(o.x)} attempts: ${e.analytic?``:`estimated `}${A(k(o.cdf))} of collections complete.`:``}</p>
      ${o?.x===1e9?`<p class="note">The chart stops at ${E(G)} attempts. Outcomes beyond that limit are not shown.</p>`:``}
    </section>
    <section class="panel">
      <h2 class="panel-title">${e.analytic?`Simulation cross-check`:`Simulation evidence`}</h2>
      <p class="panel-subtitle">${e.analytic?`A separate, seeded simulation checks the calculated mean.`:`Seeded simulation of the same one-item-per-attempt model.`}</p>
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-tile-label">Completed runs</div><div class="stat-tile-value" data-testid="collection-completed">${E(n.sampleSize)} / ${E(n.trials)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">Simulated mean</div><div class="stat-tile-value" data-testid="collection-sim-mean">${n.mean===null?`Not estimated`:h(n.mean)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">Approx. 95% mean interval</div><div class="stat-tile-value" data-testid="collection-interval">${n.ci95===null?`Unavailable`:`${h(n.ci95[0])} to ${h(n.ci95[1])}`}</div></div>
      </div>
      ${n.censored?`<p class="note">${E(n.censored)} runs reached the ${E(n.maxAttemptsPerRun)}-attempt limit without completing. The mean and its interval are withheld: averaging only completed runs would understate the wait.</p>`:`<p class="field-note">The interval uses a normal approximation for the mean across runs; it is not a range containing 95% of individual completion times.</p>`}
      <p class="note" data-testid="collection-agreement">${s}</p>
    </section>`:``}`}async function _(){if(!o||n.signal.aborted)return;let e=o;a?.abort();let t=new AbortController;a=t;try{let r=await Se(e,t.signal);if(t.signal.aborted||n.signal.aborted)return;g(r,e),f.textContent=`Collection updated.`}catch(e){if(t.signal.aborted||n.signal.aborted)return;d.innerHTML=`<section class="panel"><p class="note">${A(e instanceof Error?e.message:`Unable to calculate this collection.`)}</p><button type="button" class="btn btn-ghost" id="collection-retry">Try again</button></section>`,d.querySelector(`#collection-retry`).addEventListener(`click`,y),f.textContent=`The collection could not be calculated.`}finally{a===t&&(a=void 0,d.setAttribute(`aria-busy`,`false`))}}let v=T(()=>{_()},150,n.signal);function y(){a?.abort(),a=void 0,v.cancel(),o=void 0;let t=Array.from(c.querySelectorAll(`.collection-item`));r.items=t.map(e=>({name:e.querySelector(`.item-name`).value,rate:e.querySelector(`.item-rate`).value})),r.n=u.valueAsNumber,m.textContent=``;let i=e=>{e.setAttribute(`aria-invalid`,`true`),e.setAttribute(`aria-describedby`,`collection-error`)};e.querySelectorAll(`input`).forEach(e=>{e.removeAttribute(`aria-invalid`),e.removeAttribute(`aria-describedby`),e.validity.valid||i(e)});try{let e=r.items.map((e,n)=>{try{return C(e.rate)}catch(e){throw i(t[n].querySelector(`.item-rate`)),e}});if(p(e)>1+4*2**-52&&t.forEach(e=>i(e.querySelector(`.item-rate`))),be(e),xe(r.n),!e.length)throw RangeError(`Add at least one item.`);let a=Math.min(1,p(e));m.textContent=`${k(a)} listed items; ${k(1-a)} other outcomes per attempt.`,o={probabilities:e,n:r.n},n.setShareEnabled(!0),n.onStateChange(),d.innerHTML=`<section class="panel"><p class="note">Calculating your collection...</p></section>`,d.setAttribute(`aria-busy`,`true`),f.textContent=`Updating collection...`,v()}catch(e){n.setShareEnabled(!1),d.setAttribute(`aria-busy`,`false`),d.innerHTML=`<section class="panel"><p class="note" id="collection-error">${A(e instanceof Error?e.message:`Check your inputs.`)}</p></section>`,f.textContent=`Check the inputs to calculate and share this collection.`}}function b(){let e=Array.from(c.querySelectorAll(`.collection-item`));e.forEach((t,n)=>{t.querySelector(`legend`).textContent=`Item ${n+1}`;let r=t.querySelector(`.item-remove`);r.disabled=e.length<=1,r.setAttribute(`aria-label`,`Remove item ${n+1}`)}),l.disabled=e.length>=32}function x(e){e.querySelectorAll(`input`).forEach(e=>e.addEventListener(`input`,y)),e.querySelector(`.item-remove`).addEventListener(`click`,()=>{if(c.children.length<=1)return;let t=e.nextElementSibling??e.previousElementSibling;e.remove(),b(),t?.querySelector(`.item-name`)?.focus(),y()})}c.querySelectorAll(`.collection-item`).forEach(x),l.addEventListener(`click`,()=>{if(c.children.length>=32)return;c.insertAdjacentHTML(`beforeend`,s({name:`Item ${c.children.length+1}`,rate:`1%`}));let e=c.lastElementChild;x(e),b(),e.querySelector(`.item-name`).focus(),y()}),u.addEventListener(`input`,y),n.signal.addEventListener(`abort`,()=>{a?.abort()},{once:!0}),b(),y()}var q=1e6,J=1e9;function we(e){if(e.length>12)throw RangeError(`Use at most 12 attempt sources.`);return e.map(e=>{let t=`runsPerDay`in e?{name:e.name,p:e.p,attempts:e.runsPerDay,everyDays:1}:{...e},{p:n,attempts:r,everyDays:i}=t;if(!Number.isFinite(n)||n<0||n>1)throw RangeError(`Each drop rate must be between 0 and 100%.`);if(!Number.isSafeInteger(r)||r<0||r>1e6)throw RangeError(`Attempts must be whole numbers from 0 to ${q.toLocaleString(`en-US`)}. For weekly attempts, choose Weekly instead of a fractional daily rate.`);if(i!==1&&i!==7)throw RangeError(`Choose a Daily or Weekly schedule for every source.`);return t})}function Te(e){let{k:t}=e;if(!Number.isInteger(t)||t<1||t>100)throw RangeError(`Copies needed must be a whole number from 1 to 100.`);return we(e.sources)}function Ee(e,t){return K(()=>new Worker(new URL(`/am-i-unlucky/assets/time-worker-Bh4ozt13.js`,``+import.meta.url),{type:`module`}),e,t,`The calculation took too long. Try fewer sources or copies, then try again.`)}function De(e){if(!Number.isInteger(e)||e<0||e>1e9)throw RangeError(`Your day budget must be a whole number from 0 to ${J.toLocaleString(`en-US`)}.`)}function Oe(e,t,n){let r=t.time,i=0,a,o;function s(e){let t=`time-source-${i++}`;return`<fieldset class="time-source">
      <legend>Attempt source</legend>
      <div class="time-source-heading">
        <div class="field">
          <label class="field-label" for="${t}-name">Name</label>
          <input type="text" id="${t}-name" class="src-name" maxlength="120" value="${A(e.name)}" />
        </div>
        <button type="button" class="item-remove" aria-label="Remove source" title="Remove source">&#215;</button>
      </div>
      <div class="time-source-fields">
        <div class="field">
          <label class="field-label" for="${t}-rate">Rate per attempt</label>
          <input type="text" id="${t}-rate" class="src-rate" value="${A(e.rate)}" placeholder="2% or 1/50" required />
        </div>
        <div class="field">
          <label class="field-label" for="${t}-attempts">Attempts per batch</label>
          <input type="number" id="${t}-attempts" class="src-attempts" value="${e.attempts}" min="0" max="${q}" step="1" required />
        </div>
        <div class="field time-source-schedule">
          <label class="field-label" for="${t}-schedule">Schedule</label>
          <select id="${t}-schedule" class="src-schedule">
            ${e.everyDays!==1&&e.everyDays!==7?`<option value="${e.everyDays}" selected>Unsupported schedule (${e.everyDays} days)</option>`:``}
            <option value="1" ${e.everyDays===1?`selected`:``}>Daily</option>
            <option value="7" ${e.everyDays===7?`selected`:``}>Weekly</option>
          </select>
          <p class="field-note src-timing"></p>
        </div>
      </div>
    </fieldset>`}e.innerHTML=`<div class="workspace time-workspace">
    <div>
      <section class="panel">
        <h2 class="panel-title">Attempt sources</h2>
        <p class="panel-subtitle">Every successful attempt adds a copy, including several in the same batch.</p>
        <div id="source-rows">${r.sources.map(s).join(``)}</div>
        <button type="button" class="btn btn-ghost btn-block" id="add-source">+ Add source</button>
        <p class="field-note">Up to 12 sources; whole attempts only.</p>
      </section>
      <section class="panel">
        <h2 class="panel-title">Your goal</h2>
        <div class="field-row">
          <div class="field">
            <label class="field-label" for="time-k">Copies needed</label>
            <input type="number" id="time-k" min="1" max="100" step="1" value="${r.k}" required />
          </div>
          <div class="field">
            <label class="field-label" for="time-days">Day budget</label>
            <input type="number" id="time-days" min="0" max="${J}" step="1" value="${r.days}" required />
          </div>
        </div>
      </section>
      <section class="panel time-assumptions">
        <h2 class="panel-title">How days are counted</h2>
        <p>Start before day 1. Daily batches finish at each day's end. Weekly batches finish on days 7, 14, 21, and so on.</p>
        <p>Attempts are independent, with fixed rates and no pity. All scheduled batches are completed. Reset offsets and time within a day are not modeled.</p>
      </section>
    </div>
    <div>
      <p id="time-status" class="field-note" role="status" aria-live="polite"></p>
      <div id="time-results" aria-busy="false"></div>
    </div>
  </div>`;let c=e.querySelector(`#source-rows`),l=e.querySelector(`#add-source`),u=e.querySelector(`#time-k`),d=e.querySelector(`#time-days`),f=e.querySelector(`#time-results`),p=e.querySelector(`#time-status`),m=e=>e===null?`Over ${E(J)} days`:Number.isFinite(e)?`${E(e)} ${e===1?`day`:`days`}`:`Not reachable`;function h(e,t){let{k:n}=t.input,r=e.points.at(-1),i=e.daysFor.p99===null?`<p class="note">The 99% milestone is beyond ${E(J)} days, this calculator's search limit. That does not mean the drop is impossible.</p>`:``,a=e.possible?I(e.points.map(e=>({x:e.n,pmf:e.pmf,cdf:e.cdf})),`completed days`,Object.entries(e.daysFor).flatMap(([e,t])=>t!==null&&Number.isFinite(t)?[{x:t,label:`${e.slice(1)}%`}]:[])):``,o=e.expectedDays===null?`Beyond numeric range`:e.possible?re(e.expectedDays):`Not reachable`;f.innerHTML=`<section class="panel">
      <h2 class="panel-title">Your schedule</h2>
      <p class="panel-subtitle">Collect ${E(n)} ${n===1?`copy`:`copies`} from ${t.input.sources.length} ${t.input.sources.length===1?`source`:`sources`}.</p>
      <div class="time-budget">
        <div class="stat-tile-label">Chance within ${E(t.days)} ${t.days===1?`day`:`days`}</div>
        <div class="time-budget-value" data-testid="budget-chance">${k(e.probabilityWithinBudget)}</div>
        <p>Chance of collecting ${n===1?`your copy`:`all ${E(n)} copies`} by the end of that day.</p>
      </div>
      ${e.possible?``:`<p class="note">No source has both a positive drop rate and any scheduled attempts. This goal cannot be reached with these inputs.</p>`}
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-tile-label">Expected time (mean)</div><div class="stat-tile-value" data-testid="expected-days">${o}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">50% by</div><div class="stat-tile-value" data-testid="p50">${m(e.daysFor.p50)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">90% by</div><div class="stat-tile-value" data-testid="p90">${m(e.daysFor.p90)}</div></div>
        <div class="stat-tile"><div class="stat-tile-label">99% by</div><div class="stat-tile-value" data-testid="p99">${m(e.daysFor.p99)}</div></div>
      </div>
      <p class="field-note">The mean is an average over repeated outcomes. Each percentage marks the first whole day reaching that chance, not a guarantee.</p>
      ${i}
    </section>
    ${e.possible?`<section class="panel">
      <h2 class="panel-title">When you could finish</h2>
      <div class="chart-wrap">${a}</div>
      <p class="field-note">Shading shows the probability of finishing in each plotted day interval. The gold line joins cumulative probabilities at interval ends. ${r?`The chart covers ${k(r.cdf)} of outcomes through day ${E(r.n)}.`:``}</p>
    </section>`:``}`}async function g(){if(!o||n.signal.aborted)return;let e=o;a?.abort();let t=new AbortController;a=t;try{let r=await Ee(e,t.signal);if(t.signal.aborted||n.signal.aborted)return;h(r,e),p.textContent=`Estimate updated.`}catch(e){if(t.signal.aborted||n.signal.aborted)return;f.innerHTML=`<section class="panel"><p class="note">${A(e instanceof Error?e.message:`Unable to calculate this schedule.`)}</p><button type="button" class="btn btn-ghost" id="time-retry">Try again</button></section>`,f.querySelector(`#time-retry`).addEventListener(`click`,()=>{v()}),p.textContent=`The estimate could not be calculated.`}finally{a===t&&(a=void 0,f.setAttribute(`aria-busy`,`false`))}}let _=T(()=>{g()},150,n.signal);function v(){a?.abort(),a=void 0,_.cancel(),o=void 0,r.sources=Array.from(c.querySelectorAll(`.time-source`)).map(e=>({name:e.querySelector(`.src-name`).value,rate:e.querySelector(`.src-rate`).value,attempts:e.querySelector(`.src-attempts`).valueAsNumber,everyDays:Number(e.querySelector(`.src-schedule`).value)})),r.k=u.valueAsNumber,r.days=d.valueAsNumber,c.querySelectorAll(`.time-source`).forEach((e,t)=>{let n=r.sources[t].everyDays;e.querySelector(`.src-timing`).textContent=n===1||n===7?`First batch finishes on day ${n}.`:`Choose Daily or Weekly.`});function t(e){e.setAttribute(`aria-invalid`,`true`),e.setAttribute(`aria-describedby`,`time-error`)}e.querySelectorAll(`input, select`).forEach(e=>{e.removeAttribute(`aria-invalid`),e.removeAttribute(`aria-describedby`),e.validity.valid||t(e)});try{let e=Array.from(c.querySelectorAll(`.time-source`)),i={sources:r.sources.map((n,r)=>{let i;try{i=C(n.rate)}catch(n){throw t(e[r].querySelector(`.src-rate`)),n}return n.everyDays!==1&&n.everyDays!==7&&t(e[r].querySelector(`.src-schedule`)),{name:n.name,p:i,attempts:n.attempts,everyDays:n.everyDays}}),k:r.k};Te(i),De(r.days),o={input:i,days:r.days},n.setShareEnabled(!0),n.onStateChange(),f.innerHTML=`<section class="panel"><p class="note">Calculating your schedule...</p></section>`,f.setAttribute(`aria-busy`,`true`),p.textContent=`Updating estimate...`,_()}catch(e){n.setShareEnabled(!1),f.setAttribute(`aria-busy`,`false`),f.innerHTML=`<section class="panel"><p class="note" id="time-error">${A(e instanceof Error?e.message:`Check your inputs.`)}</p></section>`,p.textContent=`Check the inputs to calculate and share this schedule.`}}function y(){let e=Array.from(c.querySelectorAll(`.time-source`));e.forEach((t,n)=>{t.querySelector(`legend`).textContent=`Source ${n+1}`;let r=t.querySelector(`.item-remove`);r.disabled=e.length<=1,r.setAttribute(`aria-label`,`Remove source ${n+1}`)}),l.disabled=e.length>=12}function b(e){e.querySelectorAll(`input`).forEach(e=>e.addEventListener(`input`,v)),e.querySelector(`select`).addEventListener(`change`,v),e.querySelector(`.item-remove`).addEventListener(`click`,()=>{if(c.children.length<=1)return;let t=e.nextElementSibling??e.previousElementSibling;e.remove(),y(),t?.querySelector(`.src-name`)?.focus(),v()})}c.querySelectorAll(`.time-source`).forEach(b),l.addEventListener(`click`,()=>{if(c.children.length>=12)return;c.insertAdjacentHTML(`beforeend`,s({name:`Source ${c.children.length+1}`,rate:`1%`,attempts:1,everyDays:1}));let e=c.lastElementChild;b(e),y(),e.querySelector(`.src-name`).focus(),v()}),u.addEventListener(`input`,v),d.addEventListener(`input`,v),n.signal.addEventListener(`abort`,()=>{a?.abort()},{once:!0}),y(),v()}var Y=1080,X=1350,ke={common:`#3a3f55`,uncommon:`#0f3d2c`,rare:`#0f2b57`,epic:`#3b1259`,legendary:`#5a3c06`};function Ae(e,t,n,r,i,a){e.beginPath(),e.moveTo(t+a,n),e.arcTo(t+r,n,t+r,n+i,a),e.arcTo(t+r,n+i,t,n+i,a),e.arcTo(t,n+i,t,n,a),e.arcTo(t,n,t+r,n,a),e.closePath()}function je(e,t){e.width=Y,e.height=X;let n=e.getContext(`2d`);if(!n)return;let{tier:r,direction:i}=j(t.percentile),a=ae[r],o=ke[r];n.fillStyle=`#0f1120`,n.fillRect(0,0,Y,X);let s=n.createRadialGradient(Y/2,X*.36,40,Y/2,X*.36,Y*.85);s.addColorStop(0,o),s.addColorStop(1,`#0f1120`),n.fillStyle=s,n.fillRect(0,0,Y,X),n.strokeStyle=a,n.lineWidth=6,Ae(n,40,40,1e3,1270,36),n.stroke(),n.fillStyle=`#aab0d6`,n.font=`600 30px 'IBM Plex Mono', monospace`,n.textAlign=`center`,n.fillText(`AM I UNLUCKY?`,Y/2,160),n.fillStyle=`#848aad`,n.font=`500 26px 'IBM Plex Mono', monospace`,n.fillText(t.modeLabel.toUpperCase(),Y/2,200),n.font=`800 64px 'Bricolage Grotesque', sans-serif`,n.fillStyle=a,n.fillText(r.toUpperCase(),Y/2,330),n.font=`700 220px 'IBM Plex Mono', monospace`,n.fillStyle=`#f5f6fb`;let c=`${Math.round(t.percentile)}%`;n.fillText(c,Y/2,620),n.font=`500 42px 'IBM Plex Sans', sans-serif`,n.fillStyle=`#edeffb`,Z(n,t.headline,Y/2,760,880,52),n.font=`600 30px 'IBM Plex Mono', monospace`,n.fillStyle=`#aab0d6`,n.fillText(M(r,i).toLowerCase(),Y/2,900),n.font=`400 28px 'IBM Plex Sans', sans-serif`,n.fillStyle=`#8288a3`,Z(n,t.detail,Y/2,1010,860,38),n.font=`500 26px 'IBM Plex Mono', monospace`,n.fillStyle=`#565b78`,n.fillText(`am-i-unlucky — exact drop-rate & pity math`,Y/2,1260)}function Z(e,t,n,r,i,a){let o=t.split(` `),s=``,c=r,l=[];for(let t of o){let n=s.length>0?`${s} ${t}`:t;e.measureText(n).width>i&&s.length>0?(l.push(s),s=t):s=n}s.length>0&&l.push(s);for(let t of l.slice(0,3))e.fillText(t,n,c),c+=a}var Me=[{id:`simple`,label:`Simple drop`,key:`1`},{id:`pity`,label:`Pity system`,key:`2`},{id:`collection`,label:`Collection`,key:`3`},{id:`time`,label:`Time to drop`,key:`4`}],Ne={simple:{title:`Am I unlucky?`,body:`Plug in a fixed drop rate and see exactly how unlucky (or lucky) your run really was — computed from the true negative-binomial distribution, not a rule of thumb.`},pity:{title:`Pity system calculator`,body:`Soft pity, hard pity, and 50/50 guarantees make the odds path-dependent. This runs an exact dynamic-programming pass over the pity state machine instead of a simulation.`},collection:{title:`Collection completion`,body:`Plan a collection where each attempt drops at most one item. Check your chance of finishing within a budget, with calculated odds and visible simulation evidence.`},time:{title:`Time to drop`,body:`Plan daily and weekly attempts. See your chance of collecting every copy before your deadline.`}};function Pe(){try{let e=localStorage.getItem(`aiu-theme`);(e===`light`||e===`dark`)&&(document.documentElement.dataset.theme=e)}catch{}}var Fe=`<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/>`,Ie=`<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5Z"/>`;function Q(){let e=document.documentElement.dataset.theme,t=window.matchMedia(`(prefers-color-scheme: dark)`).matches;return e?e===`dark`:t}function $(){let e=document.querySelector(`#theme-btn svg`);e&&(e.innerHTML=Q()?Ie:Fe)}function Le(){let e=Q()?`light`:`dark`;document.documentElement.dataset.theme=e;try{localStorage.setItem(`aiu-theme`,e)}catch{}$()}function Re(){let e=document.getElementById(`app`);return e.innerHTML=`
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
        <p>Calculated odds for supported models; simulation estimates are labeled. See <a href="https://github.com/antonsoo/am-i-unlucky/blob/main/docs/MATH.md" target="_blank" rel="noopener">docs/MATH.md</a> for derivations. MIT licensed — <a href="https://github.com/antonsoo/am-i-unlucky" target="_blank" rel="noopener">source on GitHub</a>.</p>
      </footer>
    </div>
    <div class="sr-live" role="status" aria-live="polite" id="live-region"></div>
  `,{app:e,tabsEl:document.getElementById(`mode-tabs`),mainEl:document.getElementById(`main-content`),liveEl:document.getElementById(`live-region`)}}function ze(e){let t=document.createElement(`div`);t.className=`modal-backdrop`,t.innerHTML=`
    <div class="modal" role="dialog" aria-modal="true" aria-label="Luck card">
      <h2>Your luck card</h2>
      <canvas id="luck-card-canvas" width="1080" height="1350"></canvas>
      <div class="modal-actions">
        <button type="button" class="btn btn-primary btn-block" id="download-card">Download PNG</button>
        <button type="button" class="btn btn-ghost" id="close-card">Close</button>
      </div>
    </div>
  `,document.body.appendChild(t);let n=t.querySelector(`#luck-card-canvas`);je(n,e);let r=document.activeElement,i=t.querySelector(`#download-card`),a=t.querySelector(`#close-card`);i.focus();function o(){t.remove(),document.removeEventListener(`keydown`,s),r?.focus()}function s(e){if(e.key===`Escape`){o();return}e.key===`Tab`&&(e.preventDefault(),(document.activeElement===i?a:i).focus())}document.addEventListener(`keydown`,s),t.addEventListener(`click`,e=>{e.target===t&&o()}),a.addEventListener(`click`,o),i.addEventListener(`click`,()=>{let e=document.createElement(`a`);e.download=`am-i-unlucky-luck-card.png`,e.href=n.toDataURL(`image/png`),e.click()})}function Be(){Pe();let{tabsEl:e,mainEl:n,liveEl:r}=Re(),i=s(window.location.search),a,o,c=T(e=>{let t=`${window.location.pathname}?${e}`;window.history.replaceState(null,``,t)},300);function l(n){n!==i.mode&&(i.mode=n,u(),d(),c(t(i)),e.querySelector(`[data-mode="${n}"]`)?.focus())}function u(){e.innerHTML=Me.map((e,t)=>`
      <button type="button" id="tab-${e.id}" class="mode-tab" role="tab" aria-selected="${e.id===i.mode}"
        aria-controls="mode-mount" tabindex="${e.id===i.mode?`0`:`-1`}" data-mode="${e.id}" data-index="${t}">
        ${e.label} <span class="tab-key">${e.key}</span>
      </button>`).join(``);let t=Array.from(e.querySelectorAll(`.mode-tab`));t.forEach(e=>{e.addEventListener(`click`,()=>{l(e.dataset.mode)}),e.addEventListener(`keydown`,n=>{let r=Number(e.dataset.index);if([`ArrowRight`,`ArrowLeft`,`Home`,`End`].includes(n.key)){n.preventDefault();let e=n.key===`ArrowRight`?1:-1,i=t[n.key===`Home`?0:n.key===`End`?t.length-1:(r+e+t.length)%t.length];l(i.dataset.mode)}})}),e.querySelector(`[aria-selected="true"]`)?.scrollIntoView({block:`nearest`,inline:`nearest`})}function d(){o?.(),o=void 0,a?.abort(),a=new AbortController;let e=a.signal,r=document.getElementById(`share-btn`);r.disabled=!1;let s=Ne[i.mode];n.innerHTML=`
      <div class="intro">
        <h1>${s.title}</h1>
        <p>${s.body}</p>
      </div>
      <div id="mode-mount" role="tabpanel" aria-labelledby="tab-${i.mode}" tabindex="-1"></div>
    `;let l=document.getElementById(`mode-mount`),u={signal:e,registerCapture:e=>{o=e},setShareEnabled:t=>{e.aborted||(r.disabled=!t)},onStateChange:()=>{e.aborted||c(t(i))},openLuckCard:ze};switch(i.mode){case`simple`:fe(l,i,u);break;case`pity`:ye(l,i,u);break;case`collection`:Ce(l,i,u);break;case`time`:Oe(l,i,u)}}$(),document.getElementById(`theme-btn`).addEventListener(`click`,Le),document.getElementById(`share-btn`).addEventListener(`click`,()=>{o?.();let e=t(i),n=`${window.location.origin}${window.location.pathname}?${e}`;(async()=>{try{await navigator.clipboard.writeText(n),r.textContent=`Link copied to clipboard.`}catch{let e=document.createElement(`dialog`);e.className=`modal share-dialog`,e.setAttribute(`aria-labelledby`,`share-title`),e.innerHTML=`<h2 id="share-title">Copy your link</h2>
          <p>Automatic copying is unavailable. Select and copy the link below.</p>
          <div class="field"><label class="field-label" for="share-url">Shareable link</label><input id="share-url" type="text" readonly /></div>
          <button type="button" class="btn btn-primary">Close</button>`,document.body.appendChild(e);let t=e.querySelector(`input`);t.value=n,e.addEventListener(`close`,()=>{e.remove(),document.getElementById(`share-btn`).focus()},{once:!0}),e.querySelector(`button`).addEventListener(`click`,()=>{e.close()}),e.showModal(),t.focus(),t.select()}})()}),window.addEventListener(`popstate`,()=>{c.cancel(),i=s(window.location.search),u(),d()}),u(),d()}Be();
//# sourceMappingURL=index-CgWft33o.js.map