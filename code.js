document.addEventListener(`DOMContentLoaded`, function () { onLoad(); } );
window.addEventListener("mousedown", function (e) { clicked( e ); v.mouseDown = true; } );
window.addEventListener("mouseup", function (e) { resetHold(); } );
window.addEventListener("keydown", function(e) { pressed( e ) } );

function onLoad(){
    loadMeta();
    extrapolateMeta();
    buildStat();
    loadState();
    displayRewards();
    updateTabs();
    if( v.tab !== null ){ selectTab( v.tab, v.miniTab ); }
    setInterval(() => { doLoop( now() ); }, global.tickSpeed );
    resetHold();
    displayWings();
    addScroll();
    topUpZeros();
    primeSlots();
    if( v.selected == null ){ display( 0 ); }
    else{ display( v.selected ); }
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
    if( c.contains(`autoBuy`) ){ pauseAuto( v.selected ); }
    if( c.contains(`ring`) ){ pauseAuto( v.selected, t.getAttribute(`data-ring` ) ); }
    if( c.contains(`slot`) && v.jerkSelected !== null ){ assignJerk( v.jerkSelected, t.getAttribute(`data-slot` ) ); }
    if( c.contains(`restart`) ){ doItAllOverAgain(); }
    if( c.contains(`slider`) ){ toggleFeature( t.getAttribute(`data-feature`), t.parentElement.children[0].checked, t.getAttribute(`data-feature-group`) ); }
    if( c.contains(`buyU`) ){ buyFeature( t.getAttribute(`data-feature`), t.getAttribute(`data-feature-group`) ); }
    if( c.contains(`abandon`) ){ recreateRun( v.selected ); }
    if( c.contains(`confirm`) ){ renderUndex(); }
    if( c.contains(`prestige`) ){ safetyOff(); }
    if( c.contains(`refreshMe`) ){ location.reload(); }
    if( c.contains(`gift`) ){ claimGift(); }
    if( c.contains(`slots`) ){ claimSlots(); }
    if( c.contains(`spinner`) ){ spinToWin(); }
    if( c.contains(`spin`) ){ spinSlots(); }
    else if( c.contains(`recreate`) && v.jerkSelected !== null ){ recreateJerk( v.jerkSelected ); }
    else if( c.contains(`tooltip`) ){
        t = t.parentElement;
        c = t.classList;
        if( c.contains(`upgrade`) ){ buyUpgrade( t.getAttribute(`data-upspan`), t.getAttribute(`data-uptype`), t.getAttribute(`data-uptier`) ); }
        if( c.contains(`slot`) && v.jerkSelected !== null ){ assignJerk( v.jerkSelected, t.getAttribute(`data-slot` ) ); }
        else if( c.contains(`unassigned`) ){ selectJerk( t.getAttribute(`data-jerk` ) ); }
        else if( c.contains(`slot`) && v.jerkSelected == null ){ unassignJerk( t.getAttribute(`data-slot` ) ); }
        else{ clearJerkSelect(); }
    }
    else{ clearJerkSelect(); }
}

function pressed(e){
    let valid = [0,1,2,3,4,5,6,7,8,9];
    if( valid.findIndex( ee => ee == e.key ) !== -1 ){
        if( e.key == 0 ){ buy( v.selected, 9, false ); }
        else{ buy( v.selected, e.key - 1, false ); }
    }
}

function doLoop( tick ){
    if( global.paused ){}
    else{
        let b = 0;
        if( v.bonus.length > 0 ){
            for( i in v.bonus ){ if( v.bonus[i].type == `doubleTime` ){ b++; }; }
        }
        let delta = ( tick - v.ms.last ) * global.godMode * Math.pow( 2, b );
        earn( delta );
        progress();
        countdownAbandon( delta );
        showStats();
        if( Math.random() < global.spawnChance * Math.pow( getBenefit( `clickSpawn` ), v.upgrades.clickSpawn ) ){ spawnClickMe(); }
        if( Math.random() < global.giftChance * Math.log10(v.runs.length) ){ if( v.spins >= 0 ){ if( Math.random() > 0.5 || vCompelted() < 25 ){ v.giftDue = true; } else{ v.slotsDue = true; }; switches.displayRewards = true; } else{ v.spins = 0; } }
        if( tick % 50 == 0 ){ saveState(); }
        if( tick % 1200 == 0 ){ offlineSnapshot(); }
        v.ms.last = tick;
        if( switches.display ){ display( v.selected); }
        if( switches.updateDisplay ){ updateDisplay(); }
        if( switches.displayRewards ){ displayRewards(); }
        if( switches.tabUpdate ){ updateTabDisplay(); }
        if( switches.updateRuns ){ displayRuns(); }
        if( switches.updateTabButtons ){ updateTabButtons(); }
        updateButtons();
    }
    scrollScroll();
}

function earn( ticks ){
    let quanta = ticks * ( global.tickSpeed / 1000 );
    for( r in v.runs ){
        v.runs[r].curr.gained += v.runs[r].curr.cps * quanta;
    }
}

function countdownAbandon( ticks ){
    let quanta = Math.ceil( ticks * ( global.tickSpeed / 1000 ) );
    for( i in v.abandonTime ){
        if( v.abandonTime[i] == 0 ){}
        else if( v.abandonTime[i] > 0 ){ 
            v.abandonTime[i] -= quanta;
            if( v.abandonTime[i] <= 0 ){ 
                v.abandonTime[i] = 0;
                if( v.runs[v.selected].span == i ){
                    document.querySelector(`[data-abandon]`).classList.add(`available`);
                }
            }
        }
    }
}

