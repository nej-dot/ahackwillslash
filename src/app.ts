type Phase = "intro" | "combat" | "between" | "death";
type WeaponId = "sword";
type MoveId = "flail" | "poke" | "slash";

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

interface WeaponDefinition {
  id: WeaponId;
  name: string;
  wakeLines: string[];
  progression: MoveId[];
  moves: Record<MoveId, MoveDefinition>;
  experiments: Partial<Record<MoveId, ExperimentDefinition>>;
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
  moveUsage: Record<MoveId, number>;
}

interface PersistentState {
  currentWeaponId: WeaponId;
  weapons: Record<WeaponId, WeaponProgress>;
}

interface ExperimentalOption {
  label: string;
  nextMoveId: MoveId;
}

interface RunState {
  maxHp: number;
  hp: number;
  encounterNumber: number;
  awakeningNumber: number;
  phase: Phase;
  sceneLines: string[];
  sceneLineIndex: number;
  log: string[];
  enemy: EnemyState | null;
  experimentalOption: ExperimentalOption | null;
  experimentationReadiness: number;
  turnsWithoutExperiment: number;
  recentCatastropheTurns: number;
  pendingRecovery: number;
}

interface ActionDescriptor {
  id: string;
  label: string;
  kind: "move" | "experiment" | "continue";
}

const STORAGE_KEY = "ahackwillslash.weapon-memory.v1";
const MAX_LOG_LINES = 8;
const PLAYER_MAX_HP = 12;

const swordDefinition: WeaponDefinition = {
  id: "sword",
  name: "Sword",
  wakeLines: ["You are holding a sword.", "It sits badly in your hand."],
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
};

const weaponDefinitions: Record<WeaponId, WeaponDefinition> = {
  sword: swordDefinition,
};

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

function createDefaultWeaponProgress(
  weapon: WeaponDefinition,
): WeaponProgress {
  return {
    unlockedMoveIds: [weapon.progression[0]],
    moveUsage: {
      flail: 0,
      poke: 0,
      slash: 0,
    },
  };
}

function createDefaultPersistentState(): PersistentState {
  return {
    currentWeaponId: "sword",
    weapons: {
      sword: createDefaultWeaponProgress(swordDefinition),
    },
  };
}

