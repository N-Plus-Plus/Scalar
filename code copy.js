document.addEventListener(`DOMContentLoaded`, function () { onLoad(); } );
window.addEventListener("mousedown", function (e) { clicked( e ); v.mouseDown = true; } );
window.addEventListener("mouseup", function (e) { resetHold(); } );
window.addEventListener("keydown", function(e) { pressed( e ) } );

function onLoad(){
    buildStat();
    loadState();
    displayRewards();
    updateTabs();
    setTimeout(() => { if( v.tab !== null && v.tab !== `points` && v.miniTab !== null ){ selectTab( def[v.tab].curr[1].toLowerCase() ); selectMiniTab( v.miniTab, v.tab ); } }, 50 );
    setInterval(() => { doLoop( now() ); }, global.tickSpeed );
    resetHold();
}

function clicked(e){
    let t = e.target;
    let c = t.classList;
    if( c.contains(`button`) ){ buy( v.selected, t.getAttribute(`data-buy`) ); v.clicked = t.getAttribute(`data-buy`); }
    else{ resetHold(); }
    if( c.contains(`complete`) ){ complete( v.selected, false ); }
    if( c.contains(`clickMe`) ){ clickReward( t.getAttribute(`data-click`), t ); }
    if( c.contains(`selector`) ){ display( t.getAttribute(`data-select`) ); }
    if( c.contains(`tab`) ){ selectTab( t.getAttribute(`data-tab`) ); }
    if( c.contains(`miniTab`) ){ selectMiniTab( t.getAttribute(`data-minitab`), t.getAttribute(`data-def`) ); }
    if( c.contains(`upgrade`) ){ buyUpgrade( t.getAttribute(`data-updef`), t.getAttribute(`data-uptype`), t.getAttribute(`data-uptier`) ); }
    if( c.contains(`autoBuy`) ){ pauseAuto( t.getAttribute(`data-auto`) ); }
    if( c.contains(`ring`) ){ pauseAuto( v.selected, t.getAttribute(`data-ring` ) ); }
    // if( c.contains(`circle`) ){ pauseAuto( v.selected, t.getAttribute(`data-circle` ) ); }
}

function pressed(e){}

function doLoop( tick ){
    let delta = ( tick - v.ms.last ) * global.godMode * Math.pow( 10, v.multi );
    earn( delta );
    progress();
    showStats();
    updateButtons();
    if( Math.random() < v.spawnChance * Math.pow( 1.1, v.upgrades.clickSpawn ) ){ spawnClickMe(); }
    if( tick % 50 == 0 ){ saveState(); }
    v.ms.last = tick;
}

function earn( ticks ){
    let quanta = ticks * ( global.tickSpeed / 1000 );
    for( r in v.runs ){
        v.runs[r].curr.gained += v.runs[r].curr.cps * quanta;
    }
}

function progress(){
    for( r in v.runs ){
        if( v.runs[r].quest.complete ){
            if( v.runs[r].completeIn !== undefined ){
                if( v.runs[r].completeIn <= 0 ){ complete( r, true ); }
                else{ v.runs[r].completeIn--; }
            }
        }
        else{
            switch( v.runs[r].quest.basis ){
                case `cps`:
                    v.runs[r].quest.progress = Math.min( 1, v.runs[r].curr.cps / v.runs[r].quest.target );
                break;
                case `balance`:
                    v.runs[r].quest.progress = Math.min( 1, balance( r ) / v.runs[r].quest.target );
                break;
                case `gained`:
                    v.runs[r].quest.progress = Math.min( 1, v.runs[r].curr.gained / v.runs[r].quest.target );
                break;
                case `spent`:
                    v.runs[r].quest.progress = Math.min( 1, v.runs[r].curr.spent / v.runs[r].quest.target );
                break;
                case `buy1Gen`:
                    let t = v.runs[r].quest.tier;
                    v.runs[r].quest.progress = Math.min( 1, v.runs[r].gen[t] / Math.floor( v.runs[r].quest.target ) );
                break;
            }            
            if( v.runs[r].quest.progress == 1 ){
                v.runs[r].quest.complete = true;
                if( v.upgrades[v.runs[r].def].autoComplete > 0 ){
                    let raw = global.autoComplete * ( 1000 / global.tickSpeed );
                    v.runs[r].completeIn = Math.ceil( raw * Math.pow( 1 / 1.1, v.upgrades[v.runs[r].def].autoComplete - 1 ) );
                }
            }
        }
        for( a in v.runs[r].auto ){
            if( v.runs[r].auto[a] !== null ){
                let b = parseInt( a.replace(`t`,``) );
                if( v.runs[r].autoOverride[b] ){}
                else if( v.runs[r].auto[a] <= 0 ){
                    v.runs[r].auto[a] = autoBuyTime( v.runs[r].def, b );
                    buy( r, b, true );
                }
                else{ v.runs[r].auto[a]--; }
            }            
        }
    }
    if( v.mouseDown && v.clicked !== null ){
        v.mouseTicks++;
        if( v.mouseTicks < 0 ){}
        else if( v.mouseTicks % global.buyEvery !== 0 ){}
        else{ buy( v.selected, v.clicked ); }
    }
    offsetRings();
    displayProgress();
}