function progress(){
    for( r in v.runs ){
        if( v.runs[r].quest.complete ){
            if( v.runs[r].completeIn !== undefined ){
                if( v.runs[r].completeIn <= 0 ){ complete( r, true ); }
                else{
                    v.runs[r].completeIn--;
                    if( r == v.selected ){ updateCompleting(); }
                }
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
                case `own`:
                    v.runs[r].quest.progress = Math.min( 1, v.runs[r].gen.reduce( ( a, b ) => a + b ) / v.runs[r].quest.target );
                break;
                case `gained`:
                    v.runs[r].quest.progress = Math.min( 1, v.runs[r].curr.gained / v.runs[r].quest.target );
                break;
                case `spent`:
                    v.runs[r].quest.progress = Math.min( 1, v.runs[r].curr.spent / v.runs[r].quest.target );
                break;
                case `spend`:
                    let x = 0;
                    for( let i = 0; i < global.ranks; i++ ){
                        if( v.runs[r].gen[i] > 0 ){
                            let c = cost( r, i ) / global.scale.buy; 
                            if( c > x ){ x = c; }
                        }
                    }
                    v.runs[r].quest.progress = Math.min( 1, x / Math.floor( v.runs[r].quest.target ) );
                break;
                case `buy1Gen`:
                    let t = v.runs[r].quest.tier;
                    v.runs[r].quest.progress = Math.min( 1, v.runs[r].gen[t] / Math.floor( v.runs[r].quest.target ) );
                    break;
                case `buyNGen`:
                    let ts = v.runs[r].quest.tier;
                    let tt = Math.floor( v.runs[r].quest.target ) * ( ts + 1 );
                    let ta = 0;
                    for( let i = ts; i >= 0; i-- ){ ta += Math.min( v.runs[r].gen[i], Math.floor( v.runs[r].quest.target ) ); }
                    v.runs[r].quest.progress = Math.min( 1, ta / tt );
                break;
                case `buyXGen`:
                    let xa = 0;
                    for( let i = global.ranks - 1; i >= 0; i-- ){ if( v.runs[r].gen[i] > xa ){ xa = Math.min( v.runs[r].gen[i], Math.floor( v.runs[r].quest.target ) ); } }
                    v.runs[r].quest.progress = Math.min( 1, xa / Math.floor( v.runs[r].quest.target ) );
                break;
            }
            if( v.runs[r].quest.progress >= 1 ){
                v.runs[r].quest.complete = true;
                if( v.upgrades[v.runs[r].span].autoComplete > 0 ){
                    v.runs[r].completeIn = getAutoCompleteTime( r );
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
    switches.bonusDisplay = false;
    for( b in v.bonus ){
        if( ( v.bonus[b].type == `5x` || v.bonus[b].type == `25x` ) && v.slotSpins > 0 ){}
        else{
            v.bonus[b].remaining--;
            if( v.bonus[b].remaining == 0 ){ v.bonus.splice(b,1); }
            else if( v.bonus[b].remaining <= -200 ){ v.bonus.splice(b,1); }
            switches.bonusDisplay = true;
        }
    }
    offsetRings();
    displayProgress();
}

function getAutoCompleteTime( r, s ){
    let raw = global.autoComplete * ( 1000 / global.tickSpeed );
    if( s == undefined ){ s = v.runs[r].span; }
    let b = 0;
    for( i in v.bonus ){ if( v.bonus[i].type == `fastAuto` ){ b++; } };
    return Math.ceil( raw * Math.pow( 0.8, v.upgrades[s].autoComplete - 1 ) ) * Math.pow( 0.75, v.upgrades[s].rebirthSpan ) / Math.pow( 2, b );
}

function displayProgress(){
    document.querySelector(`.barFill`).style.width = `${v.runs[v.selected].quest.progress * 100}%`;
    if( v.runs[v.selected].quest.complete ){ displayComplete(); }
}

function displayComplete(){
    document.querySelector(`.completeBox`).classList.remove(`noDisplay`);
}

function buy( ii, g, auto ){
    ii = parseInt( ii );
    if( afford( ii, g ) ){
        v.runs[ii].curr.spent += cost( ii, g );
        v.runs[ii].gen[g]++;
        updateCPS( ii );
        if( auto && ii !== v.selected ){}
        else{ switches.updateDisplay = true; }
    }
}

function afford( index, g ){
    return balance( index ) >= cost( index, g );
}

function cost( index, g ){
    let sD = 0;
    if( v.upgrades[v.runs[index].span].scaleDelay !== undefined ){ sD = v.upgrades[v.runs[index].span].scaleDelay[g]; }
    let n = Math.max( 0, v.runs[index].gen[g] - sD );
    let div = 1;
    let tr = getTraits( v.runs[index].span );
    let multi = 1;
    for( a in tr ){
        if( tr[a].id == `lessScale` && g == tr[a].t ){ div *= ( 1 + tr[a].amt ); }
        if( tr[a].id == `flatDiscount` && g == tr[a].t ){ multi *= ( 1 - tr[a].amt ); }
        if( tr[a].id == `overallDiscount` ){ multi *= ( 1 - tr[a].amt ); }
    }
    let d = 1 / ( 1 + ( v.upgrades[v.runs[index].span].creepReduce[g] * 0.1 ) ) / div;
    return Math.pow( Math.pow( global.scale.buy, d ), n ) * ( stat[g].cost * multi );
}

function uCost( span, g ){
    let n = v.upgrades[span].headStart[g];
    return Math.ceil( Math.pow( global.scale.buy, n ) * stat[g].cost );
}

function getBenefit( up ){
    return upgrades.filter( e => e.id == up )[0].benefit;
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

function netReward( c ){
    return v.reward[c].gained - v.reward[c].spent;
}

function updateCPS( index ){
    let cps = 0;
    for( i in v.runs[index].gen ){
        cps += getCPS( index, i, false );
    }
    let tr = getTraits( v.runs[index].span );
    for( a in tr ){ if( tr[a].id == `trickleIncome` ){ cps += tr[a].amt * 100 * ( 1 + meta.laps ); } }
    v.runs[index].curr.cps = Math.floor( cps );
}

function getCPS( index, i ){
    let o = v.runs[index].gen[i] * getSingleCPS( index, i );
    return o
}

function getSingleCPS( index, i ){
    let o = stat[i].adds * Math.pow( Math.pow( getBenefit( `bulkBonus` ), v.upgrades[v.runs[index].span].bulkBonus[i] ), v.runs[index].gen[i] );
    let tr = getTraits( v.runs[index].span );
    for( a in tr ){
        if( tr[a].id == `moreOutput` && i == tr[a].t ){ o *= ( 1 + tr[a].amt ) }
        if( tr[a].id == `overallOutput` ){ o *= ( 1 + tr[a].amt ) }        
    }
    let speedBoost = 1;
    if( v.upgrades[v.runs[index].span].speedBonus > 0 ){ speedBoost += v.upgrades[v.runs[index].span].speedBonus / Math.log( 1 + Math.max( 0.0001, v.fastest[v.runs[index].span] ) / 25 ); }
    let b = 0;
    if( v.bonus.length > 0 ){ for( x in v.bonus ){ if( v.bonus[x].type == `output` ){ b++; }; } }
    return o * Math.pow( 10, v.multi ) * Math.pow( 5, v.upgrades[v.runs[index].span].rebirthSpan ) * ( 1 + meta.laps ) * Math.pow( 10, b ) * speedBoost;
}

function calcReward( index ){
    let o = Math.floor( Math.log10( balance( index ) ) );
    if( isNaN( o ) ){ o = 5; }
    for( i in v.bonus ){
        if( v.slotSpins <= 0 ){
            if( v.bonus[i].type == `5x` ){ if( v.bonus[i].subtype.replace(`s`,``) == v.runs[index].span ){ o *= 5; } }
            if( v.bonus[i].type == `25x` ){ if( v.bonus[i].subtype.replace(`s`,``) == v.runs[index].span ){ o *= 25; } }
        }
    }
    return o;
}

function complete( ind, auto ){
    if( !v.runs[ind].quest.complete ){ return; }
    let d = parseFloat( JSON.parse( JSON.stringify( v.runs[ind].span ) ) );
    let time = parseInt( JSON.parse( JSON.stringify( now() - v.runs[ind].quest.commence ) ) );
    if( time < v.fastest[d] || v.fastest[d] == 0 ){ v.fastest[d] = Math.max( time, 1 ); }
    if( v.reward[span[d].curr] == undefined ){ v.reward[span[d].curr] = { gained: 0, spent: 0 }; }
    v.reward[span[d].curr].gained += calcReward( ind );
    if( v.completed[d] == undefined ){ v.completed[d] = 1; updateTabs(); }
    else{ v.completed[d]++; }
    let amt = 1;
    for( i in v.bonus ){
        if( v.slotSpins <= 0 ){
            if( v.bonus[i].type == `5x` ){ if( v.bonus[i].subtype == `points` ){ amt *= 5; } }
            if( v.bonus[i].type == `25x` ){ if( v.bonus[i].subtype == `points` ){ amt *= 25; } }
        }
    }
    v.curr.gained += amt;
    v.runs.splice(ind,1)
    let nextSelection = Math.max( 0, v.runs.findIndex( e => e.span == d ) );    
    if( !auto ){ v.selected = nextSelection; switches.display = true; }
    else if( ind == v.selected ){ v.selected = nextSelection; switches.display = true; }
    else if( v.selected >= ind ){ v.selected--; switches.display = true; }
    topUpZeros();
    spawnCheck();
    switches.tabUpdate = true;
    switches.updateRuns = true;
    switches.displayRewards = true;
    switches.updateTabButtons = true;
    displayWings();
}

function offlineSnapshot(){
    let obj = { time: now(), points: v.curr.gained }
    for( i in span ){ let n = 0; if( v.reward[span[i].curr] !== undefined ){ n = v.reward[span[i].curr].gained; }; obj[span[i].curr] = n; }
    v.snaps.push( obj );
    if( v.snaps.length >= 60 ){ v.snaps.shift(); }
}

function offlineProgress( ms ){
    let mins = Math.ceil( ms / 1000 / 60 );
    let multi = 1;
    let l = v.snaps.length;
    if( l.length == 0 ){ return; }
    if( l < mins ){ multi = mins / l; mins = v.snaps.length; }
    let d = {}
    for( i in v.snaps[0] ){ if( v.snaps[l-mins][i] !== undefined && v.snaps[l-1][i] !== undefined ){ d[i] = Math.ceil( ( v.snaps[l-1][i] - v.snaps[l-mins][i] ) * multi ) } else{ d[i] = 0; } }
    v.curr.gained += d.points;
    for( r in v.reward ){ if( d[r] != undefined ){ v.reward[r].gained += d[r] } }
    switches.displayRewards = true;
    switches.updateDisplay = true;
    switches.updateRuns = true;
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
        let nxt = nextDef( r );
        let target = getTarget( nxt );
        if( v.completed[r] >= target ){
            if( v.runs.filter( e => e.span == nxt ).length < global.tierLimit ){
                v.completed[r] -= target;
                v.runs.push( new Run( nxt ) );
                updateCPS( v.runs.length - 1 );
            }
        }
    }
}

function vCompelted(){
    let o = 0;
    for( i in v.completed ){ o += v.completed[i]; }
    return o;
}

function topUpZeros(){
    let h = calcZeros() - v.runs.filter( (e) => e.span == 0 ).length;
    for( let i = 0; i < h; i++ ){
        v.runs.push( new Run( 0 ) );
        updateCPS( v.runs.length - 1 );
    }
    for( r in v.runs ){ if( v.runs[r].quest.target < 1 ){ v.runs[r].quest.target = 1 } }
}

function clickReward( type, t ){
    v.reward[type].gained++;
    t.parentElement.removeChild(t);
    switches.tabUpdate = true;
    switches.displayRewards = true;
}

function display( index ){
    v.selected = parseInt( index );
    let t = document.querySelector(`#selected`);
    t.innerHTML = ``;
    t.appendChild( buildContents( v.selected ) );
    forgeRings();
    ringPauseDisplay();
    switches.updateRuns = true;
    displayProgress();
    showStats();
    document.documentElement.style.setProperty('--span', span[v.runs[index].span].color );
    updateCompleting();
    offsetRings();
    switches.display = false;
}

function updateDisplay(){
    let ind = parseInt( v.selected );
    for( i in stat ){
        document.querySelector(`[data-owned="${i}"]`).innerHTML = numDisplay( v.runs[ind].gen[i] );
        document.querySelector(`[data-cost="${i}"]`).innerHTML = numDisplay( cost( ind, i ) );
        document.querySelector(`[data-income="${i}"]`).innerHTML = numDisplay( getSingleCPS( ind, i ), true );
    }
    switches.updateDisplay = false;
}

function displayRewards(){
    let t = document.querySelector(`#header`);
    t.innerHTML = ``;
    for( key in span ){
        let type = span[key].curr;
        if( v.reward[type] == undefined ){}
        else{ t.innerHTML += `<div class="rewardBox"><div class="s${key} curr"></div> ${numDisplay( netReward( type ) )}</div>`}
    }
    if( v.giftDue ){ t.innerHTML += `<div class="rewardBox"><div class="gift"></div><div class="points curr"></div> ${numDisplay( v.curr.gained - v.curr.spent )}</div>`; }
    else if( v.slotsDue ){ t.innerHTML += `<div class="rewardBox"><div class="slots"></div><div class="points curr"></div> ${numDisplay( v.curr.gained - v.curr.spent )}</div>`; }
    else{ t.innerHTML += `<div class="rewardBox"><div class="points curr"></div> ${numDisplay( v.curr.gained - v.curr.spent )}</div>`; }
    let u = document.querySelectorAll(`[data-curr]`);
    for( let i = 0; i < u.length; i++ ){ u[i].innerHTML = numDisplay( netReward( span[v.tab].curr ) ) };
    switches.displayRewards = false;
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
    if( v.tab !== null ){ selectTab( v.tab, v.miniTab ); }
}

function selectJerk( j ){
    clearJerkSelect();
    v.jerkSelected = j;
    document.documentElement.classList.add(`jerkCursor`);
    // document.documentElement.style.cursor = `url('./jerkTiny.png'),auto`;
    // document.querySelector(`[data-jerk="${v.jerkSelected}"]`).classList.add(`selectedJerk`);
    document.querySelector(`[data-jerk="${v.jerkSelected}"]`).classList.add(`invis`);
    let slots = document.querySelectorAll(`.slot`);
    for( let i = 0; i < slots.length; i++ ){ slots[i].classList.add(`selectedSlot`); }
    document.querySelector(`.recreate`).classList.add(`selectedSlot`);
}

function clearJerkSelect(){
    let js = document.querySelectorAll(`[data-jerk]`);
    for( let i = 0; i < js.length; i++ ){ js[i].classList.remove(`selectedJerk`); js[i].classList.remove(`invis`); }
    document.documentElement.classList.remove(`jerkCursor`);
    v.jerkSelected = null;
    let slots = document.querySelectorAll(`.slot`);
    for( let i = 0; i < slots.length; i++ ){ slots[i].classList.remove(`selectedSlot`); }
    if( document.querySelector(`.recreate`) !== null ){ document.querySelector(`.recreate`).classList.remove(`selectedSlot`); }
    document.documentElement.style.cursor = '';
}

function assignJerk( j, s ){
    for( jerk in v.roster ){ if( v.roster[jerk].assignment == s ){ v.roster[jerk].assignment = null; } }
    v.roster[j].assignment = s;
    clearJerkSelect();
    updateCPS( v.selected )
    selectTab( v.tab );
    switches.updateDisplay = true;
}

function unassignJerk( s ){
    for( jerk in v.roster ){ if( v.roster[jerk].assignment == s ){ v.roster[jerk].assignment = null; } }
    updateCPS( v.selected )
    selectTab( v.tab );
    switches.updateDisplay = true;
}

function getTraits( s ){
    let o = [];
    for( jerk in v.roster ){ if( v.roster[jerk].assignment == s ){ o = v.roster[jerk].trait } };
    return o;
}

function selectTab( n, m ){
    if( v.curr.gained > 0 ){
        if( m == undefined ){ m = 0; }
        if( n == undefined ){ n = 0; }
        let t = document.querySelectorAll(`.tab`);
        for( let i = 0; i < t.length; i++ ){ t[i].classList.remove(`active`); }
        document.querySelector(`[data-tab="${n}"]`).classList.add(`active`);
        let d = document.querySelector(`[data-tab="${n}"]`).getAttribute( `data-span` );
        if( span[d] == undefined ){ color = `#656D78`; }
        else{ color = span[d].color; }
        document.documentElement.style.setProperty('--tab', color );
        buildTabContents( d, m );
        if( v.tab !== `points` ){ document.querySelector(`[data-name]`).innerHTML = `${span[v.tab].label} Upgrades<div class="currDisplay" data-curr="${v.tab}">${numDisplay( netReward( span[v.tab].curr ) )}</div>`; }
    }
}

function updateTabDisplay(){
    if( v.tab == `points` ){
        for( i in upgrades ){
            if( upgrades[i].scope == `global` && !upgrades[i].locked ){
                let id = upgrades[i].id;
                document.querySelector(`[data-global-bought="${id}"]`).innerHTML = numDisplay( v.upgrades[id] );
                document.querySelector(`[data-global-cost="${id}"]`).innerHTML = numDisplay( upgradeCost( null, id, null ) );
            }
        }
    }
    else{
        let s = v.tab;
        let m = v.miniTab;
        for( i in upgrades ){
            let id = upgrades[i].id;
            if( upgrades[i].scope == `span` && !upgrades[i].locked ){
                if( document.querySelector(`[data-span-bought="${id}"]`) == null ){}
                else{
                    document.querySelector(`[data-span-bought="${id}"]`).innerHTML = numDisplay( v.upgrades[s][id] );
                    document.querySelector(`[data-span-cost="${id}"]`).innerHTML = numDisplay( upgradeCost( s, id, null ) );
                }
            }
            if( upgrades[i].scope == `tier` && !upgrades[i].locked ){
                if( document.querySelector(`[data-span-bought="${id}"]`) == null ){}
                else{
                    document.querySelector(`[data-tier-bought="${id}"]`).innerHTML = numDisplay( v.upgrades[s][id][m] );
                    document.querySelector(`[data-tier-cost="${id}"]`).innerHTML = numDisplay( upgradeCost( s, id, m ) );
                }
            }
        }
    }
    switches.tabUpdate = false;
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
                    let r = elem( `upgradeRow` );
                    r.appendChild( elem( `upgrade`, `Buy`, [[`uptype`,ch],[`scope`,`global`]] ) );
                    if( upgradeAfford( null, subj.id, null ) ){ r.lastChild.classList.add(`affordable`); }
                    r.appendChild( elem( `label bigCell`, subj.nice ) );
                    r.appendChild( elem( `stat halfCell`, v.upgrades[ch], [[`global-bought`,ch]] ) );
                    r.appendChild( elem( `stat halfCell`, numDisplay( upgradeCost( null, subj.id, null ) ), [[`global-cost`,ch]] ) );
                    t.appendChild(r);
                }
            }
        }
        t.appendChild( elem( `upgradeHeading spanLabel`, `Cosmic Forces` ) );
        t.appendChild( elem( `smallSpanLabel`, `Force Assignments` ) );
        t.appendChild( buildAssignBox() );
        t.appendChild( elem( `smallSpanLabel`, `Dormant Forces` ) );
        t.appendChild( buildRosterBox() );
        t.appendChild( elem( `smallSpanLabel`, `<a class="combined">Spend ${numDisplay( getRecreateCost() )}<div class="points costIcon"></div> to recreate a Cosmic Force:</a><div class="recreate"></div>` ) );
        v.tab = `points`;
        buildTooltips();
        populateTooltips();
        return;
    }
    t.appendChild( elem( `upgradeTitle`, `General Upgrades`, [[`name`,x]] ) );
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
                r.appendChild( elem( `stat halfCell`, v.upgrades[n][ch], [[`span-bought`,ch]] ) );
                r.appendChild( elem( `stat halfCell`, numDisplay( upgradeCost( n, subj.id, null ) ), [[`span-cost`,ch]] ) );
                t.appendChild(r);
            }
        }
    }
    if( n == 9 ){
        let xr = elem( `upgradeRow` );
        xr.appendChild( elem( `prestige`, `Commit` ) );
        xr.lastChild.classList.add(`affordable`);
        xr.appendChild( elem( `label bigCell`, `Rebuild Scalar` ) );
        xr.appendChild( elem( `stat halfCell`, numDisplay( meta.laps ) ) );
        xr.appendChild( elem( `stat halfCell`, 0 ) );
        t.appendChild(xr);
    }
    t.appendChild( elem( `upgradeHeading spanLabel`, `Tier Upgrades<div class="inlineHeadings"><div class="halfCell">Bought</div><div class="halfCell">Cost</div></div>` ) );
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
            r.appendChild( elem( `stat halfCell`, v.upgrades[d][ch][n], [[`tier-bought`,ch]] ) );
            r.appendChild( elem( `stat halfCell`, numDisplay( upgradeCost( d, subj.id, n ) ), [[`tier-cost`,ch]] ) );
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
    for( let i = Math.min( 9, v.watermark + 1 ); i >= 0; i-- ){
        let k = Object.keys(span)[i];
        let e = elem( `spanBox` );
            if( i == 0 ){ e.appendChild( elem( `spanLabel`, span[i].label + `<div class="smaller">Max: ${numDisplay( calcZeros() )}</div>` ) ); }
            else if( i == 9 ){ e.appendChild( elem( `spanLabel`, span[i].label + `<div class="smaller">${numDisplay( completeBalance( Object.keys(span)[i-1] ) )} / ${getTarget( k )}</div>` ) ); }
            else{ e.appendChild( elem( `spanLabel`, span[i].label + `<div class="smaller">${numDisplay( completeBalance( Object.keys(span)[i-1] ) )} / ${getTarget( k )}</div>` ) ); }
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
    switches.updateRuns = false;
}