function sanitizePersistentState(raw: unknown): PersistentState {
  const fallback = createDefaultPersistentState();

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const parsed = raw as Partial<PersistentState>;
  const currentWeaponId =
    parsed.currentWeaponId === "sword" ? parsed.currentWeaponId : "sword";
  const swordRaw = parsed.weapons?.sword;
  const defaultSword = fallback.weapons.sword;
  const unlockedSet = new Set<MoveId>(defaultSword.unlockedMoveIds);

  if (swordRaw?.unlockedMoveIds) {
    for (const moveId of swordRaw.unlockedMoveIds) {
      if (moveId === "flail" || moveId === "poke" || moveId === "slash") {
        unlockedSet.add(moveId);
      }
    }
  }

  const progression = swordDefinition.progression.filter((moveId) =>
    unlockedSet.has(moveId),
  );
  const moveUsage = {
    flail:
      typeof swordRaw?.moveUsage?.flail === "number"
        ? Math.max(0, Math.floor(swordRaw.moveUsage.flail))
        : 0,
    poke:
      typeof swordRaw?.moveUsage?.poke === "number"
        ? Math.max(0, Math.floor(swordRaw.moveUsage.poke))
        : 0,
    slash:
      typeof swordRaw?.moveUsage?.slash === "number"
        ? Math.max(0, Math.floor(swordRaw.moveUsage.slash))
        : 0,
  };

  return {
    currentWeaponId,
    weapons: {
      sword: {
        unlockedMoveIds: progression.length > 0 ? progression : ["flail"],
        moveUsage,
      },
    },
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

function getCurrentWeapon(state: PersistentState): WeaponDefinition {
  return weaponDefinitions[state.currentWeaponId];
}

function getWeaponProgress(state: PersistentState): WeaponProgress {
  return state.weapons[state.currentWeaponId];
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

function createInitialRun(
  persistentState: PersistentState,
  awakeningNumber: number,
  wokeAgain: boolean,
): RunState {
  const weapon = getCurrentWeapon(persistentState);

  return {
    maxHp: PLAYER_MAX_HP,
    hp: PLAYER_MAX_HP,
    encounterNumber: 0,
    awakeningNumber,
    phase: "intro",
    sceneLines: [
      wokeAgain ? "You wake again." : "You wake up.",
      "Cold stone under you.",
      "Something is in front of you.",
      ...weapon.wakeLines,
    ],
    sceneLineIndex: 0,
    log: [
      wokeAgain
        ? "The dark gives you back the sword."
        : "Your hand finds the sword before your mind does.",
    ],
    enemy: null,
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
    <section class="frame">
      <div class="scene" id="scene"></div>
      <section class="vitals" id="vitals"></section>
      <section class="log" aria-live="polite">
        <div class="log__entries" id="log"></div>
      </section>
      <section class="actions">
        <div class="actions__grid" id="actions"></div>
      </section>
    </section>
  `;
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
  let latestLogIndex = runState.log.length - 1;
  let shakeTimeout = 0;

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

  function appendLog(...entries: string[]): void {
    for (const entry of entries) {
      if (!entry) {
        continue;
      }

      runState.log.push(entry);
    }

    if (runState.log.length > MAX_LOG_LINES) {
      runState.log = runState.log.slice(-MAX_LOG_LINES);
    }

    latestLogIndex = runState.log.length - 1;
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

  function computeExperimentalOpportunity(): ExperimentalOption | null {
    if (runState.experimentalOption) {
      return runState.experimentalOption;
    }

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
      0.62,
    );
    const guaranteedWindow =
      runState.experimentationReadiness >= 2 || runState.turnsWithoutExperiment >= 3;

    if (!guaranteedWindow && Math.random() > chance) {
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
    runState.sceneLines = [runState.enemy.introLine];
    runState.sceneLineIndex = 0;
    runState.turnsWithoutExperiment = 0;
    runState.experimentalOption = computeExperimentalOpportunity();
    appendLog(runState.enemy.introLine);
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

    if (Math.random() <= accuracy) {
      const damage = randomInt(move.damage[0], move.damage[1]);
      runState.enemy.hp = Math.max(0, runState.enemy.hp - damage);
      appendLog(`${pickRandom(move.hitTexts)} ${damage} damage.`);

      if (damage >= 4) {
        triggerShake();
      }
    } else {
      appendLog(pickRandom(move.missTexts));
    }

    if (runState.enemy.hp > 0 && Math.random() <= selfRisk) {
      const selfDamage = randomInt(move.selfDamage[0], move.selfDamage[1]);
      runState.hp = Math.max(0, runState.hp - selfDamage);
      appendLog(`${pickRandom(move.selfTexts)} ${selfDamage} damage to you.`);
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
        `${pickRandom(experiment.successTexts)} ${damage} damage.`,
        `You have learned: ${weapon.moves[option.nextMoveId].name}.`,
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
        `${pickRandom(experiment.catastropheTexts)} ${selfDamage} damage to you.`,
      );
      triggerShake();
      finishTurn();
      return;
    }

    appendLog(pickRandom(experiment.failureTexts));
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
      appendLog(`${pickRandom(enemy.template.hitTexts)} ${damage} damage.`);

      if (damage >= 3) {
        triggerShake();
      }
    } else {
      appendLog(pickRandom(enemy.template.missTexts));
    }
  }

  function resolveVictory(): void {
    if (!runState.enemy) {
      return;
    }

    const recovery = Math.min(2, runState.maxHp - runState.hp);
    const deathText = pickRandom(runState.enemy.template.deathTexts);

    runState.phase = "between";
    runState.pendingRecovery = recovery;
    runState.hp += recovery;
    runState.sceneLines = ["The breathing stops."];
    runState.sceneLineIndex = 0;
    runState.experimentalOption = null;
    appendLog(
      deathText,
      recovery > 0
        ? `You stand still until the shaking eases. Recover ${recovery} HP.`
        : "You stand still and listen for the next thing.",
    );
  }

  function resolveDeath(): void {
    runState.phase = "death";
    runState.enemy = null;
    runState.experimentalOption = null;
    runState.pendingRecovery = 0;
    runState.sceneLines = ["You die."];
    runState.sceneLineIndex = 0;
    appendLog("You die.");
  }

  function finishTurn(): void {
    if (runState.hp <= 0) {
      resolveDeath();
      render();
      return;
    }

    if (runState.enemy && runState.enemy.hp <= 0) {
      resolveVictory();
      render();
      return;
    }

    handleEnemyTurn();

    if (runState.hp <= 0) {
      resolveDeath();
      render();
      return;
    }

    if (runState.enemy && runState.enemy.hp <= 0) {
      resolveVictory();
      render();
      return;
    }

    runState.recentCatastropheTurns = Math.max(
      0,
      runState.recentCatastropheTurns - 1,
    );
    const previousOffer = runState.experimentalOption;
    runState.experimentalOption = computeExperimentalOpportunity();

    if (runState.experimentalOption) {
      runState.turnsWithoutExperiment = 0;

      if (!previousOffer) {
        appendLog("The sword gives you another angle to try.");
      }
    } else {
      runState.turnsWithoutExperiment += 1;
    }

    render();
  }

  function continueFlow(): void {
    if (runState.phase === "intro") {
      if (runState.sceneLineIndex < runState.sceneLines.length - 1) {
        runState.sceneLineIndex += 1;
        render();
        return;
      }

      startEncounter();
      return;
    }

    if (runState.phase === "between") {
      startEncounter();
      return;
    }

    if (runState.phase === "death") {
      runState = createInitialRun(
        persistentState,
        runState.awakeningNumber + 1,
        true,
      );
      latestLogIndex = runState.log.length - 1;
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

    if (runState.phase === "death") {
      return [{ id: "continue", label: "Wake again", kind: "continue" }];
    }

    return [
      {
        id: "continue",
        label: runState.phase === "between" ? "Listen again" : "Face it",
        kind: "continue",
      },
    ];
  }

  function renderSceneMarkup(): string {
    const line =
      runState.phase === "intro"
        ? runState.sceneLines[runState.sceneLineIndex]
        : runState.sceneLines[0];
    const classes = ["scene__line"];

    if (runState.phase === "intro") {
      classes.push("scene__line--prompt");
    }

    return `<p class="${classes.join(" ")}">${escapeHtml(line)}</p>`;
  }

  function renderLogMarkup(): string {
    return runState.log
      .map((line, index) => {
        const classes = ["log__line"];

        if (index === latestLogIndex) {
          classes.push("log__line--fresh");
        }

        return `<p class="${classes.join(" ")}">${escapeHtml(line)}</p>`;
      })
      .join("");
  }

  function renderActionsMarkup(): string {
    return getActionDescriptors()
      .map((action) => {
        return `
          <button class="action action--${action.kind}" type="button" data-action="${escapeHtml(action.id)}">
            <span>${escapeHtml(action.label)}</span>
          </button>
        `;
      })
      .join("");
  }

  function render(): void {
    sceneRoot.innerHTML = renderSceneMarkup();
    sceneRoot.classList.toggle("scene--intro", runState.phase === "intro");
    sceneRoot.classList.toggle("scene--clickable", runState.phase === "intro");
    vitalsRoot.innerHTML = renderVitalsMarkup();
    vitalsRoot.classList.toggle("vitals--hidden", runState.phase === "intro");
    logRoot.innerHTML = renderLogMarkup();
    logRoot.parentElement?.classList.toggle("log--hidden", runState.phase === "intro");
    actionsRoot.innerHTML = renderActionsMarkup();
    actionsRoot.parentElement?.classList.toggle(
      "actions--hidden",
      runState.phase === "intro",
    );
  }

  sceneRoot.addEventListener("click", () => {
    if (runState.phase === "intro") {
      continueFlow();
    }
  });

  shell.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-action]",
    );

    if (!target) {
      return;
    }

    const actionId = target.dataset.action;

    if (!actionId) {
      return;
    }

    if (actionId === "continue") {
      continueFlow();
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
      const moveId = actionId.slice(5);

      if (moveId === "flail" || moveId === "poke" || moveId === "slash") {
        handleKnownMove(moveId);
      }
    }
  });

  render();
  return shell;
}
