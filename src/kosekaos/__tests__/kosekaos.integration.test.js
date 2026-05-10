const fs = require("node:fs");
const path = require("node:path");
const { fireEvent, getByRole, getByTestId } = require("@testing-library/dom");

function bootKosekaos() {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: function getContext() {
      return {
        lineCap: "round",
        lineJoin: "round",
        globalCompositeOperation: "source-over",
        lineWidth: 1,
        strokeStyle: "#000",
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        clearRect: () => {},
        drawImage: () => {}
      };
    }
  });

  Object.defineProperty(HTMLCanvasElement.prototype, "toDataURL", {
    configurable: true,
    value: function toDataURL() {
      return "data:image/png;base64,";
    }
  });

  const htmlPath = path.resolve(process.cwd(), "spill/kosekaos/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Could not find inline script in kosekaos index.html");
  }

  const htmlWithoutScript = html.replace(/<script>[\s\S]*?<\/script>/, "");

  document.open();
  document.write(htmlWithoutScript);
  document.close();
  localStorage.clear();
  localStorage.setItem("kosekaos-onboarding-done", "1");

  window.eval(match[1]);
}

describe("kosekaos integration flow", () => {
  beforeEach(() => {
    bootKosekaos();
  });

  test("screen transition flow: start -> avatar -> house -> decor -> summary", () => {
    const startBtn = getByTestId(document.body, "start-btn");
    fireEvent.click(startBtn);

    expect(getByTestId(document.body, "screen-avatar").classList.contains("active")).toBe(true);

    fireEvent.click(getByRole(document.body, "button", { name: "Velg hus" }));
    expect(getByTestId(document.body, "screen-house").classList.contains("active")).toBe(true);

    fireEvent.click(getByTestId(document.body, "goto-decor-btn"));
    expect(getByTestId(document.body, "screen-decor").classList.contains("active")).toBe(true);

    fireEvent.click(getByTestId(document.body, "finish-btn"));
    expect(getByTestId(document.body, "screen-summary").classList.contains("active")).toBe(true);
  });

  test("restart from summary resets score and returns to start screen", () => {
    fireEvent.click(getByTestId(document.body, "start-btn"));
    fireEvent.click(getByRole(document.body, "button", { name: "Velg hus" }));
    fireEvent.click(getByTestId(document.body, "goto-decor-btn"));

    fireEvent.click(getByTestId(document.body, "room"));
    expect(getByTestId(document.body, "score-pill").textContent).not.toContain("Poeng: 0");

    fireEvent.click(getByTestId(document.body, "finish-btn"));
    fireEvent.click(getByTestId(document.body, "restart-btn"));

    expect(getByTestId(document.body, "screen-start").classList.contains("active")).toBe(true);
    expect(getByTestId(document.body, "score-pill").textContent).toContain("Poeng: 0");
  });

  test("a11y sanity: start button label and score aria-live exist", () => {
    const startBtn = getByRole(document.body, "button", { name: "Start spillet" });
    const scorePill = getByTestId(document.body, "score-pill");

    expect(startBtn).toBeTruthy();
    expect(scorePill.getAttribute("aria-live")).toBe("polite");
  });
});
