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
    , fastest: []
    , selected: null
    , jerkSelected: null
    , tab: null
    , miniTab: null
    , clickTimer: 10000
    , watermark: 0    
    , multi: 0
    , recreates: 0
    , nextOneFree: false
    , giftDue: true
    , spins: 0
    , offline: {}
    , snaps: []
}

const global = {
    scale: { buy: 1.1, buyScale: 1.0543046, cost: 2.5, add: 2, span: 1.5, autoBuyTier: 1.1 }
    , paused: false
    , tickSpeed: 50
    , ranks: 10
    , spanTarget: 5
    , zeros: 1
    , godMode: 1
    , autoComplete: 120
    , autoBuy: 10
    , graceTicks: -10
    , buyEvery: 1
    , minRoster: 1
    , scrollSpeed: 3
    , recreateCost: 5
    , recreateImproves: 0.8
    , tierLimit: 9
    , spawnChance: 1 / 5000
    , abandonTimer: 300
    , bonusTime: 300
    , offlineGrace: 2e4
    , giftChance: 1 / 2.5e4 // 1 / 2.5e5 ?
    , spinTimer: 5000
}

const switches = {
    display: true
    , updateDisplay: true
    , displayRewards: true
    , tabUpdate: true
    , displayRuns: true
    , bonusDisplay: false
}