function displayProgress(){
    document.querySelector(`.barFill`).style.width = `${v.runs[v.selected].quest.progress * 100}%`;
    if( v.runs[v.selected].quest.complete ){ displayComplete(); }
}

function displayComplete(){
    document.querySelector(`.completeBox`).classList.remove(`noDisplay`);
}

function buy( index, g, auto ){ // add bulk
    if( !afford( index, g ) ){ return false; }
    v.runs[index].curr.spent += cost( index, g );
    v.runs[index].gen[g]++;
    updateCPS( index );
    if( index !== v.selected ){ saveState(); return; }
    display( index );
    saveState();
}

function afford( index, g ){
    return balance( index ) >= cost( index, g );
}

function cost( index, g ){
    let n = Math.max( 0, v.runs[index].gen[g] - v.upgrades[v.runs[index].def].scaleDelay[g] );
    let d = 1 / ( 1 + ( v.upgrades[v.runs[index].def].creepReduce[g] * 0.1 ) );
    return Math.pow( Math.pow( global.scale.buy, d ), n ) * stat[g].cost;
}

function balance( index, clean ){
    let o = v.runs[index].curr.gained - v.runs[index].curr.spent;
    if( clean == true ){ o = parseInt( o.toFixed(0) ); }
    return o;
}

function completeBalance( k ){
    if( v.completed[k] == undefined ){ return 0; }
    if( v.spent[k] == undefined ){ return v.completed[k]; }
    return v.completed[k] - v.spent[k];

}

function updateCPS( index ){
    let cps = 0;
    for( i in v.runs[index].gen ){
        cps += getCPS( index, i, false );
    }
    v.runs[index].curr.cps = Math.floor( cps );
}

function getCPS( index, i, displayOnly ){
    let o = v.runs[index].gen[i] * stat[i].adds * Math.pow( Math.pow( 1.005, v.upgrades[v.runs[index].def].bulkBonus[i] ), v.runs[index].gen[i] );
    if( displayOnly ){ o = Math.max( v.runs[index].gen[i], 1 ) * stat[i].adds * Math.pow( Math.pow( 1.005, v.upgrades[v.runs[index].def].bulkBonus[i] ), v.runs[index].gen[i] );}
    return o
}

function calcReward( index ){
    return Math.floor( Math.log10( balance( index ) ) );
}

function complete( index, auto ){
    if( !v.runs[index].quest.complete ){ return; }
    let d = v.runs[index].def;
    if( v.reward[def[d].curr[1]] == undefined ){ v.reward[def[d].curr[1]] = 0; }
    v.reward[def[d].curr[1]] += calcReward( index );
    buildTabContents( v.tab, v.miniTab );
    if( v.completed[d] == undefined ){ v.completed[d] = 1; updateTabs(); }
    else{ v.completed[d]++; }
    v.curr.gained++;
    displayRewards();
    v.runs.splice(index,1);
    topUpHamlets();
    spawnCheck();
    if( !auto ){ display( 0 ); }
    else if( index == v.selected ){ display( 0 ); }
    else if( v.selected >= index ){ v.selected = parseInt( v.selected ) - 1; }
    displayRuns();
    saveState();
}

function resetHold(){
    v.mouseDown = false;
    v.mouseTicks = global.graceTicks;
    v.clicked = null;
}

function spawnCheck(){
    for( r in v.completed ){
        let target = getTarget( nextDef( r ) );
        if( v.completed[r] >= target ){
            v.completed[r] -= target;
            v.runs.push( new Run( nextDef( r ) ) );
        }
    }
}

function topUpHamlets(){
    let h = calcHamlets() - v.runs.filter( (e) => e.def == `hamlet` ).length;
    for( let i = 0; i < h; i++ ){ v.runs.push( new Run( `hamlet` ) ); }
}

function clickReward( type, t ){
    v.reward[type]++;
    buildTabContents( v.tab, v.miniTab );
    t.parentElement.removeChild(t);
    displayRewards();
}

function display( index ){
    let t = document.querySelector(`#selected`);
    t.innerHTML = ``;
    t.appendChild( buildContents( index ) );
    v.selected = index;
    forgeRings();
    ringPauseDisplay();
    displayRuns();
    displayProgress();
    showStats();
    document.documentElement.style.setProperty('--def', def[v.runs[index].def].color );
    updateButtons();
}

function displayRewards(){
    let t = document.querySelector(`#header`);
    t.innerHTML = ``;
    for( key in def ){
        let type = def[key].curr[1];
        if( v.reward[type] == undefined ){}
        else{ t.innerHTML += `<div class="rewardBox"><div class="${type} curr"></div> ${numDisplay( v.reward[type])}</div>`}
    }
    t.innerHTML += `<div class="rewardBox"><div class="points curr"></div> ${numDisplay( v.curr.gained - v.curr.spent )}</div>`;    
}