function buildContents( index ){
    let o = elem( `selected` );
    let h = elem( `questBox`);
    let qq = span[v.runs[index].span].curr;
    let q2 = qq;
    if( qq.substring(qq.length,qq.length-1) == `s` ){ q2 = qq.substring(0,qq.length-1); }
    let q = elem( `questBar` );
    q.appendChild( elem( `completing` ) );
    let q3 = elem( `barFillBox` );
    q3.appendChild( elem( `barFill` ) );
    q.appendChild( q3 );
    q.appendChild( elem( `questText`, v.runs[index].quest.verbiage
    .replace(`Q`,qq)
    .replace(`!`,q2)
    .replace(`N`,numDisplay( v.runs[index].quest.target ) )
    .replace(`$`, gen[v.runs[index].quest.tier] ) ) );
    h.appendChild( q );
    o.appendChild( h );
    let s = elem( `statBox` );
        s.appendChild( elem( `statRow`, `${span[v.runs[index].span].curr} Held: <a class="num" data-balance=${index}>${numDisplay( balance( index ) )}</a>` ) );
        s.appendChild( elem( `statRow`, `${span[v.runs[index].span].curr} Per Second: <a class="num" data-cps=${index}>${numDisplay( v.runs[index].curr.cps, true )}</a>` ) );
        if( v.upgrades[v.runs[index].span].abandonQuest > 0 ){
            s.appendChild( elem( `abandon ${v.abandonTime[v.runs[index].span] == 0 ? 'available' : '' }`, `Abandon`, [[`abandon`,v.runs[index].span]] ) );
        }
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
            bR.appendChild( elem( `stat cell`, numDisplay( v.runs[index].gen[i] ), [[`owned`,i]] ) );
            bR.appendChild( elem( `stat cell`, numDisplay( cost( index, i ) ), [[`cost`,i]] ) );
            bR.appendChild( elem( `stat cell`, numDisplay( getSingleCPS( index, i ), true ), [[`income`,i]] ) );
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

function buildToggle( d, st, grp ){
    let l = document.createElement(`label`);
        l.classList = `switch`;
        l.innerHTML = `<input type="checkbox" ${st?``:`checked`}><span data-feature="${d}" data-feature-group="${grp}" class="slider"></span>`;    
    return l;
}

function showStats(){
    document.querySelector(`[data-balance]`).innerHTML = numDisplay( balance( v.selected ) );
    document.querySelector(`[data-cps]`).innerHTML = numDisplay( v.runs[v.selected].curr.cps );
    if( v.runs[v.selected].quest.complete ){ document.querySelector(`.complete`).innerHTML = `Complete Quest for ${calcReward( v.selected )} <div class="rewardIcon s${v.runs[v.selected].span}"></div>`; }
}

function forgeRings(){
    let rings = document.querySelectorAll(`[data-ringMe]`);
    for( let r = 0; r < rings.length; r++ ){
        let id = rings[r].getAttribute(`data-ringMe`);
        rings[r].outerHTML += `<svg data-ring="${id}" xmlns="http://www.w3.org/2000/svg" class="ring" width="16" height="16"><circle class="circle" data-circle="${id}" cx="8" cy="8" r="4" stroke="var(--span)" stroke-width="8" fill="transparent" /></svg>`;
    }
}

function offsetRings(){
    if( v.selected !== null ){
        for( let i = 0; i < stat.length; i++ ){
            if( v.upgrades[v.runs[v.selected].span].autoBuy[i] == 0 ){
                document.querySelector(`[data-circle="${i}"]`).classList.add(`noDisplay`);
            }
            else{
                let p = v.runs[v.selected].auto[`t${i}`] / autoBuyTime( v.runs[v.selected].span, i );
                let circle = document.querySelector(`[data-circle="${i}"]`);
                circle.classList.remove(`noDisplay`);
                let circumference = circle.r.baseVal.value * 2 * Math.PI;
                circle.style.strokeDasharray = `${circumference} ${circumference}`;
                circle.style.strokeDashoffset = p * circumference;
            }
        }
    }
}

function updateCompleting(){
    let n = v.runs[v.selected].completeIn;
    let d = getAutoCompleteTime( v.selected );
    document.querySelector(`.completing`).style = `width: ${( 1 - ( n / d ) ) * 100}%`;
}

function updateButtons(){
    for( let i = 0; i < stat.length; i++ ){
        if( afford( v.selected, i ) ){ document.querySelector(`[data-buy="${i}"]`).classList.add( `available`); }
        else{ document.querySelector(`[data-buy="${i}"]`).classList.remove( `available`); }
    }    
}

function updateTabButtons(){
    let b = document.querySelectorAll(`.upgrade`);
    for( let i = 0; i < b.length; i++ ){
        let s = b[i].getAttribute(`data-upspan`);
        let t = b[i].getAttribute(`data-uptier`);
        let type = b[i].getAttribute(`data-uptype`);
        if( upgradeAfford( s, type, t ) ){ b[i].classList.add(`affordable`); }
        else{ b[i].classList.remove(`affordable`); }
    }
    switches.updateTabButtons = false;
}

function scrollScroll(){
    if( switches.bonusDisplay ){
        let f = document.querySelector(`#footer`);
        f.innerHTML = ``;
        for( b in v.bonus ){
            let d = elem( `bonusDisplay` );
                d.appendChild( elem( `bonusLabel`, v.bonus[b].disp ) );
                if( v.bonus[b].remaining > 0 ){ d.appendChild( elem( `bonusSecs`, Math.ceil( v.bonus[b].remaining / 20 ) + `s` ) ); }                
            f.appendChild(d);
        }
        return;
    }
    if( v.bonus.length == 0 ){ switches.bonusDisplay = false; }
    if( document.querySelector(`#footer`).children.length == 0 ){ addScroll(); }
    let s = document.querySelector(`.scroll`);
    if( s !== null ){
        let newT = parseFloat( s.getAttribute(`data-transform`) ) - global.scrollSpeed;
        s.setAttribute( `data-transform`, newT );
        s.style = `transform: translate( ${newT}px, 0px )`;
        if( newT <= document.querySelector(`.scroll`).clientWidth * -1 - 100 ){
            document.querySelector(`#footer`).innerHTML = ``;
            addScroll();
        }
    }
}

function addScroll(){
    let v = shuffle(helpful)[0];
    if( global.paused ){ v = shuffle(helpless)[0]; }
    document.querySelector(`#footer`).appendChild( elem( `scroll` , v, [[`transform`,window.innerWidth]] ) );
    scrollScroll();
}

function spawnClickMe(){
    let arr = [];
    for( key in v.reward ){ arr.push( span.findIndex( e => e.curr == key ) ); }
    if( arr.length > 0 ){
        let nonce = Math.floor( Math.min( arr.length - 1, Math.random() * arr.length * Math.pow( getBenefit(`clickTilting`), ( v.upgrades.clickTilting == undefined ? 0 : v.upgrades.clickTilting) ) ) );
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
        if( type == `childReq` && global.spanTarget + Object.keys(span).findIndex( e => e == d ) - v.upgrades[d].childReq <= 1 ){ return }
        if( d !== null ){ v.reward[span[d].curr].spent += upgradeCost( d, type, tier ); }
        else{ v.curr.spent += upgradeCost( d, type, tier ); }
        if( d == null ){
            v.upgrades[type]++;
            if( type == `maxZeros` ){ topUpZeros(); switches.updateRuns = true; }
            if( type == `questTarget` ){ adjustQuestTargets(); }
            if( type == `recruitJerk` ){ recruitJerk(); selectTab( v.tab, v.miniTab ); }
        }
        else if( tier == null ){
            if( type == `rebirthSpan` ){ rebirth( d ); }
            else{ v.upgrades[d][type]++; }
            if( type == `abandonQuest` ){ switches.display = true; }
            if( type == `speedBonus` ){ switches.display = true; }
            if( type == `autoComplete` ){ kickStart( d ); }
        }
        else{
            v.upgrades[d][type][tier]++;
            buildMiniTabContents( tier, d );
            if( type == `autoBuy` ){ updateAutoValues(); }
        }
        if( type == `childReq` && global.spanTarget + Object.keys(span).findIndex( e => e == d ) - v.upgrades[d].childReq == 1 ){ selectTab( v.tab, v.miniTab ); }
        v.nextOneFree = false;
        spawnCheck();
        switches.updateDisplay = true;
        switches.displayRewards = true;        
        switches.tabUpdate = true;
        switches.updateTabButtons = true;
        switches.updateRuns = true;
    }
}

function upgradeAfford( d, type, tier ){
    let o = false;
    if( d == null ){ if( v.curr.gained - v.curr.spent >= upgradeCost( d, type, tier ) ){ o = true; } }
    else if( upgradeBalance( span[d].curr ) >= upgradeCost( d, type, tier ) ){ o = true; }
    return o;
}

function upgradeBalance( c ){
    return netReward( c );
}

function upgradeCost( d, type, tier ){
    let bought = 0;
    if( d == null ){ bought = v.upgrades[type]; }
    else if( tier == null ){ bought = v.upgrades[d][type]; }
    else{ bought = v.upgrades[d][type][tier]; }
    let u = upgrades.filter( (e) => e.id == type )[0];
    let c = Math.ceil( u.cost * Math.pow( u.multi, bought ) );
    if( type == `headStart` ){ c = uCost( d, tier ); }
    if( v.nextOneFree ){ c = 0; }
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
    v.roster.push( new Jerk );
}

function getRecreateCost(){
    return Math.floor( global.recreateCost * Math.pow( getBenefit( `creepReduce` ), v.recreates ) );
}

function recreateJerk( j ){
    let c = getRecreateCost();
    if( v.curr.gained - v.curr.spent >= c ){
        v.curr.spent += c;
        v.recreates++;
        let id = JSON.parse( JSON.stringify( v.roster[j].id ) );
        v.roster[j] = new Jerk( id );
        switches.displayRewards = true;
        selectTab( v.tab );
    }
    clearJerkSelect();
}

function getReruitCost(){
    return 5; // revisit
}

function nextDef( d ){
    let arr = Object.keys( span );
    let index = arr.findIndex( e => e == d ) + 1;
    return arr[index];
}

function recreateRun( index ){
    let d = v.runs[index].span;
    if( v.abandonTime[d] == 0 ){
        v.runs[index] = new Run( d );
        switches.display = true;
        let t = global.abandonTimer * ( 1000 / global.tickSpeed );
        t *= Math.pow( 1 / getBenefit(`abandonQuest`), v.upgrades[d].abandonQuest );
        v.abandonTime[d] = t; // FIX THIS
        document.querySelector(`[data-abandon]`).classList.remove(`available`);
    }
}

function recreateAllRuns( d ){
    for( r in v.runs ){
        if( v.runs[r].span == d ){
            v.runs[r] = new Run( d );
            switches.display = true;
        }
    }
}

function claimGift(){
    v.spins++;
    v.giftDue = false;
    switches.displayRewards = true;
    displaySpinner( `wheel` );
}

function claimSlots(){
    v.slotSpins += 10;
    v.slotsDue = false;
    switches.displayRewards = true;
    updateSlotSpins();
    displaySpinner( `slots` );
}

function updateSlotSpins(){
    let t = document.querySelector(`[data-slots]`);
    t.innerHTML = numDisplay( v.slotSpins );
}

function spinToWin(){
    v.spins--;
    let t = document.querySelector(`.spinner`);
    let arr = [
        { deg: 18, does: `output`, id: 0 }
        , { deg: 54, does: `freeUpgrade`, id: 1 }
        , { deg: 90, does: `points`, id: 2 }
        , { deg: 126, does: `60mins`, id: 3 }
        , { deg: 162, does: `clickMe`, id: 4 }
        , { deg: 198, does: `moreSpins`, id: 5 }
        , { deg: 234, does: `reward`, id: 6 }
        , { deg: 270, does: `doubleTime`, id: 7 }
        , { deg: 306, does: `fastAuto`, id: 8 }
        , { deg: 342, does: `15mins`, id: 9 }
    ]
    let choice = Math.floor( Math.random() * 10 );
    let startDeg = parseInt( t.getAttribute(`style`).replace(/[^\d.-]/g, '') );
    let deg = startDeg + 3600 + arr[choice].deg - ( startDeg == 0 ? 0 : 18 );
    t.style = `transform: rotate(${deg}deg)`;
    let sel = deg - ( Math.floor( startDeg / 3600 ) * 3600 );
    sel -= Math.floor( sel / 360 ) * 360;
    let oldChoice = arr.findIndex( e => e.deg == sel );
    let outcome = arr[choice].does;
    if( oldChoice !== -1 ){ outcome = arr[oldChoice].does };
    t.classList.add(`dontTouch`);
    setTimeout(() => { reward( outcome ); }, global.spinTimer );
}

function spinSlots(){
    document.querySelector(`.spin`).classList.add(`spinning`);
    setTimeout(() => { primeSlots() }, 5500 );
    let s = document.querySelectorAll(`.slt`);
    let delay = -250;
    for( let i = 0; i < s.length; i++ ){ delay += 250; setTimeout(() => { s[i].children[0].style = `transition: all 5s; transform: translateY(${ -3.5 - ( 9 * 30 ) }rem);`; }, delay ); }
}

function displaySpinner( type ){
    document.querySelector(`#modal`).classList.remove(`noDisplay`);
    let e = document.querySelectorAll(`.minigame`);
    for( let i = 0; i < e.length; i++ ){ e[i].classList.add(`noDisplay`) }
    document.querySelector(`#${type}`).classList.remove(`noDisplay`);
}

function primeSlots(){
    document.querySelector(`.spin`).classList.remove(`spinning`);
    if( slots.a0.length == 0 ){ populateSlots( true ); return; }
    else{
        slots.a0.splice(0,30); slots.a1.splice(0,30); slots.a2.splice(0,30);
        slots.a0.splice(3,99); slots.a1.splice(3,99); slots.a2.splice(3,99);
        let s = document.querySelectorAll(`.slt`);
        for( let i = 0; i < s.length; i++ ){ s[i].children[0].style = `transform: translateY(${ -3.5 }rem);`; }
        slotResult( slots.a0[1], slots.a1[1], slots.a2[1] );
        populateSlots( false );
    }
    for( k in slots ){
        let t = document.querySelector( `#${k}` ).children[0];
        t.innerHTML = ``;
        for( x in slots[k] ){ t.appendChild( elem( `slotCell ${slots[k][x]}` ) ); }
    }    
}

function populateSlots( fresh ){
    let slt = {};
    let arr = [`points`,`nope`];
    for( i in v.reward ){ arr.push( `s` + String( span.findIndex(e=>e.curr == i) ) ); }
    if( fresh ){
        slt.a0 = [`nope`,`s0`,`points`];
        slt.a1 = [`nope`,`s0`,`points`];
        slt.a2 = [`nope`,`s0`,`points`];
    }
    else{
        slt.a0 = JSON.parse( JSON.stringify( slots.a0 ) );
        slt.a1 = JSON.parse( JSON.stringify( slots.a1 ) );
        slt.a2 = JSON.parse( JSON.stringify( slots.a2 ) );
    }
    let s = shuffle( arr );
    for( k in slt ){
        let adj = parseInt( Math.floor( Math.random() * s.length ) );
        for( let i = 0; i < adj; i++ ){ slt[k].push( s[i] ) }
        while( slt[k].length < 41 ){ for( j in s ){ slt[k].push( s[j] ) } }
    }
    slots.a0 = slt.a0;
    slots.a1 = slt.a1;
    slots.a2 = slt.a2;
    for( k in slots ){
        let t = document.querySelector( `#${k}` ).children[0];
        for( x in slots[k] ){ t.appendChild( elem( `slotCell ${slots[k][x]}` ) ); }
    }
}

function slotResult( a0, a1, a2 ){
    let subj = ``;
    if( a0 == `nope` && a1 == `nope` && a2 == `nope` ){ // nope'd in
        v.bonus.push( { type: ``, disp: `So unlucky you get 10 free spins!`, remaining: -1 } ); v.slotSpins += 10;
    }
    else if( a0 == `nope` && a1 == `nope` || a0 == `nope` && a1 == `nope` || a1 == `nope` && a2 == `nope` ){ // nope'd ish
        v.bonus.push( { type: ``, disp: `Really unlucky! (have a free spin)`, remaining: -1 } ); v.slotSpins += 1;
    }
    else if( a0 == `nope` || a1 == `nope` || a2 == `nope` ){ // nope'd out
        v.bonus.push( { type: ``, disp: `Unlucky!`, remaining: -1 } );
    }
    else if( a0 !== a1 && a0 !== a2 && a1 !== a2 ){ // no match
        v.bonus.push( { type: ``, disp: `No match!`, remaining: -1 } );
    }
    else if( a0 == a1 && a1 == a2 ){ // total match
        subj = a0;
        v.bonus.push( { type: `25x`, subtype: subj, disp: `25x <div class="inlineIcon s${subj} ${subj}"></div> earnings for 5 minutes!`, remaining: global.bonusTime * 20 } );        
    }
    else{ // partial match
        if( a0 == a1 ){ subj = a0 }
        else{ subj = a2 }
        v.bonus.push( { type: `5x`, subtype: subj, disp: `5x <div class="inlineIcon s${subj} ${subj}"></div> earnings for 2 minutes!`, remaining: global.bonusTime * 8 } );
    }
    v.slotSpins--;
    updateSlotSpins();
    if( v.slotSpins <= 0 ){ v.slotSpins = 0; document.querySelector(`#modal`).classList.add( `noDisplay` ); }
    switches.displayRewards = true;
    switches.displayRuns = true;
    switches.tabUpdate = true;
    switches.updateDisplay = true;
    switches.updateTabButtons = true;
}

function rebirth( s ){
    let n = JSON.stringify( JSON.parse( v.upgrades[s].rebirthSpan ) );
    delete v.upgrades[s];
    buildUpgrades();
    v.upgrades[s].rebirthSpan = parseInt( n ) + 1;
    if( v.fastest[s] !== undefined ){ v.fastest[s] = 0; }
    display( v.selected );
    selectTab( v.tab, v.miniTab );
    saveState();
}

function kickStart( d ){
    for( r in v.runs ){ 
        if( v.runs[r].span == d ){
            if( v.runs[r].quest.complete == true ){
                let t = getAutoCompleteTime( d, d );
                if( v.runs[r].completeIn == undefined ){ v.runs[r].completeIn = t; }
                else if( v.runs[r].completeIn > t ){ v.runs[r].completeIn = t; }
            }
        }
    }
}

function adjustQuestTargets(){
    for( r in v.runs ){ v.runs[r].quest.target = Math.ceil( v.runs[r].quest.target / getBenefit( `questTarget` ) ); }
    switches.display = true;
}

function calcZeros(){
    return global.zeros + v.upgrades.maxZeros;
}

function autoBuyTime( d, t ){
    let o = global.autoBuy + global.autoBuy * ( t + 1 ) / 2;
    o *= Math.pow( 1 / global.scale.autoBuyTier, v.upgrades[d].autoBuy[t] );
    let tr = getTraits( d );
    for( a in tr ){
        if( tr[a].id == `fastBuy` ){ o *= ( 1 - tr[a].amt ) }
        if( tr[a].id == `fastOverall` ){ o *= ( 1 - tr[a].amt ) }
    }
    o *= ( 1000 / global.tickSpeed );
    o *= Math.pow( 0.75, v.upgrades[d].rebirthSpan );    
    let b = 0;
    for( i in v.bonus ){ if( v.bonus[i].type == `fastAuto` ){ b++; } };
    o /= Math.pow( 2, b );
    o = Math.ceil( o );
    return o;
}

function saveState(){
    localStorage.setItem( `v` , JSON.stringify( v ) );
    localStorage.setItem( `meta` , JSON.stringify( meta ) );
}

function loadMeta(){
    let mStore = JSON.parse( localStorage.getItem( `meta` ) );
    if( mStore !== null ){ meta = mStore; }
}

function loadState(){
    let store = JSON.parse( localStorage.getItem( `v` ) );
    if( store !== null ){
        if( store.version !== v.version ){ switches.display = true; } // loop load data
        else{ v = store; buildUpgrades(); switches.display = true; dataFix(); }
    }
    else{
        v.ms.start = new Date().getTime() / global.tickSpeed;
        v.ms.last = now();
        v.bonus = [];
        buildUpgrades();
        topUpZeros();
        display( 0 );
    }
    setIco( v.watermark );
    let elapsed = now() - v.ms.last;
    if( elapsed > global.offlineGrace ){ offlineProgress( elapsed ); }
    if( elapsed > 1 / global.giftChance ){ if( Math.random() > 0.5 || vCompelted() < 25 ){ v.giftDue = true; } else{ v.slotsDue = true; } } //slotChance
    else if( Math.random() < global.giftChance * ( elapsed / global.tickSpeed ) ){ if( Math.random() > 0.5 || vCompelted() < 25 ){ v.giftDue = true; } else{ v.slotsDue = true; } }
}

function exportState(){
    download( localStorage.getItem(`v`) );
}

function importState( state ){
    v = JSON.parse( state );
    saveState();
    location.reload();
}

function download(state) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(state));
    element.setAttribute('download', now() + `.txt`);  
    element.style.display = 'none';
    document.body.appendChild(element);  
    element.click();  
    document.body.removeChild(element);
  }

