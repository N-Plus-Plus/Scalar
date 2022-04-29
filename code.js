document.addEventListener(`DOMContentLoaded`, function () { onLoad(); } );
window.addEventListener("mousedown", function (e) { clicked( e ); v.mouseDown = true; } );
window.addEventListener("mouseup", function (e) { resetHold(); } );
window.addEventListener("keydown", function(e) { pressed( e ) } );

function onLoad(){
    buildStat();
    loadState();
    displayRewards();
    updateTabs();
    if( v.tab !== null && v.tab !== `points` && v.miniTab !== null ){ selectTab( v.tab ); selectMiniTab( v.miniTab, v.tab ); }
    else if( v.tab == `points` ){ selectTab( `points` ); };
    setInterval(() => { doLoop( now() ); }, global.tickSpeed );
    resetHold();
    displayWings();
    addScroll();
}

function clicked(e){
    let t = e.target;
    let c = t.classList;
    if( c.contains(`button`) ){ buy( v.selected, t.getAttribute(`data-buy`), false ); v.clicked = t.getAttribute(`data-buy`); }
    else{ resetHold(); }
    if( c.contains(`complete`) ){ complete( v.selected, false ); }
    if( c.contains(`clickMe`) ){ clickReward( t.getAttribute(`data-click`), t ); }
    if( c.contains(`selector`) ){ display( t.getAttribute(`data-select`) ); }
    if( c.contains(`tab`) ){ selectTab( t.getAttribute(`data-tab`) ); }
    if( c.contains(`miniTab`) ){ selectMiniTab( t.getAttribute(`data-minitab`), t.getAttribute(`data-span`) ); }
    if( c.contains(`autoBuy`) ){ pauseAuto( t.getAttribute(`data-auto`) ); }
    if( c.contains(`ring`) ){ pauseAuto( v.selected, t.getAttribute(`data-ring` ) ); }
    if( c.contains(`tooltip`) ){
        t = t.parentElement;
        c = t.classList;
        if( c.contains(`upgrade`) ){ buyUpgrade( t.getAttribute(`data-upspan`), t.getAttribute(`data-uptype`), t.getAttribute(`data-uptier`) ); }
        if( c.contains(`unassigned`) ){ selectJerk( t.getAttribute(`data-jerk` ) ); }
        else if( c.contains(`slot`) && v.jerkSelected == null ){ unassignJerk( t.getAttribute(`data-slot` ) ); }
        else{ clearJerkSelect(); }
    }
    if( c.contains(`slot`) && v.jerkSelected !== null ){ assignJerk( v.jerkSelected, t.getAttribute(`data-slot` ) ); }
}

function pressed(e){
    let valid = [0,1,2,3,4,5,6,7,8,9];
    if( valid.findIndex( ee => ee == e.key ) !== -1 ){
        if( e.key == 0 ){ buy( v.selected, 9, false ); }
        else{ buy( v.selected, e.key - 1, false ); }
    }
}