function updateTabs(){
    let t = document.querySelector(`#upgrades`);
    t.innerHTML = ``;
    let tb = elem( `tabBox` );
    for( key in def ){
        if( v.reward[def[key].curr[1]] == undefined ){}
        else{ tb.innerHTML += `<div class="tab" data-tab="${def[key].curr[1].toLowerCase()}" data-def="${key}"><div class="${def[key].curr[1]} tabIco"></div></div>`}
    }
    tb.innerHTML += `<div class="tab" data-tab="points" data-def="points"><div class="points tabIco"></div></div>`;
    t.appendChild(tb);
    t.appendChild(elem(`tabContents`,``,[[`upgrades`,null]]));
}

function selectTab( n ){
    let t = document.querySelectorAll(`.tab`);
    for( let i = 0; i < t.length; i++ ){ t[i].classList.remove(`active`); }
    document.querySelector(`[data-tab="${n}"]`).classList.add(`active`);
    let d = document.querySelector(`[data-tab="${n}"]`).getAttribute( `data-def` );
    if( def[d] == undefined ){ color = `#656D78`; }
    else{ color = def[d].color; }
    document.documentElement.style.setProperty('--tab', color );
    buildTabContents( d );
}
function selectMiniTab( n, d ){
    let t = document.querySelectorAll(`.miniTab`);
    for( let i = 0; i < t.length; i++ ){ t[i].classList.remove(`active`); }
    document.querySelector(`[data-minitab="${n}"]`).classList.add(`active`);
    buildMiniTabContents( n, d );
}

function buildTabContents( n, x ){
    if( n == v.tab ){ x = v.miniTab; }
    if( x == undefined ){ x = 0; }
    let t = document.querySelector(`[data-upgrades]`);
    t.innerHTML = ``;
    if( n == `points` ){
        t.appendChild( elem( `upgradeHeading defLabel`, `Global Upgrades` ) );
        for( k in Object.keys( v.upgrades ) ){
            let ch = Object.keys(v.upgrades)[k];
            let subj = upgrades.filter( (e) => e.id == ch )[0];
            if( subj !== undefined ){
                if( subj.scope == `global` ){ // global level
                    let r = elem( `upgradeRow` );
                    r.appendChild( elem( `upgrade`, `Buy`, [[`uptype`,ch],[`scope`,`global`]] ) );
                    if( upgradeAfford( null, subj.id, null ) ){ r.lastChild.classList.add(`affordable`); }
                    r.appendChild( elem( `label bigCell`, subj.nice ) );
                    r.appendChild( elem( `stat halfCell`, v.upgrades[ch] ) );
                    r.appendChild( elem( `stat halfCell`, numDisplay( upgradeCost( null, subj.id, null ) ) ) );
                    t.appendChild(r);
                }
            }
        }
        v.tab = `points`;
        return;
    }
    t.appendChild( elem( `upgradeHeading defLabel`, `General Upgrades` ) );
    for( k in Object.keys( v.upgrades[n] ) ){
        let ch = Object.keys(v.upgrades[n])[k];
        let subj = upgrades.filter( (e) => e.id == ch )[0];
        if( subj.scope == `def` ){ // def level
            if( ch == `childReq` && n == `hamlet` ){}
            else if( ch == `childReq` && getTarget( n ) <= 1 ){}
            else{
                let r = elem( `upgradeRow` );
                r.appendChild( elem( `upgrade`, `Buy`, [[`updef`,n],[`uptype`,ch],[`scope`,`def`]] ) );
                if( upgradeAfford( n, subj.id, null ) ){ r.lastChild.classList.add(`affordable`); }
                r.appendChild( elem( `label bigCell`, subj.nice ) );
                r.appendChild( elem( `stat halfCell`, v.upgrades[n][ch] ) );
                r.appendChild( elem( `stat halfCell`, numDisplay( upgradeCost( n, subj.id, null ) ) ) );
                t.appendChild(r);
            }
        }
    }
    t.appendChild( elem( `upgradeHeading defLabel`, `Tier Upgrades` ) );
    let mt = elem( `miniTabBox` );
    for( g in gg ){ mt.appendChild( elem( `miniTab`, gg[g], [[`minitab`,g],[`def`,n]] ) ); }
    t.appendChild( mt );
    t.appendChild( elem( `miniTabContents` ) );
    v.tab = n;
    selectMiniTab( x, n );
}

function buildMiniTabContents( n, d ){
    let t = document.querySelector(`.miniTabContents`);
    t.innerHTML = ``;
    for( k in Object.keys( v.upgrades[d] ) ){
        let ch = Object.keys(v.upgrades[d])[k];
        let subj = upgrades.filter( (e) => e.id == ch )[0];
        if( subj.scope == `tier` ){ // tier level
            let r = elem( `upgradeRow` );
            r.appendChild( elem( `upgrade`, `Buy`, [[`updef`,d],[`uptier`,n],[`uptype`,ch]],[`scope`,`def`] ) );
            if( upgradeAfford( d, subj.id, n ) ){ r.lastChild.classList.add(`affordable`); }
            r.appendChild( elem( `label bigCell`, subj.nice ) );
            r.appendChild( elem( `stat halfCell`, v.upgrades[d][ch][n] ) );
            r.appendChild( elem( `stat halfCell`, numDisplay( upgradeCost( d, subj.id, n ) ) ) );
            t.appendChild(r);
        }
    }
    v.miniTab = n;
}

