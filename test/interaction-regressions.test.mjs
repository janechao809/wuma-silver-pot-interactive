import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function readPage(name) {
  return readFile(new URL(name, root), "utf8");
}

function cssZIndex(source, selector) {
  const block = source.match(new RegExp(`${selector}[\\s\\S]*?\\n    }`));
  assert.ok(block, `missing CSS block: ${selector}`);
  const match = block[0].match(/z-index:\s*(\d+)/);
  assert.ok(match, `missing z-index in ${selector}`);
  return Number(match[1]);
}

test("magnifier stays above the model stacking context on both page variants", async () => {
  for (const pageName of ["index.html", "mobile.html"]) {
    const source = await readPage(pageName);
    const modelLayer = cssZIndex(source, "    .artifact-wrap.model-mode {");
    const lensLayer = cssZIndex(source, "    .lens {");
    assert.ok(lensLayer > modelLayer, `${pageName}: lens must be above model`);
  }
});

test("magnifier samples the live 3D canvas instead of only a fixed poster", async () => {
  for (const pageName of ["index.html", "mobile.html"]) {
    const source = await readPage(pageName);
    assert.match(source, /class="lens-canvas" id="lensCanvas"/);
    assert.match(source, /preserveDrawingBuffer:\s*true/);
    assert.match(source, /drawImage\(modelCanvas/);
  }
});

test("resetting the classroom record clears student identity and its saved copy", async () => {
  const source = await readPage("index.html");
  assert.match(source, /document\.querySelectorAll\("#studentClass, #studentGroup, #studentName"\)/);
  assert.match(source, /localStorage\.removeItem\("wumaStudentInfo"\)/);
});

test("resetting the classroom record restores dragged challenge cards on both page variants", async () => {
  for (const pageName of ["index.html", "mobile.html"]) {
    const source = await readPage(pageName);
    assert.match(source, /function resetDragChallenge\(\)/);
    assert.match(source, /document\.querySelector\("#draggables"\)/);
    assert.match(source, /dragSource\.appendChild\(card\)/);
    assert.match(source, /card\.setAttribute\("draggable", "true"\)/);
    assert.match(source, /resetDragChallenge\(\);/);
  }
});

test("resetting the classroom record clears timeline scene and submit status on both page variants", async () => {
  for (const pageName of ["index.html", "mobile.html"]) {
    const source = await readPage(pageName);
    assert.match(source, /function resetStoryScene\(\)/);
    assert.match(source, /storyVideo\.dataset\.scene = "intro"/);
    assert.match(source, /document\.querySelector\("#storyTag"\)\.textContent = "何家村窖藏"/);
    assert.match(source, /resetStoryScene\(\);/);
  }
  const mobileSource = await readPage("mobile.html");
  assert.match(mobileSource, /document\.querySelector\("#submitStatus"\)/);
  assert.match(mobileSource, /status\.className = "submit-status"/);
});

test("mobile page can submit recovered learning data with student identity", async () => {
  const source = await readPage("mobile.html");
  assert.match(source, /id="studentClass"/);
  assert.match(source, /id="studentGroup"/);
  assert.match(source, /id="studentName"/);
  assert.match(source, /id="submitLearningData"/);
  assert.match(source, /const QUICKFORM_ENDPOINT = "https:\/\/quickform\.cn\/api\/q6frl7ocje"/);
  assert.match(source, /function collectLearningPayload\(\)/);
  assert.match(source, /function submitLearningData\(\)/);
  assert.match(source, /navigator\.sendBeacon/);
  assert.match(source, /localStorage\.removeItem\("wumaStudentInfo"\)/);
});

test("mobile root page prevents hero text from causing horizontal overflow", async () => {
  const source = await readPage("index.html");
  assert.match(source, /@media \(max-width:\s*720px\)[\s\S]*\.hero h2[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(source, /@media \(max-width:\s*720px\)[\s\S]*\.hero-title-line,\s*\n\s*\.hero-title-gold[\s\S]*display:\s*block/);
});

test("root page defers WebGL renderer creation until the 3D area is requested", async () => {
  const source = await readPage("index.html");
  assert.doesNotMatch(source, /const renderer3d = new THREE\.WebGLRenderer/);
  assert.match(source, /let renderer3d = null/);
  assert.match(source, /function ensureRenderer3d\(\)/);
  assert.match(source, /if \(!ensureRenderer3d\(\)\) return/);
});

test("root page forces initially visible reveal elements to enter view", async () => {
  const source = await readPage("index.html");
  assert.match(source, /function revealVisibleTargets\(\)/);
  assert.match(source, /el\.getBoundingClientRect\(\)/);
  assert.match(source, /requestAnimationFrame\(revealVisibleTargets\)/);
  assert.match(source, /window\.addEventListener\("load", revealVisibleTargets/);
  assert.match(source, /window\.addEventListener\("scroll", revealVisibleTargets/);
  assert.match(source, /window\.addEventListener\("hashchange", \(\) => requestAnimationFrame\(revealVisibleTargets\)/);
  assert.match(source, /@keyframes mobileRevealReady/);
  assert.match(source, /\.hero-copy\.motion-reveal[\s\S]*animation:\s*mobileRevealReady/);
});
