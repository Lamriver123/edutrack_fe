import assert from "node:assert/strict";
import test from "node:test";
import {
  CLASS_COLOR_SUGGESTION_OPTIONS,
  getSuggestedClassColors,
} from "../components/classes/classroom-utils.ts";

test("class color suggestions return three distinct choices", () => {
  const suggestions = getSuggestedClassColors([]);

  assert.equal(suggestions.length, 3);
  assert.equal(
    new Set(suggestions.map((suggestion) => suggestion.accent)).size,
    3,
  );
});

test("class color suggestions avoid exact colors already in use", () => {
  const usedColors = ["#6366f1", "#14b8a6", "#f97316"];
  const suggestions = getSuggestedClassColors(usedColors);

  suggestions.forEach((suggestion) => {
    assert.ok(!usedColors.includes(suggestion.accent));
  });
});

test("class color suggestions adapt to colors from other classes", () => {
  const suggestionsNearIndigo = getSuggestedClassColors(["#4f46e5"]);
  const suggestionsNearGreen = getSuggestedClassColors(["#15803d"]);

  assert.notDeepEqual(suggestionsNearIndigo, suggestionsNearGreen);
});

test("class color suggestions can produce alternative sets", () => {
  const firstSet = getSuggestedClassColors(["#4f46e5", "#15803d"], 3, 0);
  const nextSet = getSuggestedClassColors(["#4f46e5", "#15803d"], 3, 1);

  assert.notDeepEqual(firstSet, nextSet);
});

test("generated recommendation sets stay medium-light", () => {
  for (let variation = 0; variation < 8; variation += 1) {
    getSuggestedClassColors(["#4f46e5", "#15803d"], 3, variation).forEach(
      (suggestion) => {
        assert.ok(getHslLightness(suggestion.accent) >= 0.4);
      },
    );
  }
});

test("the recommendation palette does not contain overly dark colors", () => {
  CLASS_COLOR_SUGGESTION_OPTIONS.forEach((suggestion) => {
    assert.ok(getHslLightness(suggestion.accent) >= 0.4);
  });
});

test("the recommendation palette includes a medium-light brown", () => {
  assert.ok(
    CLASS_COLOR_SUGGESTION_OPTIONS.some(
      (suggestion) => suggestion.accent === "#a66a3f",
    ),
  );
});

function getHslLightness(color) {
  const channels = [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ].map((channel) => channel / 255);

  return (Math.max(...channels) + Math.min(...channels)) / 2;
}
