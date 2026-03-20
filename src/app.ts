type Phase = "intro" | "combat" | "between" | "discovery" | "death";
type WeaponId = "sword" | "knife" | "spear" | "axe";
type MoveId =
  | "flail"
  | "poke"
  | "slash"
  | "jab"
  | "slice"
  | "bury"
  | "brace"
  | "lunge"
  | "skewer"
  | "chop"
  | "hook"
  | "cleave";

interface MoveDefinition {
  id: MoveId;
  name: string;
  damage: [number, number];
  accuracy: number;
  accuracyPerUse: number;
  maxAccuracyBonus: number;
  selfRisk: number;
  selfRiskReductionPerUse: number;
  selfDamage: [number, number];
  hitTexts: string[];
  missTexts: string[];
  selfTexts: string[];
}

interface ExperimentDefinition {
  labels: string[];
  successDamage: [number, number];
  catastropheDamage: [number, number];
  successTexts: string[];
  failureTexts: string[];
  catastropheTexts: string[];
}

interface WeaponDiscoveryDefinition {
  minimumEncounter: number;
  minimumAwakening: number;
  sceneLines: string[];
  actionLabel: string;
  equipSceneLines: string[];
  discoveryLogLine: string;
  equipLogLine: string;
}

interface WeaponDefinition {
  id: WeaponId;
  name: string;
  progression: MoveId[];
  moves: Record<MoveId, MoveDefinition>;
  experiments: Partial<Record<MoveId, ExperimentDefinition>>;
  awakeningLines: string[];
  weaponLines: string[];
  reflexLines: string[];
  techniqueLines: Partial<Record<MoveId, string[]>>;
  discovery?: WeaponDiscoveryDefinition;
}

interface EnemyTemplate {
  id: string;
  name: string;
  baseHp: number;
  hpVariance: [number, number];
  baseDamage: [number, number];
  accuracy: number;
  intros: string[];
  hitTexts: string[];
  missTexts: string[];
  deathTexts: string[];
}

interface EnemyState {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  damage: [number, number];
  accuracy: number;
  introLine: string;
  template: EnemyTemplate;
}

interface WeaponProgress {
  unlockedMoveIds: MoveId[];
  moveUsage: Partial<Record<MoveId, number>>;
}

interface PersistentState {
  currentWeaponId: WeaponId;
  discoveredWeaponIds: WeaponId[];
  weapons: Record<WeaponId, WeaponProgress>;
}

interface ExperimentalOption {
  label: string;
  nextMoveId: MoveId;
}

type LogTone = "neutral" | "enemy-hit" | "self-hit";

interface LogEntry {
  text: string;
  tone: LogTone;
}

interface RunState {
  maxHp: number;
  hp: number;
  encounterNumber: number;
  awakeningNumber: number;
  phase: Phase;
  sceneLines: string[];
  sceneLineIndex: number;
  log: LogEntry[];
  enemy: EnemyState | null;
  discoveryWeaponId: WeaponId | null;
  experimentalOption: ExperimentalOption | null;
  experimentationReadiness: number;
  turnsWithoutExperiment: number;
  recentCatastropheTurns: number;
  pendingRecovery: number;
}

interface ActionDescriptor {
  id: string;
  label: string;
  kind: "move" | "experiment" | "discover";
}

interface AwakeningText {
  awakeningLine: string;
  weaponLine: string;
  techniqueLine: string;
  logLine: string;
}

const STORAGE_KEY = "ahackwillslash.weapon-memory.v1";
const MAX_LOG_LINES = 3;
const PLAYER_MAX_HP = 12;
const ENEMY_TURN_DELAY_MS = 650;
const WEAPON_HOLD_WORDS = [
  "badly",
  "poorly",
  "awkwardly",
  "less badly",
  "less awkwardly",
  "more firmly",
  "more evenly",
  "more naturally",
  "steadily",
  "securely",
  "cleanly",
  "neatly",
  "surely",
  "easily",
  "right",
] as const;

