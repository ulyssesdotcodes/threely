import 
const taps : { times : number[]} = {times : []}

export function createTapBeatButton(): HTMLElement {
  const button = document.createElement("button");
  button.className = "run-button";
  button.innerHTML = `
    <span>Tap beat</span>
  `;
  button.title = "Run current block (Ctrl+Enter)";

  // Handle button click - same logic as Ctrl+Enter
  button.addEventListener("click", () =>  {
    const now = Date.now();
    taps.times.push(now);
    taps.times = taps.times.filter(v => now - v < 8000);
  });



  return button;
}