(function (global) {
  "use strict";

  function createDebugLogger(gameId, enabled) {
    return function log(event, data) {
      if (!enabled) return;
      if (data === undefined) {
        console.log("[" + gameId + "] " + event);
        return;
      }
      console.log("[" + gameId + "] " + event, data);
    };
  }

  function createInputLock(options) {
    var gameId = options.gameId;
    var isLocked = options.isLocked;
    var debugEnabled = Boolean(options.debug);
    var overlayElement = options.overlayElement || null;
    var log = createDebugLogger(gameId, debugEnabled);

    function isOverlayVisible() {
      if (!overlayElement) return false;
      if (overlayElement.classList.contains("ui-hidden")) return false;
      return overlayElement.getAttribute("aria-hidden") !== "true";
    }

    function checkInvariant(reason, data, locked) {
      if (!debugEnabled) return locked;
      if (isOverlayVisible() && !locked) {
        console.warn("[" + gameId + "] invariant:overlay-visible-input-unlocked", {
          reason: reason,
          data: data || {}
        });
        return true;
      }
      return locked;
    }

    return {
      blocked: function blocked(reason, data) {
        var locked = Boolean(isLocked && isLocked());
        locked = checkInvariant(reason, data, locked);
        if (locked) {
          log("input:blocked:" + reason, data || {});
        }
        return locked;
      }
    };
  }

  function createPauseVisibilityController(options) {
    var gameId = options.gameId;
    var isPaused = options.isPaused;
    var setPaused = options.setPaused;
    var canPause = options.canPause || function () { return true; };
    var visibilityTarget = options.visibilityTarget || document;
    var pauseButton = options.pauseButton || null;
    var resumeButton = options.resumeButton || null;
    var autoPausedByHidden = false;
    var log = createDebugLogger(gameId, Boolean(options.debug));

    function pause(reason) {
      if (!canPause() || isPaused()) return false;
      setPaused(true);
      log("pause", { reason: reason || "manual" });
      return true;
    }

    function resume(reason) {
      if (isPaused()) {
        setPaused(false);
        log("resume", { reason: reason || "manual" });
        return true;
      }
      return false;
    }

    function toggle(reason) {
      if (isPaused()) return resume(reason || "toggle");
      return pause(reason || "toggle");
    }

    function onVisibilityChange() {
      if (visibilityTarget.hidden) {
        log("visibility:hidden", { paused: isPaused() });
        if (pause("visibility-hidden")) {
          autoPausedByHidden = true;
        }
        return;
      }

      log("visibility:visible", { paused: isPaused(), autoPausedByHidden: autoPausedByHidden });
      if (autoPausedByHidden) {
        autoPausedByHidden = false;
        resume("visibility-visible");
      }
    }

    visibilityTarget.addEventListener("visibilitychange", onVisibilityChange);

    if (pauseButton) {
      pauseButton.addEventListener("click", function () {
        toggle("pause-button");
      });
    }

    if (resumeButton) {
      resumeButton.addEventListener("click", function () {
        resume("resume-button");
      });
    }

    return {
      pause: pause,
      resume: resume,
      toggle: toggle,
      isAutoPausedByHidden: function () { return autoPausedByHidden; }
    };
  }

  global.AlmaGameUtils = global.AlmaGameUtils || {};
  global.AlmaGameUtils.createDebugLogger = createDebugLogger;
  global.AlmaGameUtils.createInputLock = createInputLock;
  global.AlmaGameUtils.createPauseVisibilityController = createPauseVisibilityController;
})(window);