const swordDefinition: WeaponDefinition = {
  id: "sword",
  name: "Sword",
  progression: ["flail", "poke", "slash"],
  moves: {
    flail: {
      id: "flail",
      name: "Flail wildly",
      damage: [1, 3],
      accuracy: 0.56,
      accuracyPerUse: 0.018,
      maxAccuracyBonus: 0.12,
      selfRisk: 0.12,
      selfRiskReductionPerUse: 0.01,
      selfDamage: [1, 1],
      hitTexts: [
        "You swing in a panic. The blade hits something soft.",
        "You hack across the dark. It recoils from the blow.",
        "Your swing is ugly, but heavy enough to land.",
      ],
      missTexts: [
        "You swing too early. Steel cuts only dark.",
        "The sword jerks wide. You hit nothing.",
        "You lash out blind and feel the blade drag through air.",
      ],
      selfTexts: [
        "Your wrist twists under the weight. Pain runs up your arm.",
        "The hilt shifts in your hand. Your knuckles split against it.",
      ],
    },
    poke: {
      id: "poke",
      name: "Poke forward",
      damage: [2, 4],
      accuracy: 0.72,
      accuracyPerUse: 0.016,
      maxAccuracyBonus: 0.1,
      selfRisk: 0.05,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 1],
      hitTexts: [
        "You drive the point forward. It goes in cleanly.",
        "You thrust straight ahead and find flesh.",
        "Your arms stay tighter this time. The point lands.",
      ],
      missTexts: [
        "You thrust, but the point skids past in the dark.",
        "Your jab falls short. Something breathes just beyond it.",
        "You stab into empty space and pull back fast.",
      ],
      selfTexts: [
        "You lock your elbow too hard. Your shoulder flares with pain.",
      ],
    },
    slash: {
      id: "slash",
      name: "Slash",
      damage: [3, 6],
      accuracy: 0.66,
      accuracyPerUse: 0.014,
      maxAccuracyBonus: 0.08,
      selfRisk: 0.09,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 2],
      hitTexts: [
        "You cut across with intent. Something opens under the blade.",
        "The wider cut lands hard and makes it stumble away.",
        "You turn your body with the sword. The edge bites deep.",
      ],
      missTexts: [
        "You cut too wide. The blade passes through nothing.",
        "The slash drags a breath too slow. It slips clear.",
        "Your wider cut tears the dark and nothing else.",
      ],
      selfTexts: [
        "The cut pulls you sideways. Your ribs strike stone.",
        "You over-rotate and wrench your side before you recover.",
      ],
    },
    jab: undefined as never,
    slice: undefined as never,
    bury: undefined as never,
    brace: undefined as never,
    lunge: undefined as never,
    skewer: undefined as never,
    chop: undefined as never,
    hook: undefined as never,
    cleave: undefined as never,
  },
  experiments: {
    poke: {
      labels: ["Adjust your grip", "Try a thrust"],
      successDamage: [2, 4],
      catastropheDamage: [2, 4],
      successTexts: [
        "You shift your grip and drive the point forward. It connects cleanly.",
        "You pull the sword closer to your body and thrust. The point finds it.",
      ],
      failureTexts: [
        "You try to thrust, but your arm locks awkwardly. The point skids past.",
        "You adjust too slowly. The sword wobbles and gives you nothing.",
      ],
      catastropheTexts: [
        "You overextend badly. The sword slips in your hand and it crashes into you.",
        "You lunge too far and nearly fall into it. Claws hit you before you recover.",
      ],
    },
    slash: {
      labels: ["Swing differently", "Test a wider cut"],
      successDamage: [3, 5],
      catastropheDamage: [3, 5],
      successTexts: [
        "You widen the motion and let the edge travel. It opens the dark in front of you.",
        "You turn your hips with the blade. The cut lands with real weight.",
      ],
      failureTexts: [
        "You try a wider cut, but the blade catches awkwardly and drags off line.",
        "The motion comes apart halfway through. The sword only hisses through air.",
      ],
      catastropheTexts: [
        "You commit to the wider cut too soon. The sword yanks you off balance and it tears into you.",
        "The blade catches badly. You stumble hard and something mauls you before you reset.",
      ],
    },
  },
  awakeningLines: [
    "You wake up.",
    "You wake up a breath faster.",
    "You wake up with less blankness between you and the dark.",
    "You wake up before the panic fully takes you.",
    "You wake up with a little more of yourself intact.",
    "You wake up with the last lesson still clinging to you.",
    "You wake up already searching for the hilt.",
    "You wake up with your hands remembering before your thoughts do.",
    "You wake up and the room makes sense one instant sooner.",
    "You wake up with practiced fear.",
    "You wake up with the first shape of readiness in you.",
    "You wake up carrying a little technique with the terror.",
    "You wake up almost in fighting posture.",
    "You wake up with old motions waiting under your skin.",
    "You wake up ready enough to hate how normal that feels.",
    "You wake up with the sword already halfway known to you.",
  ],
  weaponLines: [
    "You are holding a sword.",
    "You are holding a sword. You need a second to find the grip.",
    "You are holding a sword. Your hand settles on the hilt a little faster.",
    "You are holding a sword. The weight surprises you less now.",
    "You are holding a sword. The grip is starting to feel familiar.",
    "You are holding a sword. Your hands close around it with some purpose.",
    "You are holding a sword. Your wrists remember the balance.",
    "You are holding a sword. The hilt fits before you fully wake.",
    "You are holding a sword. You know where the point is without looking.",
    "You are holding a sword. The blade feels like something you can direct.",
    "You are holding a sword. Your stance starts to arrive with the weapon.",
    "You are holding a sword. The balance settles into you immediately.",
    "You are holding a sword. Your grip lands clean and practiced.",
    "You are holding a sword. Your body takes its measure in an instant.",
    "You are holding a sword. The weapon feels ready the moment you are.",
    "You are holding a sword. It belongs in your hands now.",
  ],
  reflexLines: [
    "It feels wrong immediately.",
    "You almost catch the grip cleanly.",
    "Your fingers settle a little faster.",
    "You know where the hilt is before you fully think.",
    "The weight no longer shocks your wrist.",
    "Your grip closes with less panic in it.",
    "You gather the sword into yourself more neatly.",
    "Your hand finds the balance point by habit.",
    "The hilt lands against your palm like a remembered answer.",
    "Your arm sets without the old scramble.",
    "You take the sword in with a little discipline.",
    "Your grip arrives before the fear does.",
    "The old fumble is nearly gone.",
    "Your body receives the weapon like it expected it.",
    "You catch the sword with practiced certainty.",
    "You never really let go of it.",
  ],
  techniqueLines: {
    flail: [
      "Panic still comes before form.",
      "You remember the first ugly swing.",
      "You remember where your hands slipped last time.",
      "The blade no longer surprises you quite as much when you swing it.",
      "Your wild swing is getting narrower at the edges.",
      "You can feel the difference between weight and control now.",
    ],
    poke: [
      "There is a thrust in you now, rough but real.",
      "You remember drawing the point back toward center.",
      "Your arms recall a straighter line through the dark.",
      "The point-forward motion returns before the fear does.",
      "You know how to keep the tip alive for a beat longer now.",
      "The thrust is starting to feel repeatable.",
    ],
    slash: [
      "You remember the wider cut and how your hips must follow it.",
      "The edge wants a longer path and you know how to give it one.",
      "A real cut lives in your shoulders now.",
      "You wake already knowing how the blade should travel.",
      "The wider motion feels deliberate instead of desperate.",
      "Your body remembers how to turn the edge through something living.",
    ],
  },
};

const knifeDefinition: WeaponDefinition = {
  id: "knife",
  name: "Knife",
  progression: ["jab", "slice", "bury"],
  moves: {
    flail: undefined as never,
    poke: undefined as never,
    slash: undefined as never,
    jab: {
      id: "jab",
      name: "Jab quick",
      damage: [1, 3],
      accuracy: 0.76,
      accuracyPerUse: 0.02,
      maxAccuracyBonus: 0.12,
      selfRisk: 0.04,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 1],
      hitTexts: [
        "You flick the knife forward and catch it under the ribs.",
        "A short jab lands before it can pull away.",
        "The knife only needs a hand's width of space. It finds one.",
      ],
      missTexts: [
        "You stab too short and meet only air.",
        "The little blade flashes past and finds nothing.",
        "You dart in, but it shifts before the point arrives.",
      ],
      selfTexts: [
        "You crowd too close and scrape your knuckles on stone.",
      ],
    },
    slice: {
      id: "slice",
      name: "Slice across",
      damage: [2, 4],
      accuracy: 0.72,
      accuracyPerUse: 0.016,
      maxAccuracyBonus: 0.1,
      selfRisk: 0.06,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 1],
      hitTexts: [
        "You drag the edge across it and feel something open.",
        "The slice is short, quick, and nasty. It lands.",
        "You cut across the dark and make it pull back hissing.",
      ],
      missTexts: [
        "You cut too shallow and only stir the air.",
        "The slice lands a breath late and the dark slips aside.",
        "You carve a line through nothing and reset.",
      ],
      selfTexts: [
        "The tight motion bites into your wrist on the return.",
      ],
    },
    bury: {
      id: "bury",
      name: "Bury the blade",
      damage: [3, 5],
      accuracy: 0.62,
      accuracyPerUse: 0.014,
      maxAccuracyBonus: 0.08,
      selfRisk: 0.1,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 2],
      hitTexts: [
        "You drive the knife in to the hilt. It convulses around your arm.",
        "You get all the way inside its guard and bury the blade deep.",
        "The knife disappears into it and comes back wet.",
      ],
      missTexts: [
        "You commit too hard and it slips outside the line.",
        "You lunge in close and it isn't there anymore.",
        "The blade goes deep into empty dark and you hate how exposed that feels.",
      ],
      selfTexts: [
        "You wrench your shoulder getting back out.",
        "You come in too hard and slam your forearm against bone.",
      ],
    },
    brace: undefined as never,
    lunge: undefined as never,
    skewer: undefined as never,
    chop: undefined as never,
    hook: undefined as never,
    cleave: undefined as never,
  },
  experiments: {
    slice: {
      labels: ["Turn the edge", "Try a short cut"],
      successDamage: [2, 4],
      catastropheDamage: [2, 4],
      successTexts: [
        "You angle the knife and draw it sideways. The edge catches and opens it.",
        "You stop trying to punch with the knife and let it cut. It works.",
      ],
      failureTexts: [
        "You try to turn the knife mid-motion, but the cut comes apart.",
        "The blade skitters off line. Too small, too rushed.",
      ],
      catastropheTexts: [
        "You over-commit inside its reach. Teeth rake your arm before you can get back out.",
        "The knife catches and your hand follows it in. It mauls you at kissing distance.",
      ],
    },
    bury: {
      labels: ["Step all the way in", "Commit to the stab"],
      successDamage: [3, 5],
      catastropheDamage: [3, 5],
      successTexts: [
        "You stop hesitating and drive the blade in to the grip. It jerks violently.",
        "You crowd it on purpose and bury the knife deep. The thing folds around the wound.",
      ],
      failureTexts: [
        "You try to force the deeper stab, but your nerve breaks halfway through.",
        "You get close enough to smell it and then recoil too soon. No depth, no damage.",
      ],
      catastropheTexts: [
        "You step in too far and it crashes into your chest before the blade can do its work.",
        "You try to bury the knife and lose the line completely. Claws find your ribs.",
      ],
    },
  },
  awakeningLines: [
    "You wake up with your hand already closed.",
    "You wake up and the smaller weight makes sense quickly.",
    "You wake up with a mean little certainty in your grip.",
    "You wake up and the knife belongs there before the fear arrives.",
  ],
  weaponLines: [
    "You are holding a knife.",
    "You are holding a knife. It sits close against your palm.",
    "You are holding a knife. The short balance feels immediate.",
    "You are holding a knife. Your hand knows exactly how near it wants you.",
  ],
  reflexLines: [
    "It feels intimate in a way the sword never did.",
    "The blade disappears into your grip cleanly.",
    "Your hand closes with ugly confidence.",
    "You never need to search for it anymore.",
  ],
  techniqueLines: {
    jab: [
      "Short reach teaches you to be honest about distance.",
      "The knife wants nerve more than swing.",
      "You are learning what counts as close.",
      "Your hand now trusts the short line forward.",
    ],
    slice: [
      "You remember that the knife cuts best when it travels sideways.",
      "A quick dragging edge lives in your wrist now.",
      "The short cut feels practiced instead of frantic.",
      "You know how little motion the blade truly needs.",
    ],
    bury: [
      "The knife has taught you what it means to go all the way in.",
      "You remember the final hard push and the need to get back out alive.",
      "Your body keeps a vicious little line of entry ready.",
      "Close violence now feels rehearsed.",
    ],
  },
  discovery: {
    minimumEncounter: 3,
    minimumAwakening: 1,
    sceneLines: [
      "The thing collapses hard enough to rattle the floor.",
      "Something small glints under one of its hands.",
      "A knife. Thin. Practical. Cruel.",
    ],
    actionLabel: "Take the knife",
    equipSceneLines: [
      "You take the knife.",
      "It is lighter than the sword and somehow meaner.",
      "Something else is already moving in the dark.",
    ],
    discoveryLogLine: "Under the corpse, your hand finds a knife.",
    equipLogLine: "You leave the sword behind and take the knife.",
  },
};