var meta = {
    laps: 0
    , spend: 0
    , upgrades: [
          { id: `maxZeros`,         locked: false,  bought: 0,  adjust: ``, p: { scope: `global`, cost: 1, benefit: 1, multi: 5, nice: `Quantum Limit`, tooltip: `Increase the max number of Quantum by 1` } }
        , { id: `questTarget`,      locked: false,  bought: 0,  adjust: ``, p: { scope: `global`, cost: 5, benefit: 1.1, multi: 1.75, nice: `Quest Targets`, tooltip: `Reduce the targets of all Quests by 10%` } }
        , { id: `clickSpawn`,       locked: false,  bought: 0,  adjust: ``, p: { scope: `global`, cost: 3, benefit: 1.1, multi: 2, nice: `Clickables`, tooltip: `Increase the spawn rate of clickables by 5%` } }
        , { id: `skillTypes`,       locked: false,  bought: 0,  adjust: ``, p: { scope: `global`, cost: 3, benefit: 1, multi: 2.5, nice: `Force Traits`, tooltip: `Increase the maximum number of Traits that a Force can be created with by 1` } }
        , { id: `recruitJerk`,      locked: false,  bought: 0,  adjust: ``, p: { scope: `global`, cost: 2, benefit: 1, multi: 1.75, nice: `Create Force`, tooltip: `Add one Cosmic Force to your roster` } }
        , { id: `clickTilting`,     locked: true,   bought: 0,  adjust: ``, p: { scope: `global`, cost: 4, benefit: 1.05, multi: 1.75, nice: `Tilt Clickables`, tooltip: `Adjust the odds of what Clickable will spawn towards higher layers` } } ////
        , { id: `startCash`,        locked: false,  bought: 0,  adjust: ``, p: { scope: `span`, cost: 5, benefit: 2.5, multi: 1.5, nice: `Start Wealth`, tooltip: `Double the amount of resource you start with` } }
        , { id: `autoComplete`,     locked: false,  bought: 0,  adjust: ``, p: { scope: `span`, cost: 10, benefit: 1.1, multi: 2, nice: `Auto-Complete`, tooltip: `Enable / Speed Up auto-completion by 20%` } }
        , { id: `childReq`,         locked: false,  bought: 0,  adjust: ``, p: { scope: `span`, cost: 10, benefit: 1, multi: 2.5, nice: `Children Required`, tooltip: `Reduce the lower-level completions required by 1` } }
        , { id: `abandonQuest`,     locked: true,   bought: 0,  adjust: ``, p: { scope: `span`, cost: 50, benefit: 1.1, multi: 2.5, nice: `Abandon Quest`, tooltip: `Enable / Speed Up ability to abandon and regenerate a Quest` } } //
        , { id: `speedBonus`,       locked: true,   bought: 0,  adjust: ``, p: { scope: `span`, cost: 1e2, benefit: 1, multi: 10, nice: `Speed Bonus`, tooltip: `Gain a bonus to output based on the fastest lap achieved` } } ////
        // , { id: `outputBonus`,      locked: true,   bought: 0,  adjust: ``, p: { scope: `span`, cost: 1e2, benefit: 1, multi: 10, nice: `Output Bonus`, tooltip: `Gain a bonus to automation speed based on the highest earning lap achieved` } } //
        , { id: `rebirthSpan`,      locked: false,  bought: 0,  adjust: ``, p: { scope: `span`, cost: 1e3, benefit: 1, multi: 10, nice: `Rebirth Layer`, tooltip: `Reset all other upgrades back to 0 to gain a 5&#xD7; Income boost and 25% faster automation` } }
        , { id: `autoBuy`,          locked: false,  bought: 0,  adjust: ``, p: { scope: `tier`, cost: 5, benefit: 1.1, multi: 1.125, nice: `Auto Buyer`, tooltip: `Enable / Spped up auto-buying by 10%` } }
        , { id: `scaleDelay`,       locked: false,  bought: 0,  adjust: ``, p: { scope: `tier`, cost: 5, benefit: 1, multi: 1.5, nice: `Scale Delay`, tooltip: `Delay the start of cost scaling by 1 (more)` } }
        , { id: `creepReduce`,      locked: false,  bought: 0,  adjust: ``, p: { scope: `tier`, cost: 10, benefit: 1.05, multi: 2.5, nice: `Cost Scaling`, tooltip: `Reduce the amount by which costs scale by 5%` } }
        , { id: `bulkBonus`,        locked: false,  bought: 0,  adjust: ``, p: { scope: `tier`, cost: 10, benefit: 1.005, multi: 2, nice: `Bulk Bonus`, tooltip: `Increase output by 0.5% &#xD7; total owned` } }
        , { id: `headStart`,        locked: true,   bought: 0,  adjust: ``, p: { scope: `tier`, cost: 10, benefit: 1.005, multi: 1.125, nice: `Head Start`, tooltip: `Start with 1 (more) Generator of this Tier owned` } } ////
    ]
    , questDef: [
          { basis: `gained`,        locked: false, nice: `Resource Earned`, p: { target: 1e7, verbiage: `Generate N Q` } }
        , { basis: `balance`,       locked: false, nice: `Resource Held`, p: { target: 1e6, verbiage: `Hold N Q` } }
        , { basis: `cps`,           locked: false, nice: `Resource per sec.`, p: { target: 1e4, verbiage: `Reach N Q Per Second` } }
        , { basis: `spent`,         locked: false, nice: `Total Spent`, p: { target: 5e6, verbiage: `Spend N Q` } }
        , { basis: `own`,           locked: false, nice: `Generators Owned`, p: { target: 250, verbiage: `Own N ! Generators` } }
        , { basis: `buy1Gen`,       locked: false, nice: `Buy 1 Tier Type`, p: { target: [{a:60,t:0},{a:55,t:1},{a:50,t:2},{a:45,t:3},{a:40,t:4},{a:35,t:5},{a:30,t:6},{a:25,t:7},{a:15,t:8},{a:10,t:9}], verbiage: `Buy N $ Generators` } }
        , { basis: `buyNGen`,       locked: false, nice: `Buy N Tier Types`, p: { target: [{a:50,t:1},{a:45,t:2},{a:40,t:3},{a:35,t:4},{a:30,t:5},{a:25,t:6},{a:20,t:7},{a:15,t:8},{a:5,t:9}], verbiage: `Buy N Tier I to $ Generators` } }
        , { basis: `spend`,         locked: true,  nice: `Single Purchase`, p: { target: 5e5, verbiage: `Spend N ! in one Purchase` } } ////
        , { basis: `buyXGen`,       locked: true,  nice: `Buy Any Tier Type`, p: { target: 70, verbiage: `Buy N Generators of any Tier` } } //
    ]
    , jerkTraits: [
          { id: `fastOverall`,      locked: false, nice: `Overall Buy Speed`, p: { significance: 0.05, scope: `span`, verbiage: `All Tiers #% faster auto-buy` } }
        , { id: `overallDiscount`,  locked: false, nice: `Overall Discount`, p: { significance: 0.05, scope: `span`, verbiage: `All Tiers #% discount on cost` } }
        , { id: `overallOutput`,    locked: false, nice: `Overall Output`, p: { significance: 0.05, scope: `span`, verbiage: `All Tiers #% more output` } }
        , { id: `trickleIncome`,    locked: true,  nice: `Trickle Income`, p: { significance: 5,  scope: `span`, verbiage: `# Passive Income` } } ////
        , { id: `fastBuy`,          locked: false, nice: `Tier Buy Speed`, p: { significance: 0.075, scope: `tier`, verbiage: `#% faster @ auto-buy` } }
        , { id: `moreOutput`,       locked: false, nice: `Tier Output`, p: { significance: 0.125, scope: `tier`, verbiage: `#% more output from @` } }
        , { id: `lessScale`,        locked: false, nice: `Tier Scale`, p: { significance: 0.075, scope: `tier`, verbiage: `#% slower cost scaling on @` } }
        , { id: `flatDiscount`,     locked: false, nice: `Tier Discount`, p: { significance: 0.075, scope: `tier`, verbiage: `#% discount on @ cost` } }
    ]
    , limits: [
          { id: `tierLimit`, bought: 0, default: 3, nice: `Layer Limit`, adjust: `@+(3*#)`, does: `+3`, max: null, verbiage: `Maximum runs allowed per Layer.` }
        , { id: `spanTarget`, bought: 0, default: 5, nice: `Completion Req.`, adjust: `@-(#)`, does: `-1`, max: 4, verbiage: `Base amount of runs required to generate one of the Layer above it.` }
        , { id: `autoComplete`, bought: 0, default: 120, nice: `Auto-Complete Time`, adjust: `@*Math.pow(0.8,#)`, max: null, does: `-20%`, verbiage: `Baseline number of seconds that Auto-Complete takes from which to apply scale.` }
        , { id: `recreateCost`, bought: 0, default: 5, nice: `Recreate Cost`, adjust: `@-#`, max: 4, does: `-1`, verbiage: `Baseline cost of Cosmic Forces from which to apply scale.` }
        , { id: `abandonTimer`, bought: 0, default: 300, nice: `Abandon Timer`, adjust: `@*Math.pow(0.8,#)`, max: null, does: `-20%`, verbiage: `Baseline number of seconds that Abandon takes from which to apply scale.` }
        , { id: `spawnChance`, bought: 0, default: 1/5e3, nice: `Clickable Chance`, adjust: `@*Math.pow(1.5,#)`, max: null, does: `+50%`, verbiage: `Baseline Clickable spawn chance from which to apply scale.` }
        // , { id: `tiers`, bought: 0, default: 10, adjust: `n+1`, does: `+1`, max: 10, verbiage: `Number of Generators Tiers to build.` }
    ]
    , scale: [
          { id: `buy`, bought: 0, default: 1.1, max: null, nice: `Tier Cost Scale`, adjust: `1+(@-1)*Math.pow(0.8,#)`, does:`-20%`, verbiage: `Amount of scale that that cost of each successive Generator receives.` }
        , { id: `cost`, bought: 0, default: 2.5, max: null, nice: `Tier Cost Multi`, adjust: `1+(@-1)*Math.pow(0.8,#)`, does:`-20%`, verbiage: `Amount multiplier that successive Tiers base price receives.` }
        , { id: `buyScale`, bought: 0, default: 1.0543046, max: null, nice: `Growth over Tiers`, adjust: `1+(@-1)*Math.pow(0.8,#)`, does:`-20%`, verbiage: `Amount of additional scale that successive Tiers base price receives.` }
        , { id: `add`, bought: 0, default: 2, max: null, nice: `Scale over Tiers`, adjust: `1+(@-1)/Math.pow(0.8,#)`, does:`+20%`, verbiage: `Amount of scale to earnings of each successive Tier of Generator.` }
        // , { id: `ranks`, bought: 0, default: 10, adjust: 1, verbiage: `Amount of Tiers of Generators to be available.` }
        , { id: `span`, bought: 0, default: 1.5, max: null, nice: `Quest Target Multi`, adjust: `1+(@-1)*Math.pow(0.9,#)`, does:`-10%`, verbiage: `Amount of scale to Quest targets based on number of Layers from Quantum.` }
        , { id: `autoBuyTier`, bought: 0, default: 1.1, max: null, nice: `Auto-Buy Slowage`, adjust: `1+(@-1)/Math.pow(0.8,#)`, does:`-20%`, verbiage: `Scaled time increase of each Tier's Auto-Buy Upgrade purchased.` }
    ]
    , newFeatures: [
        { id: `bulkBuying`, bought: 0, max: 5, does: `+5`, adjust: `#*5`, nice: `Bulk Buying`, cost: 1 }
        , { id: `prestigeHoldover`, bought: 0, max: null, does: `+0.1%`, adjust: `#*0.001`, nice: `Points Carry-over`, cost: 3 }
        , { id: `specialJerks`, bought: 0, max: null, does: `+2.5%`, adjust: `1 - Math.pow( 0.025, # )`, nice: `Special Forces`, cost: 2 }
        , { id: `clickablePoints`, bought: 0, max: null, does: `+5%`, adjust: `1 - Math.pow( 0.05, # )`, nice: `Clickable Points`, cost: 1 }
        , { id: `pointTrickle`, bought: 0, max: null, does: `+1/min`, adjust: `# * ( global.tickSpeed / 1000 ) / 60`, nice: `Points Trickle`, cost: 2 }
        , { id: `remainderCarryover`, bought: 0, max: null, does: null, adjust: ``, nice: `Keep Remainder`, cost: 2 }
        // boosts that appear from time to time
    ]
}

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
    , { curr: `&lt;&#47;&#62;`, label: `Code`,          color: `#385e35` }
    , { curr: `Features`,       label: `Scalar`,        color: `#6f8240` }
]

