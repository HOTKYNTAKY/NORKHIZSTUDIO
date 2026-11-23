/*
 * NEON TIDE — mobile tuning layer.
 *
 * The game ships only as a minified web build (assets/index-*.js), so the
 * behaviour that should differ on a phone is applied here, at runtime, from a
 * readable file instead of by editing the minified bundle.
 * android/tools/apply-patches.py copies this file into assets/__nt-patches.js
 * and appends a call to it at the end of the bundle, right after the engine is
 * created and boot() has run.
 *
 * What it does
 *   1. No scripted opening. The web build defaults to a developer checkpoint
 *      ("low_tide" / "escape"), which drops a brand-new player straight into the
 *      middle of the robbery mission: police units, radio dispatch, mission
 *      cash and a want level. That default is switched off here, so a new game
 *      begins as free roam.
 *   2. New game: free roam starts on the sand beside the coast road, in the
 *      morning. (The patch only repositions a *new* game, never "Continue".)
 *   3. The developer console and the debug overlay are disabled: no key, tap or
 *      command can open them or run anything.
 *
 * Everything is defensive — a hook that cannot find its target logs a warning
 * and leaves the game's own behaviour untouched.
 */
(function neonTideMobileTuning() {
  "use strict";

  const LOG = "[neon-tide/mobile]";

  const TUNING = {
    // Walkable sand on the beach south of the safehouse: coast road ~35 m
    // inland, sea to the east, the beach snack bar a short walk north.
    start: { x: 480.1, y: 0.4, z: -483.6, yaw: 1.2 },
    // 10:30 — bright morning.
    startHour: 10.5,
    keys: {
      devStart: "neon.devStart", // read by the build; "off" = no dev checkpoint
      firstRun: "neontide.mobile.firstrun.v1",
    },
  };

  const log = (...a) => console.log(LOG, ...a);
  const warn = (...a) => console.warn(LOG, ...a);

  /* ------------------------------------------------------------------ *
   * 1. No developer checkpoint on a new game
   * ------------------------------------------------------------------ */

  // The build reads this when "New Game" is tapped. Set it during page load,
  // so even the very first game is clean.
  try {
    if (localStorage.getItem(TUNING.keys.devStart) !== "off") {
      localStorage.setItem(TUNING.keys.devStart, "off");
      log("developer checkpoint disabled");
    }
  } catch (e) {
    warn("could not disable the developer checkpoint", e && e.message);
  }

  const firstRun = (() => {
    try {
      return localStorage.getItem(TUNING.keys.firstRun) !== "1";
    } catch (e) {
      return true;
    }
  })();

  /* ------------------------------------------------------------------ *
   * 2. Console + debug overlay unreachable
   * ------------------------------------------------------------------ */

  function harden(engine) {
    let done = 0;

    // Command execution. Every system (police, swat, weather, missions, ...)
    // registers its commands on this object and is run through execute().
    const con = engine.console;
    if (con && !con.__ntHardened) {
      con.__ntHardened = true;
      con.execute = function () {
        return "";
      };
      done++;
    }

    // Open/close paths: the console is toggled from the input system, the
    // overlay with a bus event. Silencing the bus also covers a hardware
    // keyboard's backquote / F3.
    const bus = engine.bus;
    if (bus && !bus.__ntHardened) {
      bus.__ntHardened = true;
      const emit = bus.emit.bind(bus);
      bus.emit = function (name, payload) {
        if (name === "debug:togglePanel" || name === "debug:toggleConsole") return;
        if (name === "console:line" || name === "console:clear") return;
        return emit(name, payload);
      };
      done++;
    }

    const sys = engine.inputSystem;
    if (sys && !sys.__ntHardened) {
      sys.__ntHardened = true;
      sys.setConsoleOpen = function () {};
      done++;
    }

    return done;
  }

  /* ------------------------------------------------------------------ *
   * 3. Clean slate: no cops, no want level, no radio traffic
   * ------------------------------------------------------------------ */

  function clearHeat(engine) {
    const wanted = engine.wanted;
    if (wanted && typeof wanted.clear === "function") wanted.clear();
    for (const key of ["police", "swat", "helis", "heli"]) {
      const s = engine[key];
      if (s && typeof s.clear === "function") {
        try {
          s.clear();
        } catch (e) {
          /* service not ready yet; retried on the next tick */
        }
      }
    }
    return !engine.wanted || engine.wanted.stars === 0;
  }

  /* ------------------------------------------------------------------ *
   * 4. Sky: morning
   * ------------------------------------------------------------------ */

  function setHours(engine, hours) {
    const atm = engine.atmosphere;
    if (!atm || !atm.clock) return false;
    try {
      if (typeof atm.setHours === "function") atm.setHours(hours);
      else atm.clock.set(hours);
      atm.clock.running = true;
      return true;
    } catch (e) {
      warn("clock", e && e.message);
      return false;
    }
  }

  /* ------------------------------------------------------------------ *
   * 5. Spawn on the beach
   * ------------------------------------------------------------------ */

  function spawnAtBeach(engine) {
    const player = engine.player;
    if (!player) return false;
    const s = TUNING.start;
    const who = player.active;
    if (!who || typeof who.teleport !== "function") return false;
    try {
      who.teleport(s.x, s.y, s.z, s.yaw);
      player.cameraHandoff = false;
      if (typeof player.switchIn === "function") player.switchIn(who);
      log("beach spawn", s);
      return true;
    } catch (e) {
      warn("beach spawn", e && e.message);
      return false;
    }
  }

  /* ------------------------------------------------------------------ *
   * Boot hook
   * ------------------------------------------------------------------ */

  function start(engine) {
    if (!engine || engine.__ntStarted) return;
    engine.__ntStarted = true;

    // Close the console before the first frame, not on the first tick.
    harden(engine);

    // A new game is requested on this launch when the build has no save to
    // continue from, or when the player taps "New Game" later.
    let pendingNewGame = firstRun;
    let gameSince = 0;
    const flow = engine.flow;
    if (flow && typeof flow.newGame === "function" && !flow.__ntWrapped) {
      flow.__ntWrapped = true;
      const original = flow.newGame;
      flow.newGame = function () {
        pendingNewGame = true;
        gameSince = 0;
        return original.apply(this, arguments);
      };
    }

    const tick = setInterval(() => {
      try {
        harden(engine);
        if (!flow || flow.phase !== "game") return;

        const now = Date.now();
        if (!gameSince) gameSince = now;
        const age = now - gameSince;

        if (pendingNewGame && spawnAtBeach(engine)) pendingNewGame = false;

        // The menu hands the sky back to the game a moment after the world
        // loads, so hold the morning for the first seconds of play.
        if (age < 8000) setHours(engine, TUNING.startHour);

        // A developer checkpoint would leave a wanted level and live units
        // behind; clear them for the first seconds of a fresh game.
        if (age < 10000) clearHeat(engine);

        if (!pendingNewGame && age > 9000 && age < 12000) {
          try {
            localStorage.setItem(TUNING.keys.firstRun, "1");
          } catch (e) {
            /* ignore */
          }
          if (harden(engine) >= 3) {
            clearInterval(tick);
            log("active", { hour: TUNING.startHour });
          }
        }
      } catch (e) {
        warn("tick", e && e.message);
      }
    }, 250);

    log("armed", { firstRun, hour: TUNING.startHour });
  }

  window.__neonTideBundleReady = function (engine) {
    try {
      start(engine);
    } catch (e) {
      warn("startup", e && e.message);
    }
  };

  if (window.__neonTideEngine) window.__neonTideBundleReady(window.__neonTideEngine);
})();