const spearDefinition: WeaponDefinition = {
  id: "spear",
  name: "Spear",
  progression: ["brace", "lunge", "skewer"],
  moves: {
    flail: undefined as never,
    poke: undefined as never,
    slash: undefined as never,
    jab: undefined as never,
    slice: undefined as never,
    bury: undefined as never,
    brace: {
      id: "brace",
      name: "Brace low",
      damage: [2, 3],
      accuracy: 0.68,
      accuracyPerUse: 0.018,
      maxAccuracyBonus: 0.1,
      selfRisk: 0.04,
      selfRiskReductionPerUse: 0.006,
      selfDamage: [1, 1],
      hitTexts: [
        "You plant the butt and let it run onto the point.",
        "The spear holds steady long enough. It impales itself a little.",
        "You keep the line simple and the point punishes its rush.",
      ],
      missTexts: [
        "You brace too early and it never enters the line.",
        "The point hangs in the dark unused.",
        "You set the spear and the creature skirts the threat.",
      ],
      selfTexts: [
        "The impact jars straight through your shoulders.",
      ],
    },
    lunge: {
      id: "lunge",
      name: "Lunge",
      damage: [3, 5],
      accuracy: 0.64,
      accuracyPerUse: 0.016,
      maxAccuracyBonus: 0.1,
      selfRisk: 0.07,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 2],
      hitTexts: [
        "You send the spear forward in one long line. It lands clean.",
        "The reach surprises even you. The point finds it at distance.",
        "You step through and the spear punches deep.",
      ],
      missTexts: [
        "The thrust runs long and the point passes by.",
        "You lunge and the dark folds around the shaft instead.",
        "Too much reach, not enough certainty. Nothing there.",
      ],
      selfTexts: [
        "You overstep and wrench your back trying to recover the shaft.",
        "The long miss pulls your shoulder forward painfully.",
      ],
    },
    skewer: {
      id: "skewer",
      name: "Skewer through",
      damage: [4, 6],
      accuracy: 0.58,
      accuracyPerUse: 0.014,
      maxAccuracyBonus: 0.08,
      selfRisk: 0.1,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 2],
      hitTexts: [
        "You drive with both hands and feel the point tear through something vital.",
        "The spear goes a terrible distance before it stops.",
        "You put your whole body behind the thrust and it carries through.",
      ],
      missTexts: [
        "You commit to the long drive and the target vanishes off the line.",
        "The finishing thrust runs past and leaves you overextended.",
        "You try to spear it clean through and meet only empty dark.",
      ],
      selfTexts: [
        "The heavy follow-through smashes the haft into your ribs.",
        "You rip the spear back too hard and strain your side.",
      ],
    },
    chop: undefined as never,
    hook: undefined as never,
    cleave: undefined as never,
  },
  experiments: {
    lunge: {
      labels: ["Advance the point", "Try a longer thrust"],
      successDamage: [3, 5],
      catastropheDamage: [2, 4],
      successTexts: [
        "You stop waiting for it to come to you and send the spear out. The point lands hard.",
        "You give the shaft more room and the longer thrust connects beautifully.",
      ],
      failureTexts: [
        "You try to lengthen the motion, but the spear wobbles and loses the line.",
        "The longer thrust feels promising until it doesn't hit anything at all.",
      ],
      catastropheTexts: [
        "You slide your hands wrong and the spear bucks against you. It crashes in while you recover.",
        "The longer thrust drags you open and the creature tears at you before you can reset.",
      ],
    },
    skewer: {
      labels: ["Drive with both hands", "Commit to the full thrust"],
      successDamage: [4, 6],
      catastropheDamage: [3, 5],
      successTexts: [
        "You commit through the target instead of to it. The spear carries through deep.",
        "Both hands drive together and the point punches far enough to matter.",
      ],
      failureTexts: [
        "You try to add real force, but the long weapon slips off line halfway through.",
        "The full thrust almost happens. Almost gets you killed instead.",
      ],
      catastropheTexts: [
        "You put too much of yourself into the drive and the haft traps you in place. It mauls you up close.",
        "The heavy thrust goes wrong immediately. The spear jams and you take the punishment for it.",
      ],
    },
  },
  awakeningLines: [
    "You wake up with something longer than your body expects.",
    "You wake up and the shaft is already tucked under your hand.",
    "You wake up knowing distance sooner.",
    "You wake up with reach in your bones.",
  ],
  weaponLines: [
    "You are holding a spear.",
    "You are holding a spear. The length finds its line across your body.",
    "You are holding a spear. The point feels present even in the dark.",
    "You are holding a spear. You know where the far end is without seeing it.",
  ],
  reflexLines: [
    "It asks for space and you find that space quickly.",
    "Your hands separate to the right places by habit.",
    "The longer balance no longer feels awkward.",
    "Reach arrives with you now.",
  ],
  techniqueLines: {
    brace: [
      "The spear first teaches patience and a clean line.",
      "You remember how to let the enemy come to the point.",
      "Your body now understands stillness as a weapon.",
      "The set position returns to you immediately.",
    ],
    lunge: [
      "You remember the long step that sends the point farther than fear expects.",
      "There is a measured forward drive in you now.",
      "You know how to extend without surrendering yourself entirely.",
      "The long thrust feels repeatable now.",
    ],
    skewer: [
      "You remember that the spear is at its worst when you truly drive it through.",
      "Your shoulders keep the memory of a full committed thrust.",
      "The long finishing line waits under your skin.",
      "You wake with a brutal reach already prepared.",
    ],
  },
  discovery: {
    minimumEncounter: 5,
    minimumAwakening: 2,
    sceneLines: [
      "Beyond the body, wood scrapes stone.",
      "A spear lies snapped free from an older corpse pinned against the wall.",
      "Even in the dark, the reach feels different.",
    ],
    actionLabel: "Take the spear",
    equipSceneLines: [
      "You pull the spear free.",
      "The shaft is awkward for one breath and right the next.",
      "Something hears the wood move.",
    ],
    discoveryLogLine: "Against the wall, your hand closes around a spear.",
    equipLogLine: "You take the spear and feel the room get larger.",
  },
};