function dataFix(){
    if( meta.upgrades[1].multi == 2 ){ meta.upgrades[1].multi = 1.75; upgrades[1].multi = 1.75; }
    if( v.reward.undefined == null ){ delete v.reward.undefined; }
    // for( i in v.reward ){ if( v.reward[i] == null ){ delete v.reward[i]; } else{ v.reward[i] = Math.ceil( v.reward[i] ); } }
    if( v.bonus == undefined ){ v.bonus = []; }
    if( v.nextOneFree == undefined ){ v.nextOneFree = false; }
    if( v.spins == undefined ){ v.spins = 0; }
    if( v.removeDoubleCount !== undefined ){ delete v.removeDoubleCount; }
    if( v.giftDue == undefined ){ v.giftDue = false; }
    if( v.slotsDue == undefined ){ v.slotsDue = false; }
    if( v.snaps == undefined ){ v.snaps = []; }
    if( v.reward.Uncertainty != undefined ){
        if( v.reward.Uncertainty.gained == undefined ){
            for( r in v.reward ){ let x = JSON.parse( JSON.stringify( v.reward[r] ) ); v.reward[r] = { gained: x, spent: 0 }; };
        }
    }
    if( v.offline !== undefined ){ delete v.offline }
    upgrades.filter( e => e.id == `abandonQuest`)[0].cost = 5;
    upgrades.filter( e => e.id == `abandonQuest`)[0].multi = 2;
    for( r in v.runs ){ if( isNaN( v.runs[r].curr.cps ) || v.runs[r].curr.cps == null ){ recreateRun(r) } };
    for( r in v.runs ){ if( v.runs[r].curr.gained == 0 ){ v.runs[r].curr.gained = 10 } if( v.runs[r].curr.cps == null ){ updateCPS(r) } };
    if( v.slotSpins == undefined ){ v.slotSpins = 0; }
    global.tierLimit = 3 + meta.limits.filter( e => e.id == `tierLimit` )[0].bought;
}

