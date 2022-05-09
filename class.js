class Quest{
    constructor( d ){
        let arr = [];
        for( i in questDef ){ if( !questDef[i].locked ){ arr.push(questDef[i] ); } }
        let q = arr[Math.floor( Math.random() * arr.length )];
        let w = Object.keys( span ).findIndex( (e) => e == d );
        if( q.basis == `buy1Gen` ){
            let n = Math.floor( Math.random() * q.target.length );
            this.target = Math.floor( q.target[n].a * Math.pow( global.scale.span, w ) / Math.pow( getBenefit( `questTarget` ), v.upgrades.questTarget ) );
            this.tier = q.target[n].t;
        }
        else if( q.basis == `buyNGen` ){
            let n = Math.floor( Math.random() * q.target.length );
            this.target = Math.floor( q.target[n].a * Math.pow( global.scale.span, w ) / Math.pow( getBenefit( `questTarget` ), v.upgrades.questTarget ) );
            this.tier = q.target[n].t;
        }
        else{
            this.target = Math.floor( q.target * Math.pow( global.scale.span, w ) ) / Math.pow( getBenefit( `questTarget` ), v.upgrades.questTarget );
        }
        this.target = Math.max( this.target, 1 );
        this.basis = q.basis;
        this.progress = 0;
        this.complete = false;
        this.verbiage = q.verbiage;
        this.commence = now();
    }
}

class Run{
    constructor( d ){
        this.id = uuid();
        this.span = d;
        this.gen = [];
        this.auto = {};
        this.autoOverride = [];
        for( let i = 0; i < global.ranks; i++ ){
            let x = 0;
            if( v.upgrades[d].headStart !== undefined ){ x = v.upgrades[d].headStart[i]; }
            this.gen.push( x );
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
    constructor( id ){
        let o = 0;
        this.id = String.fromCharCode( 945 + v.roster.length );
        let str = null;
        if( id !== undefined ){
            this.id = id;
            if( Math.random() < global.recreateImproves ){ str = true; }
            else{ str = false; }
            o = v.roster.filter( e => e.id == id )[0].strength;
        }
        this.traitCount = traitCount();
        let genTrait = generateTraits( this.traitCount, str, o );
        this.trait = genTrait.trait;
        this.strength = genTrait.strength;
        this.assignment = null;
    }
}