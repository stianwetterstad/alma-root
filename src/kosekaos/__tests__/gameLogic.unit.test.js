const {
  classifyToast,
  hasMeaningfulProgress,
  createSeededRandom,
  pickRandomIndex,
  computeElapsedMs
} = require("../gameLogic");

describe("kosekaos pure game logic", () => {
  test("classifyToast categorizes known messages", () => {
    expect(classifyToast("Premie: 🎄 Mini-juletre")).toBe("reward");
    expect(classifyToast("Daglig fullfort: Fliseglans")).toBe("mission");
    expect(classifyToast("Hei verden")).toBe("info");
  });

  test("hasMeaningfulProgress returns false for default-empty state", () => {
    const result = hasMeaningfulProgress({
      avatar: {
        name: "",
        gender: "girl",
        skinTone: "#ffd7c2",
        hairStyle: "long",
        hairColor: "#6e3f2b",
        makeupDataUrl: "",
        clothing: "",
        accessories: ""
      },
      roomPlacements: {},
      roomAvatarPositions: {},
      score: 0,
      stars: 0,
      completedMissionIds: [],
      unlockedRewardIds: [],
      unlockedStickerIds: []
    });

    expect(result).toBe(false);
  });

  test("hasMeaningfulProgress returns true when progress exists", () => {
    expect(
      hasMeaningfulProgress({
        avatar: {
          name: "Tester",
          gender: "girl"
        },
        roomPlacements: {},
        roomAvatarPositions: {},
        score: 0,
        stars: 0,
        completedMissionIds: [],
        unlockedRewardIds: [],
        unlockedStickerIds: []
      })
    ).toBe(true);

    expect(
      hasMeaningfulProgress({
        avatar: {},
        roomPlacements: { "a:room": [{ id: "sofa" }] },
        roomAvatarPositions: {},
        score: 0,
        stars: 0
      })
    ).toBe(true);
  });

  test("seeded random is deterministic", () => {
    const rngA = createSeededRandom(42);
    const rngB = createSeededRandom(42);

    const seqA = [rngA(), rngA(), rngA()];
    const seqB = [rngB(), rngB(), rngB()];

    expect(seqA).toEqual(seqB);
  });

  test("pickRandomIndex uses injected random function", () => {
    const fakeRandom = () => 0.9;
    expect(pickRandomIndex(10, fakeRandom)).toBe(9);
  });

  test("computeElapsedMs supports injected clock values", () => {
    expect(computeElapsedMs(1000, 1800, 0)).toBe(800);
    expect(computeElapsedMs(1000, 1800, 300)).toBe(1100);
  });
});