function safetyOff(){
    if( v.reward.Features == undefined ){ return }
    document.querySelector(`.prestige`).innerHTML = `Confirm`;
    document.querySelector(`.prestige`).classList.add(`confirm`);
}

function renderUndex(){
    global.paused = true;
    let t = document.querySelector(`#undex`);
        t.classList.remove(`noDisplay`);
        t.innerHTML = ``;
    let p = document.querySelector(`#play`);
        p.classList.add(`noDisplay`);
    let pre = elem( `preambleBox` );
        pre.appendChild( elem( `preamble large`, `Let the feature creep begin.` ) );
        pre.appendChild( elem( `preamble`, `Every change you make below will increase <b>all</b> costs by 1 due to the added complexity in the Scalar code. Choose wisely.` ) );
        pre.appendChild( elem( `preamble`, `Once you've rebuilt the game anew (i.e. completed another lap), this inflation will reduce to +1 per lap thanks to refactoring.` ) );
        pre.appendChild( elem( `preamble`, `If you want to revert back to your previous branch (i.e. re-enter your previous lap), click <a class="refreshMe">REVERT BUILD</a>.` ) );
        pre.appendChild( elem( `preamble`, `Once you commit your changes and relaunch Scalar, you will receive a +100% base output bonus for each rebuild (lap) you've completed.` ) );
    t.appendChild( pre );
    t.appendChild( elem( `featureHeading`, `Upgrades<div class="scalarCost"><div class="scalarLabel">Enable Cost:</div><div class="scalarNum" data-fcost="upgradePrice"></div><div class="scalarLabel">Disable Cost:</div><div class="scalarNum" data-fcost="upgradePrice"></div></div>` ) );
    let u2 = elem( `featureBox` );
    for( i in meta.upgrades ){
        let u3 = elem( `featureToggle` );
            u3.appendChild( buildToggle( meta.upgrades[i].id, meta.upgrades[i].locked, `upgrades` ) );
            u3.appendChild( elem( `feature`, meta.upgrades[i].p.nice ) );
            u2.appendChild( u3 );
    }
    t.appendChild( u2 );
    t.appendChild( elem( `featureHeading`, `Quests<div class="scalarCost"><div class="scalarLabel">Enable Cost:</div><div class="scalarNum" data-fcost="questOn"></div><div class="scalarLabel">Disable Cost:</div><div class="scalarNum" data-fcost="questOff"></div></div>` ) );
    let q2 = elem( `featureBox` );
        for( i in meta.questDef ){
        let q3 = elem( `featureToggle` );
            q3.appendChild( buildToggle( meta.questDef[i].basis, meta.questDef[i].locked, `questDef` ) );
            q3.appendChild( elem( `feature`, meta.questDef[i].nice ) );
            q2.appendChild( q3 );
        }
        t.appendChild( q2 );
        t.appendChild( elem( `featureHeading`, `Cosmic Force Traits<div class="scalarCost"><div class="scalarLabel">Enable Cost:</div><div class="scalarNum" data-fcost="traitOn"></div><div class="scalarLabel">Disable Cost:</div><div class="scalarNum" data-fcost="traitOff"></div></div>` ) );
        let t2 = elem( `featureBox` );
        for( i in meta.jerkTraits ){
            let t3 = elem( `featureToggle` );
            t3.appendChild( buildToggle( meta.jerkTraits[i].id, meta.jerkTraits[i].locked, `jerkTraits` ) );
            t3.appendChild( elem( `feature`, meta.jerkTraits[i].nice ) );
            t2.appendChild( t3 );
        }
    t.appendChild( t2 );
    t.appendChild( elem( `featureHeading`, `Limits<div class="scalarCost"><div class="scalarLabel">Limit Change Cost:</div><div class="scalarNum" data-fcost="limitChange"></div></div>` ) );
    let l2 = elem( `featureBox` );
        for( i in meta.limits ){
            let l3 = elem( `featureToggle` );
                l3.appendChild( elem( `buyU`, meta.limits[i].does, [[`feature`,meta.limits[i].id],[`feature-group`,`limits`]] ) );
                l3.appendChild( elem( `feature`, `<div>${meta.limits[i].nice}</div>` ) );
                l3.lastChild.innerHTML += `<span class="tooltip"><div class="bottom">${meta.limits[i].verbiage}<i></i></div></span>`
                l2.appendChild( l3 );
        }
    t.appendChild( l2 );
    t.appendChild( elem( `featureHeading`, `Scale<div class="scalarCost"><div class="scalarLabel">Scale Change Cost:</div><div class="scalarNum" data-fcost="scaleChange"></div></div>` ) );
    let s2 = elem( `featureBox` );
        for( i in meta.scale ){
            let s3 = elem( `featureToggle` );
                s3.appendChild( elem( `buyU`, meta.scale[i].does, [[`feature`,meta.scale[i].id],[`feature-group`,`scale`]] ) );
                s3.appendChild( elem( `feature`, `<div>${meta.scale[i].nice}</div>` ) );
                s3.lastChild.innerHTML += `<span class="tooltip"><div class="bottom">${meta.scale[i].verbiage}<i></i></div></span>`
                s2.appendChild( s3 );
        }
    t.appendChild( s2 );
    // t.appendChild( elem( `featureHeading`, `Totally New Features` ) );
    // let n2 = elem( `featureBox` );
    //     for( i in meta.newFeatures ){
    //         let n3 = elem( `featureToggle` );
    //             n3.appendChild( elem( `buyU`, meta.newFeatures[i].does, [[`feature`,meta.newFeatures[i].id],[`feature-group`,`newFeatures`]] ) );
    //             n3.appendChild( elem( `feature`, meta.newFeatures[i].nice ) );
    //             n2.appendChild( n3 );
    //     }
    // t.appendChild( n2 );
    t.appendChild( elem( `restart`, `Commit Changes & Start Over` ) );
    undexButtons();
}