function displayRuns(){
    let t = document.querySelector(`#runs`);
    t.innerHTML = ``;
    for( let i = 0; i <= v.watermark + 1; i++ ){
        let k = Object.keys(def)[i];
        let e = elem( `defBox` );
            if( i == 0 ){ e.appendChild( elem( `defLabel`, k[0].toUpperCase() + k.substring(1) + `<div class="smaller">Max: ${numDisplay( calcHamlets() )}</div>` ) ); }
            else{ e.appendChild( elem( `defLabel`, k[0].toUpperCase() + k.substring(1) + `<div class="smaller">${completeBalance( Object.keys(def)[i-1] )} / ${getTarget( k )}</div>` ) ); }
            e.appendChild( elem( `defSubBox`, ``, [[`selector`,k]] ) );
            t.appendChild( e );
    }
    for( r in v.runs ){
        t = document.querySelector(`[data-selector="${v.runs[r].def}"]`);
        t.appendChild( elem( `selector ${v.runs[r].def}`, v.runs[r].def[0].toUpperCase() + v.runs[r].def.substring(1), [[`select`,r]] ) );
    }
    let s = document.querySelectorAll(`[data-select]`);
    for( let i = 0; i < s.length; i++ ){ s[i].classList.add(`deselected`); }
    document.querySelector(`[data-select="${v.selected}"]`).classList.remove(`deselected`);
}

function buildContents( index ){
    let o = elem( `selected` );
    let h = elem( `questBox`);
    let q = elem( `questBar` );
        q.appendChild( elem( `barFill` ) );
        q.appendChild( elem( `questText`, v.runs[index].quest.verbiage
        .replace(`Q`,def[v.runs[index].def].curr[0])
        .replace(`N`,numDisplay( v.runs[index].quest.target ) )
        .replace(`T`, gen[v.runs[index].quest.tier] ) ) );
        h.appendChild( q );
    o.appendChild( h );
    let s = elem( `statBox` );
        s.appendChild( elem( `statRow`, `${def[v.runs[index].def].curr[0]} Held: <a class="num" data-balance=${index}>${numDisplay( balance( index ) )}</a>` ) );
        s.appendChild( elem( `statRow`, `${def[v.runs[index].def].curr[0]} Per Second: <a class="num" data-cps=${index}>${numDisplay( v.runs[index].curr.cps )}</a>` ) );
    o.appendChild( s );
    let b = elem( `tableBox` );
    let bH = elem( `tableHeadings` );
        bH.appendChild( elem( `heading long`, `Purchase` ) );
        bH.appendChild( elem( `heading`, `Owned` ) );
        bH.appendChild( elem( `heading`, `Cost` ) );
        bH.appendChild( elem( `heading`, `Income` ) );
        bH.appendChild( elem( `headingIcon autoBuy`, ``, [[`auto`,index]] ) );
        b.appendChild( bH );
    for( i in stat ){
        let bR = elem( `tableRow` );
            bR.appendChild( elem( `button cell long`, gen[i], [[`buy`, i],[`index`,index]] ) );
            bR.appendChild( elem( `stat cell`, numDisplay( v.runs[index].gen[i] ) ) );
            bR.appendChild( elem( `stat cell`, numDisplay( cost( index, i ) ) ) );
            // bR.appendChild( elem( `stat cell`, numDisplay( stat[i].adds ) ) );
            bR.appendChild( elem( `stat cell`, numDisplay( getCPS( index, i, true ) / Math.max( 1, v.runs[index].gen[i] ) ) ) );
            bR.appendChild( elem( ``, ``, [[`ringMe`,i]]) );
            b.appendChild( bR );
        }
    o.appendChild( b );
    let c = elem( `completeBox noDisplay` );
        c.appendChild( elem( `complete`, `Complete Quest`, [[`complete`, index]] ) );        
    o.appendChild( c );
    return o;
}

function elem( cl, inner, attr ){
    let e = document.createElement(`div`);
    e.classList = cl;
    if( inner !== undefined ){ e.innerHTML = inner; };
    if( attr !== undefined ){ for( a in attr ){ e.setAttribute( `data-${attr[a][0]}`, attr[a][1] ); } }
    return e;
}

function showStats(){
    document.querySelector(`[data-balance]`).innerHTML = numDisplay( balance( v.selected ) );
    if( v.runs[v.selected].quest.complete ){ document.querySelector(`.complete`).innerHTML = `Complete Quest for ${calcReward( v.selected )} <div class="rewardIcon ${def[v.runs[v.selected].def].curr[1]}"></div>`; }
}

