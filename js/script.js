// --- Dark Mode Chart Config ---
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = '#1e293b';
Chart.defaults.font.family = "'JetBrains Mono', monospace";

// --- Math Engine ---
let mathChart = null;
function calcScore(C, U, l, t) { return C * Math.log2(1+U) * Math.exp(-l*t); }

function updateMath() {
    const C = parseFloat(document.getElementById('input-c').value);
    const U = parseFloat(document.getElementById('input-u').value);
    const l = parseFloat(document.getElementById('input-l').value);

    document.getElementById('disp-c').innerText = C;
    document.getElementById('disp-u').innerText = U;
    document.getElementById('disp-l').innerText = l;
    document.getElementById('score-result').innerText = calcScore(C,U,l,10).toFixed(3);

    const labels = Array.from({length:25}, (_,i)=>i*2);
    mathChart.data.labels = labels;
    mathChart.data.datasets[0].data = labels.map(t=>calcScore(C,U,l,t));
    mathChart.data.datasets[1].data = labels.map(t=>calcScore(0.5,0,l,t));
    mathChart.update();
}

// --- Simulation ---
let memory = [];
const SIM_CAP = 12;
let tStep = 0;
let nextId = 1000;
const facts = ["Project: Active", "IP: 10.0.0.1", "Env: Prod", "User: Admin", "Backup: On", "Rate: 100/s"];

function log(msg, type='info') {
    const el = document.getElementById('sim-log');
    const c = type === 'success' ? 'text-emerald-400' : type === 'warn' ? 'text-amber-400' : type === 'err' ? 'text-red-400' : 'text-slate-400';
    el.innerHTML = `<div class="${c} font-mono text-[10px]">> [T${tStep}] ${msg}</div>` + el.innerHTML;
}

function renderSim() {
    const grid = document.getElementById('memory-grid');
    document.getElementById('mem-count').innerText = memory.length;

    if(memory.length===0) {
        grid.innerHTML = `<div class="col-span-full h-full flex flex-col items-center justify-center text-slate-700 opacity-50"><i class="fa-solid fa-database text-4xl mb-2"></i><span class="text-xs font-mono">BUFFER_EMPTY</span></div>`;
        return;
    }

    grid.innerHTML = '';
    [...memory].sort((a,b)=>b.score-a.score).forEach(m => {
        const dying = m.score < 0.2;
        const fresh = m.id === nextId-1;
        let bg = dying ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-800 border-slate-700';
        if(fresh) bg = 'bg-cyan-900/20 border-cyan-500 active-memory';

        grid.innerHTML += `
            <div class="${bg} p-3 rounded border flex flex-col justify-between h-24 transition-all">
                <div>
                    <div class="flex justify-between text-[9px] text-slate-500 font-mono mb-1">
                        <span>ID:${m.id}</span>
                        <span class="${dying?'text-red-500':'text-cyan-500'}">${m.score.toFixed(2)}</span>
                    </div>
                    <div class="text-xs text-slate-200 font-bold leading-tight">${m.text}</div>
                </div>
                <div class="w-full bg-slate-700 h-1 rounded overflow-hidden">
                    <div class="h-full ${dying?'bg-red-500':'bg-cyan-400'}" style="width:${Math.min(100, m.score*60)}%"></div>
                </div>
            </div>`;
    });
}

function simAddFact() {
    if(memory.length >= SIM_CAP) {
        memory.sort((a,b)=>a.score-b.score);
        const rm = memory.shift();
        log(`Evicted ID:${rm.id} (Score:${rm.score.toFixed(2)})`, 'err');
    }
    const txt = facts[Math.floor(Math.random()*facts.length)];
    const item = { id: nextId++, text: txt, C:0.8, U:0, t:tStep, score:0 };
    item.score = calcScore(0.8, 0, 0.05, 0);
    memory.push(item);
    log(`Ingested ID:${item.id}`, 'success');
    renderSim();
}

function simAdvance() {
    tStep += 5;
    memory.forEach(m => m.score = calcScore(m.C, m.U, 0.05, tStep - m.t));
    log(`Time advanced +5`, 'info');
    renderSim();
}

function simQuery() {
    if(memory.length===0) return;
    const m = memory[Math.floor(Math.random()*memory.length)];
    m.U++; m.t = tStep; m.C = Math.min(1, m.C+0.1);
    m.score = calcScore(m.C, m.U, 0.05, 0);
    log(`Queried ID:${m.id}. Utility boosted.`, 'success');
    renderSim();
}

function simConflict() {
    simAddFact();
    const el = document.getElementById('sim-container');
    el.style.borderColor = '#ef4444';
    setTimeout(()=> el.style.borderColor='', 500);
    log('⚠️ CONFLICT DETECTED', 'warn');
}

function simClearLog() { document.getElementById('sim-log').innerHTML = ''; }



