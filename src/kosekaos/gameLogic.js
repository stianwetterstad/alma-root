function classifyToast(text) {
  if (/Premie:|Klistremerke:|Trofe:/i.test(text)) return "reward";
  if (/Oppdrag fullfort:|Daglig fullfort:/i.test(text)) return "mission";
  return "info";
}

function hasMeaningfulProgress(snapshotState) {
  const s = snapshotState || {};
  const roomPlacements = s.roomPlacements || {};
  const avatarPositions = s.roomAvatarPositions || {};

  const placementCount = Object.values(roomPlacements).reduce((acc, entries) => {
    if (!Array.isArray(entries)) return acc;
    return acc + entries.length;
  }, 0);

  const avatarRoomCount = Object.keys(avatarPositions).length;
  const avatar = s.avatar || {};

  const hasCustomAvatar = !!(
    (typeof avatar.name === "string" && avatar.name.trim()) ||
    avatar.makeupDataUrl ||
    avatar.clothing ||
    avatar.accessories ||
    (avatar.hairStyle && avatar.hairStyle !== "long") ||
    (avatar.hairColor && avatar.hairColor !== "#6e3f2b") ||
    (avatar.skinTone && avatar.skinTone !== "#ffd7c2") ||
    (avatar.gender && avatar.gender !== "girl")
  );

  return !!(
    hasCustomAvatar ||
    placementCount > 0 ||
    avatarRoomCount > 0 ||
    (s.score || 0) > 0 ||
    (s.stars || 0) > 0 ||
    (Array.isArray(s.completedMissionIds) && s.completedMissionIds.length > 0) ||
    (Array.isArray(s.unlockedRewardIds) && s.unlockedRewardIds.length > 0) ||
    (Array.isArray(s.unlockedStickerIds) && s.unlockedStickerIds.length > 0)
  );
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return function next() {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pickRandomIndex(length, randomFn = Math.random) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("length must be a positive integer");
  }
  return Math.floor(randomFn() * length);
}

function computeElapsedMs(startedAtMs, nowMs, carriedMs) {
  const base = Number(carriedMs || 0);
  if (typeof startedAtMs !== "number" || typeof nowMs !== "number") {
    return base;
  }
  return Math.max(base, nowMs - startedAtMs + base);
}

module.exports = {
  classifyToast,
  hasMeaningfulProgress,
  createSeededRandom,
  pickRandomIndex,
  computeElapsedMs
};