function forgeRings(){
    let rings = document.querySelectorAll(`[data-ringMe]`);
    for( let r = 0; r < rings.length; r++ ){
        let id = rings[r].getAttribute(`data-ringMe`);
        rings[r].outerHTML += `<svg data-ring="${id}" xmlns="http://www.w3.org/2000/svg" class="ring" width="16" height="16"><circle class="circle" data-circle="${id}" cx="8" cy="8" r="4" stroke="var(--def)" stroke-width="8" fill="transparent" /></svg>`;
    }
    offsetRings();
}

function offsetRings(){
    if( v.selected !== null ){
        let circs = document.querySelectorAll(`[data-circle]`);
        for( let i = 0; i < circs.length; i++ ){
            if( v.upgrades[v.runs[v.selected].def].autoBuy[i] == 0 ){ circs[i].classList.add(`noDisplay`); }
            else{
                circs[i].classList.remove(`noDisplay`);
                let p = v.runs[v.selected].auto[`t${i}`] / autoBuyTime( v.runs[v.selected].def, i );
                let circle = document.querySelector(`[data-circle="${i}"]`);
                let radius = circle.r.baseVal.value;
                let circumference = radius * 2 * Math.PI;
                circle.style.strokeDasharray = `${circumference} ${circumference}`;
                circle.style.strokeDashoffset = `${circumference}`;
                const offset = p * circumference;
                circle.style.strokeDashoffset = offset;
            }
        }
    }
}

function updateButtons(){
    let b = document.querySelectorAll(`[data-buy]`);
    for( let i = 0; i < b.length; i++ ){
        if( afford( v.selected, i ) ){ b[i].classList.add( `available`); }
        else{ b[i].classList.remove( `available`); }
    }
}

function spawnClickMe(){
    let arr = [];
    for( key in v.reward ){ arr.push(key); }
    if( arr.length > 0 ){
        let nonce = Math.floor( Math.random() * arr.length );
        let e = elem( `clickMe ${arr[nonce]}`, ``, [[`click`,arr[nonce]]] );
        e.style.left = Math.floor( 2 + Math.random() * window.innerWidth / 16 ) - 4 + `rem`;
        e.style.top = Math.floor( 2 + Math.random() * window.innerHeight / 16 ) - 4 + `rem`;
        document.querySelector(`#header`).parentElement.appendChild( e );
        setTimeout(() => { e.style.opacity = 1 }, 50 );
        setTimeout(() => { e.style.opacity = 0 }, v.clickTimer - 5000 );
        setTimeout(() => { if( e.parentElement == null ){ return; } e.parentElement.removeChild(e); }, v.clickTimer );
    }    
}

function buyUpgrade( d, type, tier ){
    if( upgradeAfford( d, type, tier ) ){
        if( d !== null ){ v.reward[def[d].curr[1]] -= upgradeCost( d, type, tier ); }
        else{ v.curr.spent += upgradeCost( d, type, tier ); }
        if( d == null ){
            v.upgrades[type]++;
            if( type == `maxHamlets` ){ topUpHamlets(); displayRuns(); }
            if( type == `questTarget` ){ adjustQuestTargets(); }
        }
        else if( tier == null ){
            v.upgrades[d][type]++;
            if( type == `autoBuy` ){ updateAutoValues(); }
            if( type == `creepReduce` ){ display( v.selected ); }
            // if( type == `scaleDelay` ){ display( v.selected ); }
        }
        else{
            v.upgrades[d][type][tier]++;
            buildMiniTabContents( tier, d );
        }
        display( v.selected );
        displayRewards();
        if( d == null ){ d = `points`; }
        buildTabContents( d );
    }
}

function upgradeAfford( d, type, tier ){
    let o = false;
    if( d == null ){ if( v.curr.gained - v.curr.spent >= upgradeCost( d, type, tier ) ){ o = true; } }
    else if( upgradeBalance( def[d].curr[1] ) >= upgradeCost( d, type, tier ) ){ o = true; }
    return o;
}

function upgradeBalance( c ){
    return v.reward[c];
}

function upgradeCost( d, type, tier ){
    let bought = 0;
    if( d == null ){ bought = v.upgrades[type]; }
    else if( tier == null ){ bought = v.upgrades[d][type]; }
    else{ bought = v.upgrades[d][type][tier]; }
    let u = upgrades.filter( (e) => e.id == type )[0];
    let c = Math.ceil( u.cost * Math.pow( u.multi, bought ) );
    return c;
}

function updateAutoValues(){    
    for( r in v.runs ){
        for( a in v.runs[r].auto ){
            let b = parseInt( a.replace(`t`,`` ) );
            if( v.upgrades[v.runs[r].def].autoBuy[b] > 0 ){
                let t = autoBuyTime( v.runs[r].def, b );
                if( v.runs[r].auto[a] == null ){ v.runs[r].auto[a] = t; }
                else if( v.runs[r].auto[a] > autoBuyTime( v.runs[r].def, b ) ){ v.runs[r].auto[a] = t; };
            }
        }
    }
}

