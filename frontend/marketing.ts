/** The homepage's before and after comparison: a range input sets how much of the before screenshot shows. */
export function splitPercent(value: string): string {
  const n = Math.min(100, Math.max(0, Number(value) || 0));
  return `${n}%`;
}

for (const figure of document.querySelectorAll<HTMLElement>("[data-compare]")) {
  const input = figure.querySelector<HTMLInputElement>("[data-compare-input]");
  if (!input) continue;
  const update = () => {
    figure.style.setProperty("--split", splitPercent(input.value));
    input.setAttribute("aria-valuetext", `${input.value}% before, ${100 - Number(input.value)}% after`);
  };
  input.addEventListener("input", update);
  input.hidden = false;
  update();
}