// --- Charts ---
let evChart = null;
const chartData = {
    accuracy: { l:['SCTM', 'Recency', 'LRU', 'Naive'], d:[90.1, 80.3, 51.2, 34.7], c:['#22d3ee', '#94a3b8', '#64748b', '#ef4444'], t:'bar', s:'90.1%', delta:'+15.3%' },
    noise: { l:['SCTM', 'Recency', 'LRU', 'Naive'], d:[94.8, 67.3, 39.2, 31.5], c:['#22d3ee', '#94a3b8', '#ef4444', '#64748b'], t:'bar', s:'94.8%', delta:'+27.5%' },
    growth: { l:['Start','100','200','300'], ds:[{label:'SCTM', data:[50,50,50,50], borderColor:'#22d3ee'}, {label:'Naive', data:[50,150,350,468], borderColor:'#ef4444', borderDash:[5,5]}], t:'line', s:'50 Slots', delta:'Constant' }
};

function switchChart(key) {
    const d = chartData[key];
    ['accuracy','noise','growth'].forEach(k=> document.getElementById(`tab-${k}`).className = 'px-4 py-2 text-sm rounded-md text-slate-400 hover:text-white transition');
    document.getElementById(`tab-${key}`).className = 'px-4 py-2 text-sm rounded-md bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 font-medium transition';

    document.getElementById('stat-main').innerText = d.s;
    document.getElementById('stat-delta').innerText = d.delta;

    // List
    const list = document.getElementById('ranking-list');
    list.innerHTML = '';
    if(d.t==='bar') {
        d.l.forEach((l,i)=> {
            if(l==='SCTM') return;
            list.innerHTML += `<div class="flex justify-between text-xs border-b border-slate-800 pb-2 mb-2"><span class="text-slate-400">${l}</span><span class="text-white font-mono">${d.d[i]}%</span></div>`;
        });
    } else {
        list.innerHTML = `<div class="text-xs text-slate-500 italic">Naive RAG requires linear storage expansion. SCTM remains O(1).</div>`;
    }

    if(evChart) evChart.destroy();
    const ctx = document.getElementById('evidenceChart');
    const cfg = { type: d.t, data: {}, options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:d.t==='line'}} } };

    if(d.t==='bar') cfg.data = { labels:d.l, datasets:[{ data:d.d, backgroundColor:d.c, borderRadius:4 }] };
    else cfg.data = { labels:d.l, datasets:d.ds };

    evChart = new Chart(ctx, cfg);
}

// --- Ablation ---
const abState = {conf:true, usage:true, decay:true};
function toggleAblation(k) {
    abState[k] = !abState[k];
    const on = abState[k];
    const btn = document.getElementById(`ind-${k}`);
    const txt = document.getElementById(`txt-${k}`);

    if(on) {
        btn.className = `w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ` + (k==='conf'?'bg-cyan-400':k==='usage'?'bg-indigo-500':'bg-amber-500');
        txt.innerText = 'ON'; txt.className = `text-xs font-mono font-bold ` + (k==='conf'?'text-cyan-400':k==='usage'?'text-indigo-400':'text-amber-500');
    } else {
        btn.className = 'w-3 h-3 rounded-full bg-slate-700';
        txt.innerText = 'OFF'; txt.className = 'text-xs font-mono font-bold text-slate-600';
    }

    let score = 54.3;
    if(abState.decay) score+=5.1; if(abState.usage) score+=7.4; if(abState.conf) score+=18.4;
    if(abState.decay && abState.usage && abState.conf) score=85.2;

    const scrEl = document.getElementById('ablation-score');
    scrEl.innerText = score.toFixed(1)+'%';
    scrEl.className = `text-7xl font-mono font-bold mb-2 relative z-10 transition-all duration-300 ` + (score>80 ? 'text-white glow-text' : 'text-slate-500');

    document.getElementById('ablation-diff').innerText = score===85.2 ? "Optimal Configuration" : "Sub-Optimal State";
    document.getElementById('ablation-diff').className = score===85.2 ? "text-sm font-medium text-cyan-400 relative z-10" : "text-sm font-medium text-red-400 relative z-10";
}

// --- Init ---
window.onload = () => {
    const ctxM = document.getElementById('mathChart');
    mathChart = new Chart(ctxM, {
        type:'line', data:{labels:[], datasets:[
                {label:'Retention', borderColor:'#22d3ee', backgroundColor:'rgba(34,211,238,0.1)', fill:true, tension:0.4},
                {label:'Baseline', borderColor:'#64748b', borderDash:[5,5], tension:0.4}
            ]},
        options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{display:false}}}
    });
    updateMath();
    ['input-c','input-u','input-l'].forEach(id=>document.getElementById(id).addEventListener('input', updateMath));

    simRender();
    switchChart('accuracy');
};