function pauseAuto( index, tier ){
    let t = [];
    let direction = false;
    if( tier == undefined ){
        t = [0,1,2,3,4,5,6,7,8,9];
        for( q in v.runs[index].autoOverride ){ if( v.runs[index].autoOverride[q] == false ){ direction = true; } }
    }
    else{
        t.push( tier );
        direction = !v.runs[index].autoOverride[tier];
    }
    for( i in t ){ v.runs[index].autoOverride[t[i]] = direction; }
    ringPauseDisplay();
}

function ringPauseDisplay(){
    for( let n = 0; n < v.runs[v.selected].autoOverride.length; n++ ){
        if( v.runs[v.selected].autoOverride[n] ){ document.querySelector(`[data-circle="${n}"]`).classList.add(`paused`); }
        else{ document.querySelector(`[data-circle="${n}"]`).classList.remove(`paused`); }
    }
}

function getTarget( d ){
    let o = global.defTarget + Object.keys(def).findIndex( e => e == d );
    if( d !== undefined ){ o -= v.upgrades[d].childReq }
    return o;
}

function nextDef( d ){
    let arr = Object.keys( def );
    let index = arr.findIndex( e => e == d ) + 1;
    return arr[index];
}

function adjustQuestTargets(){
    for( r in v.runs ){
        v.runs[r].quest.target /= 1.05;
    }
    display( v.selected );
}

function calcHamlets(){
    return global.hamlets + v.upgrades.maxHamlets;
}

function autoBuyTime( d, t ){
    return Math.ceil( ( global.autoBuy + global.autoBuy * ( t + 1 ) / 2 ) * Math.pow( 1 / 1.05, v.upgrades[d].autoBuy[t] ) ) * ( 1000 / global.tickSpeed );
}

function saveState(){
    localStorage.setItem( `v` , JSON.stringify( v ) );
}

function loadState(){
    let store = JSON.parse( localStorage.getItem( `v` ) );
    if( store !== null ){
        if( store.version !== v.version ){ display( v.selected ); } // loop load data
        else{ v = store; buildUpgrades(); display( v.selected ); }
    }
    else{
        v.ms.start = new Date().getTime() / global.tickSpeed;
        v.ms.last = now();
        buildUpgrades();
        topUpHamlets();
        display( 0 );
    }
    setIco( v.watermark );
}

function resetData(){
    localStorage.clear();
    location.reload();
}

var v = {
    version: 0.01
    , runs: []
    , ms: { start: 0, last: 0 }
    , curr: { gained: 0, spent: 0 }
    , reward: {}
    , completed: {}
    , spent: {}
    , selected: null
    , tab: null
    , miniTab: null
    , clickTimer: 10000
    , spawnChance: 1 / 10000
    , watermark: 0    
    , upgrades: {}
    , multi: 0
}

const global = {
    scale: { buy: 1.1, buyScale: 1.0543046, cost: 2.5, add: 2, ranks: 10, def: 1.5 } // 1.05361025 to reach 250k
    , tickSpeed: 50
    , defTarget: 6
    , hamlets: 1
    , godMode: 1
    , autoComplete: 120
    , autoBuy: 10
    , graceTicks: -10
    , buyEvery: 1
}

const upgrades = [
    {   id: `maxHamlets`,   scope: `global`,    cost: 2,    benefit: 1,     multi: 5,       math: `add`,        nice: `Hamlet Cap` } //
    , { id: `rosterSize`,   scope: `global`,    cost: 5,    benefit: 1,     multi: 2.5,     math: `add`,        nice: `Roster Size` }
    , { id: `questTarget`,  scope: `global`,    cost: 5,    benefit: 1.05,  multi: 2,       math: `multiply`,   nice: `Quest Targets` } // consider making Def rather than Global
    , { id: `clickSpawn`,   scope: `global`,    cost: 2,    benefit: 1.05,  multi: 1.5,     math: `multiply`,   nice: `Clickables` } //
    , { id: `skillTypes`,   scope: `global`,    cost: 1,    benefit: 1,     multi: 2.5,     math: `add`,        nice: `Skills Cap` } //
    , { id: `startCash`,    scope: `def`,       cost: 10,   benefit: 2.5,   multi: 1.5,     math: `multiply`,   nice: `Start Wealth` } //
    , { id: `autoComplete`, scope: `def`,       cost: 10,   benefit: 1.1,   multi: 2,       math: `divide`,     nice: `Auto-Complete` } //
    , { id: `childReq`,     scope: `def`,       cost: 10,   benefit: 1,     multi: 2.5,     math: `subtract`,   nice: `Children Required` }
    , { id: `bulkBonus`,    scope: `tier`,      cost: 5,    benefit: 1.005, multi: 2,       math: `multiply`,   nice: `Bulk Bonus` } // power of a power - be careful with scaling
    , { id: `autoBuy`,      scope: `tier`,      cost: 10,   benefit: 1.05,  multi: 1.125,   math: `divide`,     nice: `Auto Buyer` } // needs an off-toggle
    , { id: `scaleDelay`,   scope: `tier`,      cost: 5,    benefit: 1,     multi: 1.25,    math: `add`,        nice: `Scale Delay` } //
    , { id: `creepReduce`,  scope: `tier`,      cost: 10,   benefit: 1.05,  multi: 2.5,     math: `divide`,     nice: `Cost Scaling` } //
    // clickMe tilting
]