const axeDefinition: WeaponDefinition = {
  id: "axe",
  name: "Axe",
  progression: ["chop", "hook", "cleave"],
  moves: {
    flail: undefined as never,
    poke: undefined as never,
    slash: undefined as never,
    jab: undefined as never,
    slice: undefined as never,
    bury: undefined as never,
    brace: undefined as never,
    lunge: undefined as never,
    skewer: undefined as never,
    chop: {
      id: "chop",
      name: "Chop down",
      damage: [2, 4],
      accuracy: 0.62,
      accuracyPerUse: 0.018,
      maxAccuracyBonus: 0.1,
      selfRisk: 0.09,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 1],
      hitTexts: [
        "You bring the axe down and feel it bite hard.",
        "The head lands with ugly authority.",
        "A short downward chop catches and tears.",
      ],
      missTexts: [
        "The axe falls heavy into empty dark.",
        "You chop down and the weight keeps going with nothing to stop it.",
        "Too slow. Too committed. Nothing there.",
      ],
      selfTexts: [
        "The weight yanks your shoulder on the miss.",
      ],
    },
    hook: {
      id: "hook",
      name: "Hook back",
      damage: [3, 5],
      accuracy: 0.6,
      accuracyPerUse: 0.016,
      maxAccuracyBonus: 0.08,
      selfRisk: 0.08,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 2],
      hitTexts: [
        "You catch it on the return and rip flesh open.",
        "The axe head hooks backward and tears something loose.",
        "You let the beard of the axe do meaner work on the way back.",
      ],
      missTexts: [
        "You try to catch it on the return, but the dark isn't where you thought.",
        "The hook comes back empty and awkward.",
        "You yank the axe through air and lose your footing for a beat.",
      ],
      selfTexts: [
        "The yank on the recovery twists your ribs.",
        "The return tears at your own shoulder before it finds anything else.",
      ],
    },
    cleave: {
      id: "cleave",
      name: "Cleave through",
      damage: [4, 7],
      accuracy: 0.54,
      accuracyPerUse: 0.014,
      maxAccuracyBonus: 0.08,
      selfRisk: 0.13,
      selfRiskReductionPerUse: 0.008,
      selfDamage: [1, 2],
      hitTexts: [
        "You throw everything into the arc and the axe nearly splits it apart.",
        "The full swing lands like a sentence.",
        "You cleave through with enough force to stagger yourself and it both.",
      ],
      missTexts: [
        "The big arc whistles past and leaves you open.",
        "You swing for the ending and the ending isn't there.",
        "The cleave takes too long. It slips outside the path.",
      ],
      selfTexts: [
        "The heavy follow-through slams the haft into your side.",
        "The miss pulls at every joint in your arms.",
      ],
    },
  },
  experiments: {
    hook: {
      labels: ["Use the back edge", "Try to catch it on the return"],
      successDamage: [3, 5],
      catastropheDamage: [2, 4],
      successTexts: [
        "You let the return of the axe matter. It catches and rips hard.",
        "You drag the hooked edge back through it and learn something vicious.",
      ],
      failureTexts: [
        "You try to make the return bite, but the path gets muddy and useless.",
        "The back-edge idea is right. Your timing is not.",
      ],
      catastropheTexts: [
        "You over-yank the axe and it drags you off line. The creature slams into you.",
        "The return catches badly and the haft jars your whole body before claws do worse.",
      ],
    },
    cleave: {
      labels: ["Commit to the full arc", "Test a killing swing"],
      successDamage: [4, 7],
      catastropheDamage: [3, 5],
      successTexts: [
        "You trust the weight and complete the whole merciless arc. It lands ruinously.",
        "The axe finally gets the swing it wanted. The blow cleaves deep.",
      ],
      failureTexts: [
        "You try the full swing, but fear shortens it halfway through.",
        "The killing arc almost arrives. Almost gets you killed instead.",
      ],
      catastropheTexts: [
        "You give the axe everything and lose yourself with it. The thing tears into you before you recover.",
        "The full arc drags you wide open. Pain arrives before the axe comes back.",
      ],
    },
  },
  awakeningLines: [
    "You wake up with a heavier answer in your hands.",
    "You wake up and the axe head is already pulling at your arm.",
    "You wake up ready for weight.",
    "You wake up with force before thought.",
  ],
  weaponLines: [
    "You are holding an axe.",
    "You are holding an axe. The head hangs low and certain.",
    "You are holding an axe. The balance feels brutal and familiar.",
    "You are holding an axe. The weight settles into you like old intent.",
  ],
  reflexLines: [
    "It asks more from your body and gets it quickly.",
    "Your grip braces for the drag without thinking.",
    "You receive the weight with practiced shoulders.",
    "The heft no longer surprises you at all.",
  ],
  techniqueLines: {
    chop: [
      "The axe first teaches simple commitment.",
      "You remember how little elegance raw weight requires.",
      "A short brutal downward line now lives in your shoulders.",
      "The first hard chop is no longer new to you.",
    ],
    hook: [
      "You remember that the axe can still do harm on the way back.",
      "The return tear lives in your hands now.",
      "You know how to be cruel with the recovery.",
      "The hooked pull feels natural now.",
    ],
    cleave: [
      "The axe has taught you the shape of a true finishing blow.",
      "Your body remembers the full punishing arc.",
      "Heavy killing motion waits in you before you stand.",
      "You wake already half-committed to the cleave.",
    ],
  },
  discovery: {
    minimumEncounter: 7,
    minimumAwakening: 3,
    sceneLines: [
      "Metal knocks once against stone in the next pocket of dark.",
      "An axe lies beside a split ribcage as if someone reached for it too late.",
      "The weight promises harm immediately.",
    ],
    actionLabel: "Take the axe",
    equipSceneLines: [
      "You lift the axe.",
      "Its weight drags your arm down and your stance into place with it.",
      "The dark answers the sound.",
    ],
    discoveryLogLine: "Near the wall, your hand closes around an axe.",
    equipLogLine: "You take the axe and feel your shoulders prepare around it.",
  },
};

const weaponDefinitions: Record<WeaponId, WeaponDefinition> = {
  sword: swordDefinition,
  knife: knifeDefinition,
  spear: spearDefinition,
  axe: axeDefinition,
};

const weaponOrder: WeaponId[] = ["sword", "knife", "spear", "axe"];