function toggleFeature( f, st, grp ){
    if( v.reward.Features == undefined ){ return }
    let a = scalarAfford( grp, f, st );
    let s = meta[grp].filter( e => e.id == f || e.basis == f )[0];
    if( a.afford ){
        v.reward.Features.spent += a.cost;
        meta.spend++;
        s.locked = st;
    }
    undexButtons();
}

function buyFeature( f, grp ){
    if( v.reward.Features == undefined ){ return }
    let a = scalarAfford( grp, f );
    let s = meta[grp].filter( e => e.id == f )[0];
    if( a.afford && ( s.max == null || s.max > s.bought ) ){
        v.reward.Features.spent += a.cost;
        meta.spend++;
        s.bought++;
    }
    undexButtons();
}

function scalarAfford( grp, f, st ){
    if( st == undefined ){ st = null; }
    let c = 0;
    c += meta.laps;
    c += meta.spend;
    if( st == true ){
        if( grp == `questDef` ){ c += pricing.questOff }
        if( grp == `jerkTraits` ){ c += pricing.traitOff }
        if( grp == `upgrades` ){ c += pricing.upgradePrice }
    }
    else if( st == false ){
        if( grp == `questDef` ){ c += pricing.questOn }
        if( grp == `jerkTraits` ){ c += pricing.traitOff }
        if( grp == `upgrades` ){ c += pricing.upgradePrice }
    }
    else{
        if( grp == `limits` ){ c += pricing.limitChange }
        if( grp == `scale` ){ c += pricing.scaleChange }
        if( grp == `newFeatures` ){ c += meta[grp][f].cost }
    }
    return { afford: netReward( `Features` ) >= c, cost: c };
}