const stat = [ { cost: 10, adds: 1 } ]

const def = {
    hamlet: { curr: [`Grain`,`Stone`], color: `#D8334A` }
    , village: { curr: [`Meat`,`Bronze`], color: `#8067B7` }
    , town: { curr: [`Ore`,`Iron`], color: `#5D9CEC` }
    , city: { curr: [`Oil`,`Steel`], color: `#48CFAD` }
    //, county: { curr: [`Oil`,`Steel`], color: `#48CFAD` }
    , metropolis: { curr: [`Energy`,`Titanium`], color: `#E8CE4D` }
    , megalopolis: { curr: [`Chemicals`,`Graphene`], color: `#FC6E51` }
    //, gigalopolis: { curr: [`Chemicals`,`Graphene`], color: `#FC6E51` }
    //, eperopolis: { curr: [`Chemicals`,`Graphene`], color: `#FC6E51` }
    //, ecumenopolis: { curr: [`Chemicals`,`Graphene`], color: `#FC6E51` }
}

const span = [
      { curr: `Uncertainty`,    label: `Quantum`,       color: `#a07e36` }
    , { curr: `Particles`,      label: `Partonic`,      color: `#97482c` }
    , { curr: `Atoms`,          label: `Atomic`,        color: `#932929` }
    , { curr: `Molecules`,      label: `Molecular`,     color: `#72285d` }
    , { curr: `Organelles`,     label: `Organellar`,    color: `#33265b` }
    , { curr: `Cells`,          label: `Cellular`,      color: `#2a3964` }
    , { curr: `Organisms`,      label: `Organic`,       color: `#2c5478` }
    , { curr: `Ideas`,          label: `Thought`,       color: `#3d6b68` }
    , { curr: `Code`,           label: `</>`,           color: `#385e35` }
    , { curr: `Features`,       label: `Scalar`,        color: `#6f8240` }
]

const questDef = [
    { basis: `gained`,      target: 1e7, verbiage: `Generate N Q` }
    , { basis: `balance`,   target: 1e6, verbiage: `Hold N Q` }
    , { basis: `cps`,       target: 1e4, verbiage: `Reach N Q Per Second` }
    , { basis: `spent`,     target: 5e6, verbiage: `Spend N Q` }
    , { basis: `buy1Gen`,   target: [{a:80,t:0},{a:75,t:1},{a:70,t:2},{a:65,t:3},{a:60,t:4},{a:50,t:5},{a:40,t:6},{a:30,t:7},{a:20,t:8},{a:10,t:9}], verbiage: `Buy N T`}
    // buy N Generators of Tier Y through Z
    
    // spend 500 Thousand Q in a single purchase
]

const gen = [`Tier I`,`Tier II`,`Tier III`,`Tier IV`,`Tier V`,`Tier VI`,`Tier VII`,`Tier VIII`,`Tier IX`,`Tier X`];
const gg = [`I`,`II`,`III`,`IV`,`V`,`VI`,`VII`,`VIII`,`IX`,`X`];

const jerkTraits = [
    { id: `fastBuy`, significance: 0.05, scope: `tier` }
    , { id: `moreOutput`, significance: 0.1, scope: `tier` }
    , { id: `lessScale`, significance: 0.05, scope: `tier` }
    , { id: `flatDiscount`, significance: 0.05, scope: `tier` }
    , { id: `boughtBoost`, significance: 1, scope: `tier` }
    , { id: `overallOutput`, significance: 0.05, scope: `def` }
    , { id: `startCash`, significance: 0.25, scope: `def` }
    , { id: `questEase`, significance: 0.025, scope: `def` }
]

class Quest{
    constructor( d ){
        let q = questDef[Math.floor( Math.random() * questDef.length )];
        let w = Object.keys( def ).findIndex( (e) => e == d );
        if( q.basis == `buy1Gen` ){
            let n = Math.floor( Math.random() * q.target.length );
            this.target = Math.floor( q.target[n].a * Math.pow( global.scale.def, w ) / Math.pow( 1.05, v.upgrades.questTarget ) );
            this.tier = q.target[n].t;
        }
        else{
            this.target = Math.floor( q.target * Math.pow( global.scale.def, w ) ) / Math.pow( 1.05, v.upgrades.questTarget );
        }
        this.basis = q.basis;
        this.progress = 0;
        this.complete = false;
        this.verbiage = q.verbiage;
    }
}