function doLoop( tick ){
    let delta = ( tick - v.ms.last ) * global.godMode * Math.pow( 10, v.multi );
    earn( delta );
    progress();
    showStats();
    updateButtons();
    scrollScroll();
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
                if( v.upgrades[v.runs[r].span].autoComplete > 0 ){
                    let raw = global.autoComplete * ( 1000 / global.tickSpeed );
                    v.runs[r].completeIn = Math.ceil( raw * Math.pow( 1 / 1.1, v.upgrades[v.runs[r].span].autoComplete - 1 ) );
                }
            }
        }
        for( a in v.runs[r].auto ){
            if( v.runs[r].auto[a] !== null ){
                let b = parseInt( a.replace(`t`,``) );
                if( v.runs[r].autoOverride[b] ){}
                else if( v.runs[r].auto[a] <= 0 ){
                    v.runs[r].auto[a] = autoBuyTime( v.runs[r].span, b );
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
        else{ buy( v.selected, v.clicked, false ); }
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
    if( afford( index, g ) ){
        v.runs[index].curr.spent += cost( index, g );
        v.runs[index].gen[g]++;
        updateCPS( index );
        if( auto && index !== v.selected ){}
        else{ display( v.selected ); }
        saveState();
    }
}

function afford( index, g ){
    return balance( index ) >= cost( index, g );
}

function cost( index, g ){
    let n = Math.max( 0, v.runs[index].gen[g] - v.upgrades[v.runs[index].span].scaleDelay[g] );
    let div = 1;
    let tr = getTraits( v.runs[index].span );
    let multi = 1;
    for( a in tr ){
        if( tr[a].id == `lessScale` && g == tr[a].t ){ div *= ( 1 + tr[a].amt ); }
        if( tr[a].id == `flatDiscount` && g == tr[a].t ){ multi *= ( 1 - tr[a].amt ); }
    }
    let d = 1 / ( 1 + ( v.upgrades[v.runs[index].span].creepReduce[g] * 0.1 ) ) / div;
    return Math.pow( Math.pow( global.scale.buy, d ), n ) * ( stat[g].cost * multi );
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

function getCPS( index, i ){
    let o = v.runs[index].gen[i] * getSingleCPS( index, i );
    return o
}

function getSingleCPS( index, i ){
    let o = stat[i].adds * Math.pow( Math.pow( 1.005, v.upgrades[v.runs[index].span].bulkBonus[i] ), v.runs[index].gen[i] );
    let tr = getTraits( v.runs[index].span );
    for( a in tr ){
        if( tr[a].id == `moreOutput` && i == tr[a].t ){ o *= ( 1 + tr[a].amt ) }
        if( tr[a].id == `overallOutput` ){ o *= ( 1 + tr[a].amt ) }        
    }
    return o;
}

function calcReward( index ){
    return Math.floor( Math.log10( balance( index ) ) );
}

function complete( index, auto ){
    if( !v.runs[index].quest.complete ){ return; }
    let d = v.runs[index].span;
    if( v.reward[span[d].curr] == undefined ){ v.reward[span[d].curr] = 0; }
    v.reward[span[d].curr] += calcReward( index );
    buildTabContents( v.tab, v.miniTab );
    if( v.completed[d] == undefined ){ v.completed[d] = 1; updateTabs(); }
    else{ v.completed[d]++; }
    v.curr.gained++;
    displayRewards();
    v.runs.splice(index,1);
    topUpZeros();
    spawnCheck();
    if( !auto ){ display( 0 ); }
    else if( index == v.selected ){ display( 0 ); }
    else if( v.selected >= index ){ v.selected = parseInt( v.selected ) - 1; }
    displayRuns();
    displayWings();
    saveState();
}

function displayWings(){
    if( v.curr.gained > 0 ){
        document.querySelector(`#runs`).classList.remove(`noDisplay`);
        document.querySelector(`#upgrades`).classList.remove(`noDisplay`);
    }
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

function topUpZeros(){
    let h = calcZeros() - v.runs.filter( (e) => e.span == 0 ).length;
    for( let i = 0; i < h; i++ ){ v.runs.push( new Run( 0 ) ); }
}

function clickReward( type, t ){
    v.reward[type]++;
    t.parentElement.removeChild(t);
    selectTab( v.tab, v.miniTab );
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
    document.documentElement.style.setProperty('--span', span[v.runs[index].span].color );
    updateButtons();
}

function displayRewards(){
    let t = document.querySelector(`#header`);
    t.innerHTML = ``;
    for( key in span ){
        let type = span[key].curr;
        if( v.reward[type] == undefined ){}
        else{ t.innerHTML += `<div class="rewardBox"><div class="s${key} curr"></div> ${numDisplay( v.reward[type])}</div>`}
    }
    t.innerHTML += `<div class="rewardBox"><div class="points curr"></div> ${numDisplay( v.curr.gained - v.curr.spent )}</div>`;    
}

function updateTabs(){
    let t = document.querySelector(`#upgrades`);
    t.innerHTML = ``;
    let tb = elem( `tabBox` );
    for( key in span ){
        if( v.reward[span[key].curr] == undefined ){}
        else{ tb.innerHTML += `<div class="tab" data-tab="${key}" data-span="${key}"><div class="s${key} tabIco"></div></div>`}
    }
    tb.innerHTML += `<div class="tab" data-tab="points" data-span="points"><div class="points tabIco"></div></div>`;
    t.appendChild(tb);
    t.appendChild(elem(`tabContents`,``,[[`upgrades`,null]]));
}

function selectJerk( j ){
    clearJerkSelect();
    v.jerkSelected = j;
    document.querySelector(`[data-jerk="${v.jerkSelected}"]`).classList.add(`selectedJerk`);
    let slots = document.querySelectorAll(`.slot`);
    for( let i = 0; i < slots.length; i++ ){ slots[i].classList.add(`selectedSlot`); }
}

function clearJerkSelect(){
    let js = document.querySelectorAll(`[data-jerk]`);
    for( let i = 0; i < js.length; i++ ){ js[i].classList.remove(`selectedJerk`); }
    v.jerkSelected = null;
    let slots = document.querySelectorAll(`.slot`);
    for( let i = 0; i < slots.length; i++ ){ slots[i].classList.remove(`selectedSlot`); }
}

function assignJerk( j, s ){
    for( jerk in v.roster ){ if( v.roster[jerk].assignment == s ){ v.roster[jerk].assignment = null; } }
    v.roster[j].assignment = s;
    clearJerkSelect();
    selectTab( `points` );
    display( v.selected );
}

function unassignJerk( s ){
    for( jerk in v.roster ){ if( v.roster[jerk].assignment == s ){ v.roster[jerk].assignment = null; } }
    selectTab( `points` );
    display( v.selected );
}

function getTraits( s ){
    let o = [];
    for( jerk in v.roster ){ if( v.roster[jerk].assignment == s ){ o = v.roster[jerk].trait } };
    return o;
}

function selectTab( n, m ){
    if( m == undefined ){ m = 0; }
    let t = document.querySelectorAll(`.tab`);
    for( let i = 0; i < t.length; i++ ){ t[i].classList.remove(`active`); }
    document.querySelector(`[data-tab="${n}"]`).classList.add(`active`);
    let d = document.querySelector(`[data-tab="${n}"]`).getAttribute( `data-span` );
    if( span[d] == undefined ){ color = `#656D78`; }
    else{ color = span[d].color; }
    document.documentElement.style.setProperty('--tab', color );
    buildTabContents( d, m );
}

function selectMiniTab( n, d ){
    let t = document.querySelectorAll(`.miniTab`);
    for( let i = 0; i < t.length; i++ ){ t[i].classList.remove(`active`); }
    document.querySelector(`[data-minitab="${n}"]`).classList.add(`active`);
    buildMiniTabContents( n, d );
}

function buildTabContents( n, x ){
    if( n == v.tab ){ x = v.miniTab; }
    if( n ==  null ){ n = `points`; }
    if( x == undefined || x == null ){ x = 0; }
    let t = document.querySelector(`[data-upgrades]`);
    t.innerHTML = ``;
    if( n == `points` ){
        t.appendChild( elem( `upgradeHeading spanLabel`, `Global Upgrades<div class="inlineHeadings"><div class="halfCell">Bought</div><div class="halfCell">Cost</div></div>` ) );
        for( k in Object.keys( v.upgrades ) ){
            let ch = Object.keys(v.upgrades)[k];
            let subj = upgrades.filter( (e) => e.id == ch )[0];
            if( subj !== undefined ){
                if( subj.scope == `global` ){ // global level
                    if( subj.id == `rosterSize` && v.roster.length == 0 ){}
                    else{
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
        }
        t.appendChild( elem( `upgradeHeading spanLabel`, `Cosmic Forces<div class="smaller">${numDisplay( v.roster.length)} / ${numDisplay( getRosterSize() )}</div>` ) );
        t.appendChild( elem( `smallSpanLabel`, `Force Assignments` ) );
        t.appendChild( buildAssignBox() );
        t.appendChild( elem( `smallSpanLabel`, `Dormant Forces` ) );
        t.appendChild( buildRosterBox() );
        if( v.roster.length >= getRosterSize() ){ document.querySelector(`[data-uptype="recruitJerk"]`).parentElement.classList.add(`halfVis`); }
        v.tab = `points`;
        buildTooltips();
        populateTooltips();
        return;
    }
    t.appendChild( elem( `upgradeHeading spanLabel`, `General Upgrades<div class="inlineHeadings"><div class="halfCell">Bought</div><div class="halfCell">Cost</div></div>` ) );
    for( k in Object.keys( v.upgrades[n] ) ){
        let ch = Object.keys(v.upgrades[n])[k];
        let subj = upgrades.filter( (e) => e.id == ch )[0];
        if( subj.scope == `span` ){ // span level
            if( ch == `childReq` && n == 0 ){}
            else if( ch == `childReq` && getTarget( n ) <= 1 ){}
            else{
                let r = elem( `upgradeRow` );
                r.appendChild( elem( `upgrade`, `Buy`, [[`upspan`,n],[`uptype`,ch],[`scope`,`span`]] ) );
                if( upgradeAfford( n, subj.id, null ) ){ r.lastChild.classList.add(`affordable`); }
                r.appendChild( elem( `label bigCell`, subj.nice ) );
                r.appendChild( elem( `stat halfCell`, v.upgrades[n][ch] ) );
                r.appendChild( elem( `stat halfCell`, numDisplay( upgradeCost( n, subj.id, null ) ) ) );
                t.appendChild(r);
            }
        }
    }
    t.appendChild( elem( `upgradeHeading spanLabel`, `Tier Upgrades` ) );
    let mt = elem( `miniTabBox` );
    for( g in gg ){ mt.appendChild( elem( `miniTab`, gg[g], [[`minitab`,g],[`span`,n]] ) ); }
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
            r.appendChild( elem( `upgrade`, `Buy`, [[`upspan`,d],[`uptier`,n],[`uptype`,ch]],[`scope`,`span`] ) );
            if( upgradeAfford( d, subj.id, n ) ){ r.lastChild.classList.add(`affordable`); }
            r.appendChild( elem( `label bigCell`, subj.nice ) );
            r.appendChild( elem( `stat halfCell`, v.upgrades[d][ch][n] ) );
            r.appendChild( elem( `stat halfCell`, numDisplay( upgradeCost( d, subj.id, n ) ) ) );
            t.appendChild(r);
        }
    }
    v.miniTab = n;
    buildTooltips();
}

function buildAssignBox(){
    let o = elem( `assignBox`, ``, [[`assign`,``]] );
    for( let i = 0; i <= v.watermark; i++ ){
        let s = elem( `slot s${i}`, ``, [[`slot`,i]] );
        let j = v.roster.findIndex( e => e.assignment == i );
        if( j !== -1 ){
            s.innerHTML = `<span class="tooltip"><div class="bottom" data-tooltip="${j}">Stats go in here.<i></i></div></span>`;
            s.appendChild( elem( `jerk assigned`, v.roster[j].id, [[`jerk`,j]] ) );
            s.classList.add( `filled` );
        }
        o.appendChild( s );
    }
    return o;
}

function buildRosterBox(){
    let o = elem( `rosterBox`, ``, [[`roster`,``]] );
    for( r in v.roster ){
        if( v.roster[r].assignment == null ){
            let j = elem( `jerk unassigned`, v.roster[r].id + `<span class="tooltip"><div class="bottom" data-tooltip="${r}">Stats go in here.<i></i></div></span>`, [[`jerk`,r]] );
            o.appendChild( j );
        }
    }
    return o;
}

function populateTooltips(){
    for( let i = 0; i < v.roster.length; i++ ){
        let t = document.querySelector(`[data-tooltip="${i}"]`);
        t.innerHTML = `<i></i>`;
        for( j in v.roster[i].trait ){
            t.appendChild( elem( `trait`, v.roster[i].trait[j].verbiage ) );
        }
    }
}

function buildTooltips(){
    let s = document.querySelectorAll(`[data-uptype]`);
    for( let i = 0; i < s.length; i++ ){
        let t = s[i].getAttribute(`data-uptype`);
        s[i].innerHTML = `Buy`;
        let verbiage = upgrades.filter( e => e.id == t )[0].tooltip;
        s[i].innerHTML += `<span class="tooltip"><div class="bottom">${verbiage}<i></i></div></span>`
    }
}

function displayRuns(){
    let t = document.querySelector(`#runs`);
    t.innerHTML = ``;
    for( let i = 0; i <= v.watermark + 1; i++ ){
        let k = Object.keys(span)[i];
        let e = elem( `spanBox` );
            if( i == 0 ){ e.appendChild( elem( `spanLabel`, span[i].label + `<div class="smaller">Max: ${numDisplay( calcZeros() )}</div>` ) ); }
            else{ e.appendChild( elem( `spanLabel`, span[i].label + `<div class="smaller">${completeBalance( Object.keys(span)[i-1] )} / ${getTarget( k )}</div>` ) ); }
            e.appendChild( elem( `spanSubBox`, ``, [[`selector`,k]] ) );
            t.appendChild( e );
    }
    for( r in v.runs ){
        t = document.querySelector(`[data-selector="${v.runs[r].span}"]`);
        t.appendChild( elem( `selector span${v.runs[r].span}`, span[v.runs[r].span].label, [[`select`,r]] ) );
    }
    let s = document.querySelectorAll(`[data-select]`);
    for( let i = 0; i < s.length; i++ ){ s[i].classList.remove(`selected`); }
    document.querySelector(`[data-select="${v.selected}"]`).classList.add(`selected`);
}

function buildContents( index ){
    let o = elem( `selected` );
    let h = elem( `questBox`);
    let q = elem( `questBar` );
        q.appendChild( elem( `barFill` ) );
        q.appendChild( elem( `questText`, v.runs[index].quest.verbiage
        .replace(`Q`,span[v.runs[index].span].curr)
        .replace(`N`,numDisplay( v.runs[index].quest.target ) )
        .replace(`T`, gen[v.runs[index].quest.tier] ) ) );
        h.appendChild( q );
    o.appendChild( h );
    let s = elem( `statBox` );
        s.appendChild( elem( `statRow`, `${span[v.runs[index].span].curr} Held: <a class="num" data-balance=${index}>${numDisplay( balance( index ) )}</a>` ) );
        s.appendChild( elem( `statRow`, `${span[v.runs[index].span].curr} Per Second: <a class="num" data-cps=${index}>${numDisplay( v.runs[index].curr.cps )}</a>` ) );
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
            bR.appendChild( elem( `stat cell`, numDisplay( getSingleCPS( index, i ) ) ) );
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
    if( v.runs[v.selected].quest.complete ){ document.querySelector(`.complete`).innerHTML = `Complete Quest for ${calcReward( v.selected )} <div class="rewardIcon s${v.runs[v.selected].span}"></div>`; }
}

function forgeRings(){
    let rings = document.querySelectorAll(`[data-ringMe]`);
    for( let r = 0; r < rings.length; r++ ){
        let id = rings[r].getAttribute(`data-ringMe`);
        rings[r].outerHTML += `<svg data-ring="${id}" xmlns="http://www.w3.org/2000/svg" class="ring" width="16" height="16"><circle class="circle" data-circle="${id}" cx="8" cy="8" r="4" stroke="var(--span)" stroke-width="8" fill="transparent" /></svg>`;
    }
    offsetRings();
}

function offsetRings(){
    if( v.selected !== null ){
        let circs = document.querySelectorAll(`[data-circle]`);
        for( let i = 0; i < circs.length; i++ ){
            if( v.upgrades[v.runs[v.selected].span].autoBuy[i] == 0 ){ circs[i].classList.add(`noDisplay`); }
            else{
                circs[i].classList.remove(`noDisplay`);
                let p = v.runs[v.selected].auto[`t${i}`] / autoBuyTime( v.runs[v.selected].span, i );
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
    for( let i = 0; i < stat.length; i++ ){
        if( afford( v.selected, i ) ){ document.querySelector(`[data-buy="${i}"]`).classList.add( `available`); }
        else{ document.querySelector(`[data-buy="${i}"]`).classList.remove( `available`); }
    }
}

function scrollScroll(){
    let s = document.querySelectorAll(`.scroll`);
    for( let i = 0; i < s.length; i++ ){
        let newT = parseFloat( s[i].getAttribute(`data-transform`) ) + global.scrollSpeed;
        s[i].setAttribute( `data-transform`, newT );
        s[i].style = `transform: translate( ${newT}px, 0px )`;
        if( newT >= window.innerWidth * 2 ){
            s[i].parentElement.removeChild(s[i]);
            addScroll();
        }
    }
}

function addScroll(){
    let v = shuffle(helpful)[0];
    document.querySelector(`#footer`).appendChild( elem( `scroll` , v, [[`transform`,0]] ) );
}

function spawnClickMe(){
    let arr = [];
    for( key in v.reward ){ arr.push( span.findIndex( e => e.curr == key ) ); }
    if( arr.length > 0 ){
        let nonce = Math.floor( Math.random() * arr.length );
        let e = elem( `clickMe s${arr[nonce]}`, ``, [[`click`,span[nonce].curr]] );
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
        if( d !== null ){ v.reward[span[d].curr] -= upgradeCost( d, type, tier ); }
        else{ v.curr.spent += upgradeCost( d, type, tier ); }
        if( d == null ){
            v.upgrades[type]++;
            if( type == `maxZeros` ){ topUpZeros(); displayRuns(); }
            if( type == `questTarget` ){ adjustQuestTargets(); }
            if( type == `recruitJerk` ){ recruitJerk(); }
        }
        else if( tier == null ){
            v.upgrades[d][type]++;
            if( type == `creepReduce` ){ display( v.selected ); }
        }
        else{
            v.upgrades[d][type][tier]++;
            buildMiniTabContents( tier, d );
            if( type == `scaleDelay` ){ display( v.selected ); }
            if( type == `autoBuy` ){ updateAutoValues(); }
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
    else if( upgradeBalance( span[d].curr ) >= upgradeCost( d, type, tier ) ){ o = true; }
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
            let c = `t` + b;
            if( v.upgrades[v.runs[r].span].autoBuy[b] > 0 ){
                let t = autoBuyTime( v.runs[r].span, b );
                if( v.runs[r].auto[c] == null ){ v.runs[r].auto[c] = t; }
                else if( v.runs[r].auto[c] > autoBuyTime( v.runs[r].span, b ) ){ v.runs[r].auto[c] = t; };
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
    let o = global.spanTarget + Object.keys(span).findIndex( e => e == d );
    if( d !== undefined ){ o -= v.upgrades[d].childReq }
    return o;
}

function recruitJerk(){
    if( v.roster.length < getRosterSize() ){ v.roster.push( new Jerk ); }
}

function getReruitCost(){
    return 5; // revisit
}

function getRosterSize(){
    return global.minRoster + v.upgrades.rosterSize;
}

function nextDef( d ){
    let arr = Object.keys( span );
    let index = arr.findIndex( e => e == d ) + 1;
    return arr[index];
}

function adjustQuestTargets(){
    for( r in v.runs ){
        v.runs[r].quest.target /= 1.05;
    }
    display( v.selected );
}

function calcZeros(){
    return global.zeros + v.upgrades.maxZeros;
}

function autoBuyTime( d, t ){
    let o = global.autoBuy + global.autoBuy * ( t + 1 ) / 2;
    o *= Math.pow( 1 / 1.05, v.upgrades[d].autoBuy[t] );
    let tr = getTraits( d );
    for( a in tr ){ if( tr[a].id == `fastBuy` ){ o *= ( 1 - tr[a].amt ) } }
    o *= ( 1000 / global.tickSpeed );
    o = Math.ceil( o );
    return o;
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
        topUpZeros();
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
    , roster: []
    , upgrades: {}
    , ms: { start: 0, last: 0 }
    , curr: { gained: 0, spent: 0 }
    , reward: {}
    , completed: {}
    , spent: {}
    , selected: null
    , jerkSelected: null
    , tab: null
    , miniTab: null
    , clickTimer: 10000
    , spawnChance: 1 / 10000
    , watermark: 0    
    , multi: 0
}

const global = {
    scale: { buy: 1.1, buyScale: 1.0543046, cost: 2.5, add: 2, ranks: 10, span: 1.5 } // 1.05361025 to reach 250k
    , tickSpeed: 50
    , spanTarget: 5
    , zeros: 1
    , godMode: 1
    , autoComplete: 120
    , autoBuy: 10
    , graceTicks: -10
    , buyEvery: 1
    , minRoster: 1
    , scrollSpeed: 3
}

const upgrades = [
    {   id: `maxZeros`,     scope: `global`,    cost: 1,    benefit: 1,     multi: 5,       math: `add`,        nice: `Quantum Limit`,      tooltip: `Increase the max number of Quantum by 1` } //
    , { id: `questTarget`,  scope: `global`,    cost: 5,    benefit: 1.05,  multi: 2,       math: `multiply`,   nice: `Quest Targets`,      tooltip: `Reduce the targets of all Quests by 5%` } // consider making Span rather than Global
    , { id: `clickSpawn`,   scope: `global`,    cost: 3,    benefit: 1.05,  multi: 1.5,     math: `multiply`,   nice: `Clickables`,         tooltip: `Increase the spawn rate of clickables by 5%` } //
    , { id: `rosterSize`,   scope: `global`,    cost: 4,    benefit: 1,     multi: 2.5,     math: `add`,        nice: `Roster Size`,        tooltip: `Increase your Cosmic Forces roster limit by 1` } //
    , { id: `skillTypes`,   scope: `global`,    cost: 3,    benefit: 1,     multi: 2.5,     math: `add`,        nice: `Max Force Traits`,   tooltip: `Increase the number of Traits a Force can have by 1` } //
    , { id: `recruitJerk`,  scope: `global`,    cost: 5,    benefit: 1,     multi: 1.2,     math: `add`,        nice: `Recruit Force`,      tooltip: `Add one Cosmic Force to your roster` } 
    , { id: `startCash`,    scope: `span`,      cost: 5,    benefit: 2.5,   multi: 1.5,     math: `multiply`,   nice: `Start Wealth`,       tooltip: `Double the amount of resource you start with` } //
    , { id: `autoComplete`, scope: `span`,      cost: 10,   benefit: 1.1,   multi: 2,       math: `divide`,     nice: `Auto-Complete`,      tooltip: `Enable / Speed Up auto-completion by 10%` } //
    , { id: `childReq`,     scope: `span`,      cost: 10,   benefit: 1,     multi: 2.5,     math: `subtract`,   nice: `Children Required`,  tooltip: `Reduce the lower-level completions required by 1` } //
    , { id: `autoBuy`,      scope: `tier`,      cost: 5,    benefit: 1.1,   multi: 1.125,   math: `divide`,     nice: `Auto Buyer`,         tooltip: `Enable / Spped up auto-buying by 10%` } //
    , { id: `scaleDelay`,   scope: `tier`,      cost: 5,    benefit: 1,     multi: 1.5,     math: `add`,        nice: `Scale Delay`,        tooltip: `Delay the start of cost scaling by 1 (more)` } //
    , { id: `creepReduce`,  scope: `tier`,      cost: 10,   benefit: 1.05,  multi: 2.5,     math: `divide`,     nice: `Cost Scaling`,       tooltip: `Reduce the amount by which costs scale by 5%` } //
    , { id: `bulkBonus`,    scope: `tier`,      cost: 10,   benefit: 1.005, multi: 2,       math: `multiply`,   nice: `Bulk Bonus`,         tooltip: `Increase output by 0.5% × total owned` } // power of a power - be careful with scaling
    // clickMe tilting
]

const stat = [ { cost: 10, adds: 1 } ]

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
      { basis: `gained`,    target: 1e7, verbiage: `Generate N Q` }
    , { basis: `balance`,   target: 1e6, verbiage: `Hold N Q` }
    , { basis: `cps`,       target: 1e4, verbiage: `Reach N Q Per Second` }
    , { basis: `spent`,     target: 5e6, verbiage: `Spend N Q` }
    , { basis: `buy1Gen`,   target: [{a:70,t:0},{a:65,t:1},{a:60,t:2},{a:55,t:3},{a:50,t:4},{a:45,t:5},{a:40,t:6},{a:30,t:7},{a:20,t:8},{a:10,t:9}], verbiage: `Buy N T Generators`}
    // buy N Generators of Tier Y through Z
    // spend 500 Thousand Q in a single purchase
]

const gen = [`Tier I`,`Tier II`,`Tier III`,`Tier IV`,`Tier V`,`Tier VI`,`Tier VII`,`Tier VIII`,`Tier IX`,`Tier X`];
const gg = [`I`,`II`,`III`,`IV`,`V`,`VI`,`VII`,`VIII`,`IX`,`X`];

const jerkTraits = [
    { id: `fastBuy`, significance: 0.05, scope: `tier`, verbiage: `#% faster @ auto-buy` }
    , { id: `moreOutput`, significance: 0.1, scope: `tier`, verbiage: `#% more output from @` }
    , { id: `lessScale`, significance: 0.05, scope: `tier`, verbiage: `#% slower scaling on @` }
    , { id: `flatDiscount`, significance: 0.05, scope: `tier`, verbiage: `#% discount on @` }
    // , { id: `boughtBoost`, significance: 1, scope: `tier` }  // move to span tier upgrade
    , { id: `overallOutput`, significance: 0.05, scope: `span`, verbiage: `All Tiers #% more output` }
    // , { id: `startCash`, significance: 0.25, scope: `span` }
    // , { id: `questEase`, significance: 0.025, scope: `span` }
]

class Quest{
    constructor( d ){
        let q = questDef[Math.floor( Math.random() * questDef.length )];
        let w = Object.keys( span ).findIndex( (e) => e == d );
        if( q.basis == `buy1Gen` ){
            let n = Math.floor( Math.random() * q.target.length );
            this.target = Math.floor( q.target[n].a * Math.pow( global.scale.span, w ) / Math.pow( 1.05, v.upgrades.questTarget ) );
            this.tier = q.target[n].t;
        }
        else{
            this.target = Math.floor( q.target * Math.pow( global.scale.span, w ) ) / Math.pow( 1.05, v.upgrades.questTarget );
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
        this.span = d;
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
        let w = Object.keys( span ).findIndex( (e) => e == d );        
        if( v.watermark < w ){
            v.watermark = w;
            setIco(w);
        }
    }
}

class Jerk{
    constructor(){
        this.id = String.fromCharCode( 945 + v.roster.length );
        this.traitCount = traitCount();
        this.buyType = shuffle([`ascending`, `descending`, `cheapest`, `dearest`, `random`])[0];
        this.trait = [];
        let strength = 0;
        for( let i = 0; i < this.traitCount; i++ ){
            let selection = shuffle(jerkTraits)[0];
            let nonce = Math.random() * 10;
            let amt = Math.ceil( nonce / Math.pow( 1.25, this.traitCount ) ) * selection.significance;
            let t = Math.floor( Math.random() * stat.length );
            this.trait.push( 
                { id: selection.id, amt: amt, t: t, verbiage: selection.verbiage.replace( `#`, ( amt * 100 ).toFixed(0) ).replace( `@`, gen[t] )
                } );
            strength += Math.ceil( nonce / Math.pow( 1.25, this.traitCount ) );
        }
        this.strength = strength / this.traitCount;
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
    link.href = `./${w}.png`;
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
            for( d in span ){
                if( upgrades[u].scope == `span` ){
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
    , `Click the Auto Buy timer circle to pause / unpause one Tier`
    , `Click the Auto Buy icon at the top of the column to pause / unpause all`
    , `Buy Generators fast by pressing the number on your keyboard`
    , `Cosmic Forces are a big investment for a potentially massive impact`
    , `You will generate resource while offline, but automation only applies to an open window`
    , `Rewards are based on how much resource you hold`
    , `Bulk Bonus upgrades reward owning a lot of a particular Tier`
    , `You gain one <div class="inlineIcon points"></div> for every completion`
    , `Assign a Cosmic Force to gain its benefit`


    , `These messages may be better scrolling in the other direction`
    , `59 6F 75 20 77 65 6E 74 20 74 6F 20 61 20 6C 6F 74 20 6F 66 20 74 72 6F 75 62 6C 65 20 74 6F 20 72 65 61 64 20 74 68 69 73 2E 2E 2E`
    , `Humorous messages will appear here... focussing on features at the sec`
]

/*

TODO
Run progress bar in side menu
Cap and drip release Def above the first (so you can't have seven)
Managers...
More Complex Quests
More Upgrade types
Rewards random-spawn

Anti-matter
Energy
Dark Energy
Dark Matter


~~ UPGRADES ~~
~ DEF ~
Reduce scaling severity of each Tier


Per managed def auto-buyer timer + bar
- decide on next purchase (show it)
- count down to buy
- attempt a buy (can fail if user is active)

*/