function undexButtons(){
    let grps = [`questDef`,`jerkTraits`,`upgrades`,`limits`,`scale`,`newFeatures`]
    for( g in grps ){
        let e = document.querySelectorAll(`[data-feature-group="${grps[g]}"]`);
        for( let i = 0; i < e.length; i++ ){
            let a = scalarAfford( grps[g], e[i].getAttribute(`data-feature`), e[i].parentElement.children[0].checked );
            if( !a.afford ){ e[i].classList.add(`unaffordable`); }
        }
    }
    let fcosts = [`upgradePrice`,`limitChange`,`scaleChange`,`questOn`,`questOff`,`traitOn`,`traitOff`,`newUpgrade`,`newFeature`];
    for( f in fcosts ){
        let e = document.querySelectorAll(`[data-fcost="${fcosts[f]}"]`);
        for( let i = 0; i < e.length; i++ ){
            e[i].innerHTML = numDisplay( meta.laps + meta.spend + pricing[fcosts[f]] ) + `<div class="s9 inlineIcon"></div>`;
        }
    }
    displayRewards();
}

function doItAllOverAgain(){
    meta.laps++;
    meta.spend = 0;
    v.runs = [];
    v.roster = [];
    v.upgrades = {};
    v.curr = { gained: 0, spent: 0 };
    v.reward = {};
    v.completed = {};
    v.spent = {};
    v.selected = null;
    v.jerkSelected = null;
    v.tab = null;
    v.miniTab = null;
    v.clickTimer = 10000;
    v.watermark = 0;    
    v.multi = 0;
    v.recreates = 0;
    v.fastest = [0,0,0,0,0,0,0,0,0,0];
    v.bonus = [];
    v.nextOneFree = false;
    v.giftDue = false;
    v.slotsDue = false;
    v.spins = 0;
    v.snaps = [];
    extrapolateMeta();
    saveState();
    location.reload();
}

function reward( x ){
    switch( x ){
        case `clickMe`:
            for( let i = 0; i < 100; i++ ){ spawnClickMe(); } // 100 clickables
            v.bonus.push( { type: ``, disp: `Clickable Frenzy!`, remaining: -1 } );
        break;
        case `points`:
            v.curr.gained += Math.ceil( ( v.curr.gained - v.curr.spent ) * 0.1 ); // 10% points boost
            switches.displayRewards = true;
            v.bonus.push( { type: ``, disp: `+10% to your <div class="inlineIcon points"></div> holdings!`, remaining: -1 } );
        break;
        case `reward`:
            for( i in v.reward ){ v.reward[i].gained += Math.ceil( netReward( i ) * 0.2  ); }; // +20% all Reward
            v.bonus.push( { type: ``, disp: `+20% to ALL of your reward currencies!`, remaining: -1 } );
            switches.displayRewards = true;
        break;
        case `doubleTime`:
            v.bonus.push( { type: `doubleTime`, disp: `Double Speed`, remaining: global.bonusTime * 20 } ); // double time for n ticks
        break;
        case `freeUpgrade`:
            v.nextOneFree = true; // next Upgrade costs 0
            v.bonus.push( { type: ``, disp: `Your next Upgrade (of any kind) is free!`, remaining: -1 } );
        break;
        case `15mins`:
            offlineProgress( 15 * 60 * 1000 );// fifteen minutes of progress gain
            v.bonus.push( { type: ``, disp: `15 minutes of idle progress added!`, remaining: -1 } );
        break;
        case `60mins`:
            offlineProgress( 60 * 60 * 1000 ); // sixty minutes of progress gain
            v.bonus.push( { type: ``, disp: `60 minutes of idle progress added!`, remaining: -1 } );
        break;
        case `output`:
            v.bonus.push( { type: `output`, disp: `10x All Output`, remaining: global.bonusTime * 20 } ); // 10x output for 300 seconds
            switches.display = true;
        break;
        case `fastAuto`:
            v.bonus.push( { type: `fastAuto`, disp: `2x Faster Automation`, remaining: global.bonusTime * 20 } ); // all automation timers /2 for 300 seconds
        break;
        case `moreSpins`:
            v.spins += 2; // 2 more spins
            v.bonus.push( { type: ``, disp: `Two more spins!`, remaining: -1 } );
        break;
    }
    if( v.spins <= 0 ){ document.querySelector(`#modal`).classList.add( `noDisplay` ); }
    document.querySelector(`.spinner`).classList.remove(`dontTouch`);
    switches.displayRewards = true;
    switches.displayRuns = true;
    switches.tabUpdate = true;
    switches.updateDisplay = true;
    switches.updateTabButtons = true;
}