const enemyTemplate: EnemyTemplate = {
  id: "thing-in-the-dark",
  name: "Shape",
  baseHp: 9,
  hpVariance: [0, 2],
  baseDamage: [2, 3],
  accuracy: 0.62,
  intros: [
    "You hear something breathing in the dark.",
    "Claws scrape stone nearby.",
    "A shape shifts just ahead of you.",
    "Wet breathing. Close.",
  ],
  hitTexts: [
    "It hits your ribs.",
    "Claws drag across your forearm.",
    "Something heavy slams into your chest.",
    "It catches your shoulder in the dark.",
  ],
  missTexts: [
    "It lunges and misses you by inches.",
    "Claws scrape stone beside you.",
    "You hear it rush past and lose you.",
  ],
  deathTexts: [
    "It folds with a wet sound.",
    "Something drops at your feet.",
    "The breathing stops.",
  ],
};

function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === "string" && weaponOrder.includes(value as WeaponId);
}

function createDefaultWeaponProgress(weapon: WeaponDefinition): WeaponProgress {
  const moveUsage = weapon.progression.reduce<Partial<Record<MoveId, number>>>(
    (usage, moveId) => {
      usage[moveId] = 0;
      return usage;
    },
    {},
  );

  return {
    unlockedMoveIds: [weapon.progression[0]],
    moveUsage,
  };
}

function createDefaultPersistentState(): PersistentState {
  const weapons = weaponOrder.reduce<Record<WeaponId, WeaponProgress>>(
    (collection, weaponId) => {
      collection[weaponId] = createDefaultWeaponProgress(weaponDefinitions[weaponId]);
      return collection;
    },
    {} as Record<WeaponId, WeaponProgress>,
  );

  return {
    currentWeaponId: "sword",
    discoveredWeaponIds: ["sword"],
    weapons,
  };
}

function sanitizePersistentState(raw: unknown): PersistentState {
  const fallback = createDefaultPersistentState();

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const parsed = raw as Partial<PersistentState>;
  const discoveredSet = new Set<WeaponId>(["sword"]);

  if (Array.isArray(parsed.discoveredWeaponIds)) {
    for (const weaponId of parsed.discoveredWeaponIds) {
      if (isWeaponId(weaponId)) {
        discoveredSet.add(weaponId);
      }
    }
  }

  const weapons = weaponOrder.reduce<Record<WeaponId, WeaponProgress>>(
    (collection, weaponId) => {
      const weapon = weaponDefinitions[weaponId];
      const rawProgress = parsed.weapons?.[weaponId];
      const unlockedSet = new Set<MoveId>([weapon.progression[0]]);

      if (Array.isArray(rawProgress?.unlockedMoveIds)) {
        for (const moveId of rawProgress.unlockedMoveIds) {
          if (weapon.progression.includes(moveId)) {
            unlockedSet.add(moveId);
          }
        }
      }

      const moveUsage = weapon.progression.reduce<Partial<Record<MoveId, number>>>(
        (usage, moveId) => {
          const value = rawProgress?.moveUsage?.[moveId];
          usage[moveId] =
            typeof value === "number" ? Math.max(0, Math.floor(value)) : 0;
          return usage;
        },
        {},
      );

      const progression = weapon.progression.filter((moveId) =>
        unlockedSet.has(moveId),
      );
      const meaningfulProgress =
        progression.length > 1 ||
        weapon.progression.some((moveId) => (moveUsage[moveId] ?? 0) > 0);

      if (weaponId !== "sword" && meaningfulProgress) {
        discoveredSet.add(weaponId);
      }

      collection[weaponId] = {
        unlockedMoveIds: progression.length > 0 ? progression : [weapon.progression[0]],
        moveUsage,
      };
      return collection;
    },
    {} as Record<WeaponId, WeaponProgress>,
  );

  const currentWeaponId =
    isWeaponId(parsed.currentWeaponId) && discoveredSet.has(parsed.currentWeaponId)
      ? parsed.currentWeaponId
      : "sword";

  return {
    currentWeaponId,
    discoveredWeaponIds: weaponOrder.filter((weaponId) => discoveredSet.has(weaponId)),
    weapons,
  };
}

function loadPersistentState(): PersistentState {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return createDefaultPersistentState();
    }

    return sanitizePersistentState(JSON.parse(rawValue));
  } catch {
    return createDefaultPersistentState();
  }
}