const gen = [`Tier I`,`Tier II`,`Tier III`,`Tier IV`,`Tier V`,`Tier VI`,`Tier VII`,`Tier VIII`,`Tier IX`,`Tier X`];
const gg = [`I`,`II`,`III`,`IV`,`V`,`VI`,`VII`,`VIII`,`IX`,`X`];
const chance = [1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,4,4,4,4,4,4,4,5,5,5,5,5,5,6,6,6,6,6,7,7,7,7,8,8,8,9,9,10];

var upgrades = []
var questDef = []
var jerkTraits = []
var jerkSpecialTraits = [
      { id: `autoPause`, locked: true, scope: `span`, verbiage: `Automatically pause all Auto-Buy when Quest completes` }
    , { id: `dormantForce`, locked: true, scope: `span`, verbiage: `Gain 10% of all Dormant Force bonuses` }
    , { id: `buyMax`, locked: true, scope: `span`, verbiage: `Auto-Buy buys as many of a Tier as you can afford` }
    , { id: `superSpeed`, locked: true, scope: `span`, verbiage: `All Tiers Auto-Buy 250% speed` }
    , { id: `superOutput`, locked: true, scope: `span`, verbiage: `All Tiers 200% output` }
    , { id: `superDiscount`, locked: true, scope: `span`, verbiage: `All Tiers 95% discount` }
]