class Run{
    constructor( d ){
        this.id = uuid();
        this.def = d;
        this.gen = [];
        this.auto = {};
        this.autoOverride = [];
        for( let i = 0; i < global.scale.ranks; i++ ){
            this.gen.push( 0 );
            if( v.upgrades[d].autoBuy[i] == 0 ){ this.auto[`t${i}`] = null; }
            else{ this.auto[`t${i}`] = autoBuyTime( d, i ); }
            this.autoOverride.push(false);
        }
        this.quest = new Quest( d );
        let sw = 10 * Math.pow( 2, v.upgrades[d].startCash );
        this.curr = { gained: sw, spent: 0, cps: 0 };
        let w = Object.keys( def ).findIndex( (e) => e == d );        
        if( v.watermark < w ){
            v.watermark = w;
            setIco(w);
        }
    }
}

class Jerk{
    constructor(){
        this.id = uuid();
        this.traitCount = traitCount();
        this.buyType = shuffle([`ascending`, `descending`, `cheapest`, `dearest`, `random`])[0];
        this.trait = [];
        for( let i = 0; i < this.traitCount; i++ ){
            let selection = shuffle(jerkTraits)[0];
            this.trait.push( { id: selection.id, amt: Math.ceil( Math.random() * ( 10 / this.traitCount ) ) * selection.significance, t: Math.floor( Math.random() * stat.length ) } );
        }
        this.assignment = null;
    }
}

function uuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16) );
}

function traitCount(){
    return 1 + Math.floor( Math.random() * ( 1 + v.upgrades.skillTypes ) );
}

function setIco( w ){
    var link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = `./${def[Object.keys(def)[w]].curr[1]}.png`;
}

function buildStat(){
    for( let i = 1; i < global.scale.ranks; i++ ){ stat.push( { cost: stat[i-1].cost * global.scale.cost * Math.pow( global.scale.buyScale, i - 1 ), adds: stat[i-1].adds * global.scale.add } ); }
    for( i in stat ){ stat[i].cost = stat[i].cost.toFixed(0); }
}

function buildUpgrades(){
    for( u in upgrades ){
        let up = upgrades[u].id;
        if( upgrades[u].scope == `global` ){ if( v.upgrades[up] == undefined ){ v.upgrades[up] = 0; } }
        else{
            for( d in def ){
                if( upgrades[u].scope == `def` ){
                    if( v.upgrades[d] == undefined ){ v.upgrades[d] = {}; };
                    if( v.upgrades[d][up] == undefined ){ v.upgrades[d][up] = 0; };
                }
                else{
                    for( t in stat ){
                        if( v.upgrades[d] == undefined ){ v.upgrades[d] = {}; };
                        if( v.upgrades[d][up] == undefined ){ v.upgrades[d][up] = {}; };
                        if( v.upgrades[d][up][t] == undefined ){ v.upgrades[d][up][t] = 0; };
                    }
                }
            }
        }
    }
}

function now(){ return parseInt( ( new Date().getTime() / global.tickSpeed - v.ms.start ).toFixed(0) ); }

function shuffle( a ) {
    for( let i = a.length - 1; i > 0; i-- ){
      let j = Math.floor( Math.random() * ( i + 1 ) );
      [a[i], a[j]] = [a[j], a[i]];
    };
    return a;
}

function numDisplay( x ){
    x = Math.floor( x ).toFixed(0);
    var pattern = /(-?\d+)(\d{3})/;
    while( pattern.test( x ) )
        x = x.replace( pattern, "$1,$2" );
    return x;
}

const helpful = [
    `Click and hold a Tier to rapid-buy`
    , `Click the Auto Buy timer to pause / unpause`
    , `Click the Auto Buy column icon to pause / unpause all`
]

/*

TODO
Run progress bar in side menu
Cap and drip release Def above the first (so you can't have seven)
Managers...
More Complex Quests
More Upgrade types


Rewards random-spawn

~~ UPGRADES ~~
~ DEF ~
Reduce scaling severity of each Tier
Improve output of Tier based on amount owned

~OVERALL~
Reduce number of child settlements required (12 down to 3) - applies from Settlement


Spending meta adds one order of magnitude to all meta options
- this decays down from *10 to *1.1 over 3,600s


Per managed def auto-buyer timer + bar
- decide on next purchase (show it)
- count down to buy
- attempt a buy (can fail if user is active)


`Quantum` ->    Uncertainty
`Partonic` ->   Particle
`Atomic` ->     Atom
`Molecular` ->  Molecule
`Organellar` -> Organelle
`Cellular` ->   Cell
`Organic` ->    Organism
`Mind` ->       Thought
`Code` ->       Code
`Game` ->       Scalar


`Quantum`, primary: `Uncertainty`, secondary: `Particle` } // dot
`Partonic`, primary: `Particle`, secondary: `Atom` } // atom
`Atomic`, primary: `Atom`, secondary: `Molecule` } // molecule
`Molecular`, primary: `Molecule`, secondary: `Organelle` } // chromasome
`Organellar`, primary: `Organelle`, secondary: `Cell` } // cell
`Cellular`, primary: `Cell`, secondary: `Organism` } // person
`Organic`, primary: `Organism`, secondary: `Thought` } // brain
`Mind`, primary: `Thought`, secondary: `Code` } // </>
`Code`, primary: `Code`, secondary: `Game` } // controller
`Scalar`, primary: `Game`, secondary: `Uncertainty` } // ?





*/