function savePersistentState(state: PersistentState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A failed save should not stop the prototype from running locally.
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clampLine(lines: string[], index: number): string {
  return lines[Math.min(index, lines.length - 1)] ?? "";
}

function createEnemy(encounterNumber: number): EnemyState {
  const hpBonus = Math.min(4, Math.floor((encounterNumber - 1) / 2));
  const damageBonus = encounterNumber >= 4 ? 1 : 0;
  const maxHp =
    enemyTemplate.baseHp +
    hpBonus +
    randomInt(enemyTemplate.hpVariance[0], enemyTemplate.hpVariance[1]);

  return {
    id: enemyTemplate.id,
    name: enemyTemplate.name,
    maxHp,
    hp: maxHp,
    damage: [
      enemyTemplate.baseDamage[0] + damageBonus,
      enemyTemplate.baseDamage[1] + damageBonus,
    ],
    accuracy: clamp(enemyTemplate.accuracy + (encounterNumber - 1) * 0.015, 0, 0.76),
    introLine: pickRandom(enemyTemplate.intros),
    template: enemyTemplate,
  };
}

function getWeapon(weaponId: WeaponId): WeaponDefinition {
  return weaponDefinitions[weaponId];
}

function getCurrentWeapon(state: PersistentState): WeaponDefinition {
  return getWeapon(state.currentWeaponId);
}

function getWeaponProgress(
  state: PersistentState,
  weaponId: WeaponId = state.currentWeaponId,
): WeaponProgress {
  return state.weapons[weaponId];
}

function getUnlockedMoves(state: PersistentState): MoveDefinition[] {
  const weapon = getCurrentWeapon(state);
  const progress = getWeaponProgress(state);

  return progress.unlockedMoveIds.map((moveId) => weapon.moves[moveId]);
}

function getNextMoveId(state: PersistentState): MoveId | null {
  const weapon = getCurrentWeapon(state);
  const progress = getWeaponProgress(state);

  for (const moveId of weapon.progression) {
    if (!progress.unlockedMoveIds.includes(moveId)) {
      return moveId;
    }
  }

  return null;
}

function getTotalWeaponUsage(
  progress: WeaponProgress,
  weapon: WeaponDefinition,
): number {
  return weapon.progression.reduce((sum, moveId) => {
    return sum + (progress.moveUsage[moveId] ?? 0);
  }, 0);
}

function getWeaponLevel(
  state: PersistentState,
  weaponId: WeaponId = state.currentWeaponId,
): number {
  const weapon = getWeapon(weaponId);
  const progress = getWeaponProgress(state, weaponId);
  const unlockBonus = Math.max(0, progress.unlockedMoveIds.length - 1) * 2;

  return 1 + getTotalWeaponUsage(progress, weapon) + unlockBonus;
}

function getWeaponTechniqueLine(weapon: WeaponDefinition, progress: WeaponProgress): string {
  for (let index = progress.unlockedMoveIds.length - 1; index >= 0; index -= 1) {
    const moveId = progress.unlockedMoveIds[index];
    const lines = weapon.techniqueLines[moveId];

    if (lines && lines.length > 0) {
      return clampLine(lines, progress.moveUsage[moveId] ?? 0);
    }
  }

  return "Something in your hands is a little less accidental now.";
}

function getWeaponHoldLine(
  state: PersistentState,
  weaponId: WeaponId = state.currentWeaponId,
): string {
  const stage = Math.min(getWeaponLevel(state, weaponId) - 1, WEAPON_HOLD_WORDS.length - 1);
  return `It sits ${WEAPON_HOLD_WORDS[stage]} in your hand.`;
}

function getWeaponAwakeningText(
  state: PersistentState,
  wokeAgain: boolean,
): AwakeningText {
  const weapon = getCurrentWeapon(state);
  const progress = getWeaponProgress(state);
  const stage = Math.min(getWeaponLevel(state) - 1, weapon.awakeningLines.length - 1);

  if (weapon.id === "sword") {
    const wakingAgainLines = [
      "You wake again.",
      "You wake again a breath faster.",
      "You wake again with less distance between you and the dark.",
      "You wake again before the panic fully takes you.",
      "You wake again with a little more of yourself intact.",
      "You wake again with the last lesson still clinging to you.",
      "You wake again already searching for the hilt.",
      "You wake again with your hands remembering before your thoughts do.",
      "You wake again and the room makes sense one instant sooner.",
      "You wake again with practiced fear.",
      "You wake again with the first shape of readiness in you.",
      "You wake again carrying a little technique with the terror.",
      "You wake again almost in fighting posture.",
      "You wake again with old motions waiting under your skin.",
      "You wake again ready enough to hate how normal that feels.",
      "You wake again with the sword already halfway known to you.",
    ];
    const reflexLine = clampLine(weapon.reflexLines, stage);

    return {
      awakeningLine: wokeAgain
        ? clampLine(wakingAgainLines, stage)
        : clampLine(weapon.awakeningLines, stage),
      weaponLine: `You are holding a sword. ${getWeaponHoldLine(state)}`,
      techniqueLine: getWeaponTechniqueLine(weapon, progress),
      logLine: wokeAgain
        ? `The dark gives you back the sword. ${reflexLine}`
        : `Your hand finds the sword before your mind does. ${reflexLine}`,
    };
  }

  const weaponName = weapon.name.toLowerCase();

  return {
    awakeningLine: wokeAgain ? "You wake again." : "You wake up.",
    weaponLine: `You are holding a ${weaponName}. ${getWeaponHoldLine(state)}`,
    techniqueLine: getWeaponTechniqueLine(weapon, progress),
    logLine: wokeAgain
      ? `The dark gives you back the ${weaponName}.`
      : `Your hand finds the ${weaponName} before your mind does.`,
  };
}

function createInitialRun(
  persistentState: PersistentState,
  awakeningNumber: number,
  wokeAgain: boolean,
): RunState {
  const awakeningText = getWeaponAwakeningText(persistentState, wokeAgain);

  return {
    maxHp: PLAYER_MAX_HP,
    hp: PLAYER_MAX_HP,
    encounterNumber: 0,
    awakeningNumber,
    phase: "intro",
    sceneLines: [
      awakeningText.awakeningLine,
      "Cold stone under you.",
      "Something is in front of you.",
      awakeningText.weaponLine,
      awakeningText.techniqueLine,
    ],
    sceneLineIndex: 0,
    log: [
      {
        text: awakeningText.logLine,
        tone: "neutral",
      },
    ],
    enemy: null,
    discoveryWeaponId: null,
    experimentalOption: null,
    experimentationReadiness: 0,
    turnsWithoutExperiment: 0,
    recentCatastropheTurns: 0,
    pendingRecovery: 0,
  };
}

function getMoveAccuracy(move: MoveDefinition, usageCount: number): number {
  return clamp(
    move.accuracy +
      Math.min(move.maxAccuracyBonus, usageCount * move.accuracyPerUse),
    0.15,
    0.96,
  );
}

function getMoveSelfRisk(move: MoveDefinition, usageCount: number): number {
  return clamp(
    move.selfRisk - usageCount * move.selfRiskReductionPerUse,
    0,
    move.selfRisk,
  );
}

function createAppMarkup(): string {
  return `
    <section class="stage">
      <div class="scene" id="scene"></div>
      <section class="hud">
        <section class="vitals" id="vitals"></section>
        <section class="log" aria-live="polite">
          <div class="log__entries" id="log"></div>
        </section>
        <section class="actions">
          <div class="actions__grid" id="actions"></div>
        </section>
      </section>
    </section>
  `;
}

function isWeaponMastered(state: PersistentState, weaponId: WeaponId): boolean {
  const weapon = getWeapon(weaponId);
  const progress = getWeaponProgress(state, weaponId);
  return progress.unlockedMoveIds.length === weapon.progression.length;
}

function getDiscoverableWeaponId(
  state: PersistentState,
  runState: RunState,
): WeaponId | null {
  for (let index = 1; index < weaponOrder.length; index += 1) {
    const weaponId = weaponOrder[index];

    if (state.discoveredWeaponIds.includes(weaponId)) {
      continue;
    }

    const previousWeaponId = weaponOrder[index - 1];
    const discovery = getWeapon(weaponId).discovery;

    if (
      discovery &&
      isWeaponMastered(state, previousWeaponId) &&
      runState.encounterNumber >= discovery.minimumEncounter &&
      runState.awakeningNumber >= discovery.minimumAwakening
    ) {
      return weaponId;
    }

    return null;
  }

  return null;
}

export function createApp(): HTMLElement {
  const shell = document.createElement("main");
  shell.className = "game-shell";
  shell.innerHTML = createAppMarkup();

  const sceneEl = shell.querySelector<HTMLElement>("#scene");
  const vitalsEl = shell.querySelector<HTMLElement>("#vitals");
  const logEl = shell.querySelector<HTMLElement>("#log");
  const actionsEl = shell.querySelector<HTMLElement>("#actions");

  if (!sceneEl || !vitalsEl || !logEl || !actionsEl) {
    throw new Error("Game UI failed to initialize.");
  }

  const sceneRoot = sceneEl;
  const vitalsRoot = vitalsEl;
  const logRoot = logEl;
  const actionsRoot = actionsEl;

  const persistentState = loadPersistentState();
  let runState = createInitialRun(persistentState, 1, false);
  let shakeTimeout = 0;
  let enemyTurnTimeout = 0;
  let turnLocked = false;

  function save(): void {
    savePersistentState(persistentState);
  }

  function triggerShake(): void {
    window.clearTimeout(shakeTimeout);
    shell.classList.remove("is-shaking");
    void shell.offsetWidth;
    shell.classList.add("is-shaking");
    shakeTimeout = window.setTimeout(() => {
      shell.classList.remove("is-shaking");
    }, 220);
  }

  function appendLog(...entries: LogEntry[]): void {
    for (const entry of entries) {
      if (!entry.text) {
        continue;
      }

      runState.log.push(entry);
    }

    if (runState.log.length > MAX_LOG_LINES) {
      runState.log = runState.log.slice(-MAX_LOG_LINES);
    }
  }

  function createLogEntry(text: string, tone: LogTone = "neutral"): LogEntry {
    return { text, tone };
  }

  function rememberMoveUse(moveId: MoveId): number {
    const progress = getWeaponProgress(persistentState);
    const nextCount = (progress.moveUsage[moveId] ?? 0) + 1;
    progress.moveUsage[moveId] = nextCount;
    save();
    return nextCount;
  }

  function unlockMove(moveId: MoveId): void {
    const progress = getWeaponProgress(persistentState);

    if (progress.unlockedMoveIds.includes(moveId)) {
      return;
    }

    progress.unlockedMoveIds.push(moveId);
    progress.unlockedMoveIds = getCurrentWeapon(persistentState).progression.filter(
      (candidate) => progress.unlockedMoveIds.includes(candidate),
    );
    save();
  }

  function discoverWeapon(weaponId: WeaponId): void {
    if (!persistentState.discoveredWeaponIds.includes(weaponId)) {
      persistentState.discoveredWeaponIds.push(weaponId);
      persistentState.discoveredWeaponIds = weaponOrder.filter((candidate) =>
        persistentState.discoveredWeaponIds.includes(candidate),
      );
    }

    persistentState.currentWeaponId = weaponId;
    save();
  }

  function computeExperimentalOpportunity(): ExperimentalOption | null {
    const nextMoveId = getNextMoveId(persistentState);

    if (!nextMoveId) {
      return null;
    }

    const weapon = getCurrentWeapon(persistentState);
    const experiment = weapon.experiments[nextMoveId];

    if (!experiment) {
      return null;
    }

    const progress = getWeaponProgress(persistentState);
    const totalUsage = progress.unlockedMoveIds.reduce(
      (sum, moveId) => sum + (progress.moveUsage[moveId] ?? 0),
      0,
    );
    const chance = clamp(
      0.16 +
        runState.experimentationReadiness * 0.1 +
        Math.min(0.08, totalUsage * 0.01) -
        (runState.recentCatastropheTurns > 0 ? 0.08 : 0),
      0,
      0.42,
    );

    if (Math.random() > chance) {
      return null;
    }

    return {
      label: pickRandom(experiment.labels),
      nextMoveId,
    };
  }

  function startEncounter(): void {
    runState.encounterNumber += 1;
    runState.enemy = createEnemy(runState.encounterNumber);
    runState.phase = "combat";
    runState.pendingRecovery = 0;
    runState.discoveryWeaponId = null;
    runState.sceneLines = [runState.enemy.introLine];
    runState.sceneLineIndex = 0;
    runState.turnsWithoutExperiment = 0;
    runState.experimentalOption = computeExperimentalOpportunity();
    appendLog(createLogEntry(runState.enemy.introLine));
    render();
  }

  function handleKnownMove(moveId: MoveId): void {
    if (!runState.enemy) {
      return;
    }

    const weapon = getCurrentWeapon(persistentState);
    const move = weapon.moves[moveId];
    const usageCount = rememberMoveUse(moveId);
    const accuracy = getMoveAccuracy(move, usageCount - 1);
    const selfRisk = getMoveSelfRisk(move, usageCount - 1);

    runState.experimentationReadiness += 1;
    runState.experimentalOption = null;

    if (Math.random() <= accuracy) {
      const damage = randomInt(move.damage[0], move.damage[1]);
      runState.enemy.hp = Math.max(0, runState.enemy.hp - damage);
      appendLog(
        createLogEntry(
          `${pickRandom(move.hitTexts)} ${damage} damage.`,
          "enemy-hit",
        ),
      );

      if (damage >= 4) {
        triggerShake();
      }
    } else {
      appendLog(createLogEntry(pickRandom(move.missTexts)));
    }

    if (runState.enemy.hp > 0 && Math.random() <= selfRisk) {
      const selfDamage = randomInt(move.selfDamage[0], move.selfDamage[1]);
      runState.hp = Math.max(0, runState.hp - selfDamage);
      appendLog(
        createLogEntry(
          `${pickRandom(move.selfTexts)} ${selfDamage} damage to you.`,
          "self-hit",
        ),
      );
    }

    finishTurn();
  }

  function handleExperiment(): void {
    const option = runState.experimentalOption;
    const enemy = runState.enemy;

    if (!option || !enemy) {
      return;
    }

    const weapon = getCurrentWeapon(persistentState);
    const progress = getWeaponProgress(persistentState);
    const experiment = weapon.experiments[option.nextMoveId];

    if (!experiment) {
      return;
    }

    const anchorMoveId =
      progress.unlockedMoveIds[progress.unlockedMoveIds.length - 1];
    const anchorUsage = progress.moveUsage[anchorMoveId] ?? 0;
    const successChance = clamp(0.28 + anchorUsage * 0.04, 0.28, 0.58);
    const catastropheChance = clamp(0.24 - anchorUsage * 0.015, 0.12, 0.24);
    const roll = Math.random();

    runState.experimentalOption = null;
    runState.experimentationReadiness = 0;
    runState.turnsWithoutExperiment = 0;

    if (roll <= successChance) {
      const damage = randomInt(
        experiment.successDamage[0],
        experiment.successDamage[1],
      );
      enemy.hp = Math.max(0, enemy.hp - damage);
      unlockMove(option.nextMoveId);
      appendLog(
        createLogEntry(
          `${pickRandom(experiment.successTexts)} ${damage} damage. You learn ${weapon.moves[option.nextMoveId].name}.`,
          "enemy-hit",
        ),
      );
      triggerShake();
      runState.recentCatastropheTurns = 0;
      finishTurn();
      return;
    }

    if (roll >= 1 - catastropheChance) {
      const selfDamage = randomInt(
        experiment.catastropheDamage[0],
        experiment.catastropheDamage[1],
      );
      runState.hp = Math.max(0, runState.hp - selfDamage);
      runState.recentCatastropheTurns = 2;
      appendLog(
        createLogEntry(
          `${pickRandom(experiment.catastropheTexts)} ${selfDamage} damage to you.`,
          "self-hit",
        ),
      );
      triggerShake();
      finishTurn();
      return;
    }

    appendLog(createLogEntry(pickRandom(experiment.failureTexts)));
    runState.recentCatastropheTurns = 0;
    finishTurn();
  }

  function handleEnemyTurn(): void {
    const enemy = runState.enemy;

    if (!enemy || enemy.hp <= 0 || runState.hp <= 0) {
      return;
    }

    if (Math.random() <= enemy.accuracy) {
      const damage = randomInt(enemy.damage[0], enemy.damage[1]);
      runState.hp = Math.max(0, runState.hp - damage);
      appendLog(
        createLogEntry(
          `${pickRandom(enemy.template.hitTexts)} ${damage} damage.`,
          "self-hit",
        ),
      );

      if (damage >= 3) {
        triggerShake();
      }
    } else {
      appendLog(createLogEntry(pickRandom(enemy.template.missTexts)));
    }
  }

  function resolveVictory(): void {
    if (!runState.enemy) {
      return;
    }

    const recovery = Math.min(2, runState.maxHp - runState.hp);
    const deathText = pickRandom(runState.enemy.template.deathTexts);
    const discoveryWeaponId = getDiscoverableWeaponId(persistentState, runState);

    runState.enemy = null;
    runState.pendingRecovery = recovery;
    runState.hp += recovery;
    runState.experimentalOption = null;
    runState.discoveryWeaponId = discoveryWeaponId;

    appendLog(
      createLogEntry(deathText),
      createLogEntry(
        recovery > 0
          ? `You stand still until the shaking eases. Recover ${recovery} HP.`
          : "You stand still and listen for the next thing.",
      ),
    );

    if (discoveryWeaponId) {
      const discovery = getWeapon(discoveryWeaponId).discovery;

      if (!discovery) {
        return;
      }

      runState.phase = "discovery";
      runState.sceneLines = discovery.sceneLines;
      runState.sceneLineIndex = 0;
      appendLog(createLogEntry(discovery.discoveryLogLine));
      return;
    }

    runState.phase = "between";
    runState.sceneLines = ["The breathing stops."];
    runState.sceneLineIndex = 0;
  }

  function handleWeaponDiscovery(): void {
    const weaponId = runState.discoveryWeaponId;

    if (!weaponId) {
      return;
    }

    const discovery = getWeapon(weaponId).discovery;

    if (!discovery) {
      return;
    }

    discoverWeapon(weaponId);
    runState.discoveryWeaponId = null;
    runState.phase = "between";
    runState.sceneLines = discovery.equipSceneLines;
    runState.sceneLineIndex = 0;
    appendLog(createLogEntry(discovery.equipLogLine));
    render();
  }

  function resolveDeath(): void {
    runState.phase = "death";
    runState.enemy = null;
    runState.discoveryWeaponId = null;
    runState.experimentalOption = null;
    runState.pendingRecovery = 0;
    runState.sceneLines = ["You die."];
    runState.sceneLineIndex = 0;
    appendLog(createLogEntry("You die."));
  }

  function resolveCombatState(): boolean {
    if (runState.hp <= 0) {
      resolveDeath();
      render();
      return true;
    }

    if (runState.enemy && runState.enemy.hp <= 0) {
      resolveVictory();
      render();
      return true;
    }

    return false;
  }

  function settleTurnAfterEnemyAction(): void {
    if (resolveCombatState()) {
      return;
    }
    runState.recentCatastropheTurns = Math.max(
      0,
      runState.recentCatastropheTurns - 1,
    );
    runState.experimentalOption = computeExperimentalOpportunity();

    if (runState.experimentalOption) {
      runState.turnsWithoutExperiment = 0;
    } else {
      runState.turnsWithoutExperiment += 1;
    }

    render();
  }

  function finishTurn(): void {
    window.clearTimeout(enemyTurnTimeout);

    if (resolveCombatState()) {
      turnLocked = false;
      return;
    }

    turnLocked = true;
    render();

    enemyTurnTimeout = window.setTimeout(() => {
      turnLocked = false;
      handleEnemyTurn();
      settleTurnAfterEnemyAction();
    }, ENEMY_TURN_DELAY_MS);
  }

  function continueFlow(): void {
    if (runState.phase === "intro" || runState.phase === "discovery") {
      if (runState.sceneLineIndex < runState.sceneLines.length - 1) {
        runState.sceneLineIndex += 1;
        render();
        return;
      }

      if (runState.phase === "intro") {
        startEncounter();
      }
      return;
    }

    if (runState.phase === "between") {
      if (runState.sceneLineIndex < runState.sceneLines.length - 1) {
        runState.sceneLineIndex += 1;
        render();
        return;
      }

      startEncounter();
      return;
    }

    if (runState.phase === "death") {
      runState = createInitialRun(
        persistentState,
        runState.awakeningNumber + 1,
        true,
      );
      render();
    }
  }

  function renderVitalsMarkup(): string {
    const enemy = runState.enemy;
    const playerPercent = (runState.hp / runState.maxHp) * 100;
    const enemyPercent = enemy ? (enemy.hp / enemy.maxHp) * 100 : 0;
    const enemyLabel = enemy ? `${enemy.hp} / ${enemy.maxHp}` : "--";
    const enemyName = enemy ? enemy.name : "Nothing";

    return `
      <div class="vital">
        <div class="vital__row">
          <span>Player HP</span>
          <strong>${runState.hp} / ${runState.maxHp}</strong>
        </div>
        <div class="bar">
          <div class="bar__fill bar__fill--player" style="width: ${playerPercent}%"></div>
        </div>
      </div>
      <div class="vital ${enemy ? "" : "vital--dim"}">
        <div class="vital__row">
          <span>${escapeHtml(enemyName)} HP</span>
          <strong>${enemyLabel}</strong>
        </div>
        <div class="bar">
          <div class="bar__fill bar__fill--enemy" style="width: ${enemyPercent}%"></div>
        </div>
      </div>
    `;
  }

  function getActionDescriptors(): ActionDescriptor[] {
    if (runState.phase === "combat") {
      const actions: ActionDescriptor[] = getUnlockedMoves(persistentState).map(
        (move) => {
          return {
            id: `move:${move.id}`,
            label: move.name,
            kind: "move",
          };
        },
      );

      if (runState.experimentalOption) {
        actions.push({
          id: "experiment",
          label: runState.experimentalOption.label,
          kind: "experiment",
        });
      }

      return actions;
    }

    if (
      runState.phase === "discovery" &&
      runState.discoveryWeaponId &&
      runState.sceneLineIndex === runState.sceneLines.length - 1
    ) {
      const discovery = getWeapon(runState.discoveryWeaponId).discovery;

      if (!discovery) {
        return [];
      }

      return [
        {
          id: "discover",
          label: discovery.actionLabel,
          kind: "discover",
        },
      ];
    }

    return [];
  }

  function renderSceneMarkup(): string {
    const line =
      runState.phase === "combat"
        ? runState.sceneLines[0]
        : runState.sceneLines[runState.sceneLineIndex];
    const classes = ["scene__line"];

    if (runState.phase === "intro" || runState.phase === "discovery") {
      classes.push("scene__line--prompt");
    }

    return `<p class="${classes.join(" ")}">${escapeHtml(line)}</p>`;
  }

  function renderLogMarkup(): string {
    return runState.log
      .slice(-MAX_LOG_LINES)
      .map((entry, index, entries) => {
        const classes = ["log__line", `log__line--${entry.tone}`];

        if (index < entries.length - 1) {
          classes.push("log__line--previous");
        }

        return `<p class="${classes.join(" ")}">${escapeHtml(entry.text)}</p>`;
      })
      .join("");
  }

  function renderActionsMarkup(actions: ActionDescriptor[]): string {
    return actions
      .map((action) => {
        return `
          <button class="action action--${action.kind}" type="button" data-action="${escapeHtml(action.id)}"${turnLocked ? " disabled" : ""}>
            <span>${escapeHtml(action.label)}</span>
          </button>
        `;
      })
      .join("");
  }

  function render(): void {
    const actions = getActionDescriptors();
    const showLog = runState.phase === "combat";
    const showActions = actions.length > 0;
    const showClickableScene =
      runState.phase !== "combat" &&
      !(runState.phase === "discovery" && showActions) &&
      !(runState.phase === "death");

    shell.dataset.phase = runState.phase;
    sceneRoot.innerHTML = renderSceneMarkup();
    sceneRoot.classList.toggle("scene--intro", runState.phase === "intro");
    sceneRoot.classList.toggle("scene--clickable", showClickableScene);
    sceneRoot.classList.toggle("scene--combat", runState.phase === "combat");
    vitalsRoot.innerHTML = renderVitalsMarkup();
    vitalsRoot.classList.toggle("vitals--hidden", runState.phase !== "combat");
    logRoot.innerHTML = renderLogMarkup();
    logRoot.parentElement?.classList.toggle("log--hidden", !showLog);
    actionsRoot.innerHTML = renderActionsMarkup(actions);
    actionsRoot.parentElement?.classList.toggle("actions--hidden", !showActions);
  }

  shell.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-action]",
    );

    if (target) {
      if (turnLocked) {
        return;
      }

      const actionId = target.dataset.action;

      if (!actionId) {
        return;
      }

      if (actionId === "discover") {
        handleWeaponDiscovery();
        return;
      }

      if (runState.phase !== "combat") {
        return;
      }

      if (actionId === "experiment") {
        handleExperiment();
        return;
      }

      if (actionId.startsWith("move:")) {
        const moveId = actionId.slice(5) as MoveId;

        if (getCurrentWeapon(persistentState).progression.includes(moveId)) {
          handleKnownMove(moveId);
        }
      }

      return;
    }

    if (turnLocked || runState.phase === "combat") {
      return;
    }

    continueFlow();
  });

  render();
  return shell;
}