function resetData(){
    localStorage.clear();
    location.reload();
}

function extrapolateMeta(){
    upgrades = [];
    for( u in meta.upgrades ){
        upgrades.push( meta.upgrades[u].p );
        upgrades[upgrades.length-1].id = meta.upgrades[u].id;
        upgrades[upgrades.length-1].locked = meta.upgrades[u].locked;
    }
    questDef = [];
    for( q in meta.questDef ){
        questDef.push( meta.questDef[q].p );
        questDef[questDef.length-1].basis = meta.questDef[q].basis;
        questDef[questDef.length-1].locked = meta.questDef[q].locked;
    }
    jerkTraits = [];
    for( j in meta.jerkTraits ){
        jerkTraits.push( meta.jerkTraits[j].p );
        jerkTraits[jerkTraits.length-1].id = meta.jerkTraits[j].id;
        jerkTraits[jerkTraits.length-1].locked = meta.jerkTraits[j].locked;
    }
    for( l in meta.limits ){
        let e = meta.limits[l].adjust.replace(`@`,meta.limits[l].default).replace(`#`,meta.limits[l].bought);
        global[meta.limits[l].id] = eval( e );
    }
    for( s in meta.scale ){
        let e = meta.scale[s].adjust.replace(`@`,meta.scale[s].default).replace(`#`,meta.scale[s].bought);
        global.scale[meta.scale[s].id] = eval( e );
    }
    for( x in meta.newFeatures ){}
}

function generateTraits( count, str, old ){
    let brake = 0;
    let arr = [];
    for( i in jerkTraits ){ if( !jerkTraits[i].locked ){ arr.push(jerkTraits[i] ); } }
    while( true ){
        let strength = 0;
        let tr = [];
        for( let i = 0; i < count; i++ ){
            let selection = shuffle(arr)[0];
            let nonce = shuffle( chance )[0];
            let amt = nonce * selection.significance;
            let t = Math.floor( Math.random() * stat.length );
            tr.push( { id: selection.id, amt: amt, t: t, verbiage: selection.verbiage.replace( `#`, ( amt * 100 ).toFixed(1) ).replace( `@`, gen[t] ) } );
            strength += Math.ceil( nonce );
        }
        brake++;
        if( brake > 75 ){ return { strength: strength, trait: tr }; break; }
        else if( str == null ){ return { strength: strength, trait: tr }; break; }
        else if( str == true && strength > old ){ return { strength: strength, trait: tr }; break; }
        else if( str == false && strength < old ){ return { strength: strength, trait: tr }; break; }
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
    for( let i = 1; i < global.ranks; i++ ){ stat.push( { cost: stat[i-1].cost * global.scale.cost * Math.pow( global.scale.buyScale, i - 1 ), adds: stat[i-1].adds * global.scale.add } ); }
    for( i in stat ){ stat[i].cost = stat[i].cost.toFixed(0); if( v.fastest[i] == undefined ){ v.fastest.push( 0 ); } }
}

function buildUpgrades(){
    for( u in upgrades ){
        let up = upgrades[u].id;
        if( upgrades[u].locked ){}
        else if( upgrades[u].scope == `global` ){ if( v.upgrades[up] == undefined ){ v.upgrades[up] = 0; } }
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

function numDisplay( x, precise ){
    let suffix = ``;
    if( x >= 1e6 ){ suffix = `e` + Math.floor( Math.log10( x ) ); x *= Math.pow( 0.1, Math.floor( Math.log10( x ) ) ); precise = true; }
    let precision = 0;
    if( precise ){ precision = Math.max( 0, 3 - String(x).split(`.`)[0].length ); }
    let remainder = String(x).split(`.`)[1];
    o = Math.floor( x ).toFixed(0);
    var pattern = /(-?\d+)(\d{3})/;
    while( pattern.test( o ) ){ o = o.replace( pattern, "$1,$2" ); }
    if( precision !== 0 && remainder !== undefined ){ o = o + `.` + remainder.substring( 0, 0 + precision ); }
    return o + suffix;
}

const helpful = [
    `Click and hold a Tier to rapid-buy`
    , `Click the Auto Buy timer circle to pause / unpause one Tier`
    , `Click the Auto Buy icon at the top of the column to pause / unpause all`
    , `Buy Generators fast by pressing and holding the Tier number on your keyboard`
    , `Cosmic Forces are a big investment for a potentially massive impact`
    , `Quest rewards are based on how much resource you hold`
    , `Bulk Bonus upgrades reward owning a lot of a particular Tier`
    , `You gain one <div class="inlineIcon points"></div> for every completion`
    , `Assign a Cosmic Force to gain its benefit`
    , `Rebirth will trade all your upgrades for a big boost, but you'll keep your wealth`
    , `Your progress will save automatically every few seconds`

    , `59 6F 75 20 77 65 6E 74 20 74 6F 20 61 20 6C 6F 74 20 6F 66 20 74 72 6F 75 62 6C 65 20 74 6F 20 72 65 61 64 20 74 68 69 73 2E 2E 2E`
    , `I'm not convinced that the person who made this game understands what the word "scalar" means...`
    , `Is this all building towards something?`
    , `Surely there's going to be a Prestige at some point...`
    , `Is this game suggesting that Particles just appear given enough Uncertainty?`
    , `Humorous messages will appear here... focussing on features for the moment`
    , `For a huge performance improvement, try making smarter choices`
    , `This space for rent`
    , `Why do trees keep such good time? They've got log-a-rhythm...`
    , `<div class="upsideDown">I wonder if anyone will even notice this message</div>`
]

const helpless = [
    `Wait ... did I just build the game I've been playing this whole time?`
    , `I'm So Meta Even This Acronym`
    , `If thinking about thinking is called metacognition, what is thinking about metacognition called?`
    , `Is the reward for finishing really just starting all over again with a couple of minor changes?`
    , `Why would you pay to turn a feature off?`
]

function addTestData(){
    for( let i = 0; i < 10; i++ ){
        v.reward[span[i].curr].gained = 999;
        v.runs.push( new Run( i ) );
    }
}

/*

TODO
Compress and simplify the net effect of Cosmic Forces...
Lap stats
Don't allow the last of any lap upgrade be disabled without enabling another

Totally New Features (make work and show costing)
- - Clickable Timeout (animation duration)
- - Right click to buy 10

Spinner buffs:
- - Term based discount to all upgrades?

Special Jerk Traits
- Pause on complete
- Cost scale on all tiers
- Benefit from all unassigned
- 

*/

const pricing = {
    upgradePrice: 0
    , limitChange: 1
    , scaleChange: 2
    , questOn: 1
    , questOff: 2
    , traitOn: 1
    , traitOff: 2
    , newUpgrade: 3
    , newFeature: null
}

const referrals = [
      { name: `Universal Paperclips`, url: `https://www.decisionproblem.com/paperclips/index2.html`, visited: 0 }
    , { name: `More Ore`, url: `https://syns.studio/more-ore/`, visited: 0 }
    , { name: `Evolve`, url: `https://pmotschmann.github.io/Evolve/`, visited: -1 }
    , { name: `Synergism`, url: `https://pseudo-corp.github.io/SynergismOfficial/`, visited: 0 }
    , { name: `Progress Knight`, url: `https://ihtasham42.github.io/progress-knight/`, visited: 0 }
    , { name: `Calculator Evolution`, url: `https://spotky1004.com/Calculator-Evolution/`, visited: 0 }
    , { name: `A Dark Room`, url: `https://adarkroom.doublespeakgames.com/`, visited: 0 }
    , { name: `Sushi Beans`, url: `https://sushibeans.glitch.me/`, visited: 0 }
    , { name: `Crank`, url: `https://faedine.com/games/crank/b39/`, visited: 0 }
    , { name: `Idle Dice`, url: `https://luts91.github.io/idle-dices/`, visited: 0 }
    , { name: `Spirit Dungeons`, url: `https://spiritdungeons.com/legacy`, visited: 0 }
    , { name: `Pachinkremental`, url: `https://poochyexe.github.io/pachinkremental/pachinkremental.html`, visited: 0 }
    , { name: `Cookie Clicker`, url: `https://orteil.dashnet.org/cookieclicker/`, visited: 0 }
    , { name: `Incremancer`, url: `https://incremancer.gti.nz/`, visited: 0 }
    , { name: `Creature Card Idle`, url: `https://store.steampowered.com/app/1188260/Creature_Card_Idle/`, visited: 0 }
    , { name: `Antimatter Dimensions`, url: `https://ivark.github.io/`, visited: 0 }
    , { name: `Chime Clicker`, url: `http://chimeclicker.lol.s3-website-us-east-1.amazonaws.com/`, visited: 0 }
    , { name: `Space Plan`, url: `http://spaceplan.click/`, visited: 0 }
    , { name: ``, url: ``, visited: 0 }
    , { name: ``, url: ``, visited: 0 }
]

