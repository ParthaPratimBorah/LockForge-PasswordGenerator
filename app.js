
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+[]{}|;:,.<>?/~`-=";
const AMBIGUOUS = "0O1lI";

/* -------------------------
   DOM elements
   ------------------------- */
const passwordOutput = document.getElementById("passwordOutput");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");
const lengthRange = document.getElementById("lengthRange");
const lengthValue = document.getElementById("lengthValue");
const uppercaseChk = document.getElementById("uppercase");
const lowercaseChk = document.getElementById("lowercase");
const numbersChk = document.getElementById("numbers");
const symbolsChk = document.getElementById("symbols");

const strengthFill = document.getElementById("strengthFill");
const strengthText = document.getElementById("strengthText");

const regenerateHistoryList = document.getElementById("historyList");
const exportBtn = document.getElementById("exportBtn");
const clearHistoryBtn = document.getElementById("clearHistory");

const card = document.getElementById("card");
const themeCheckbox = document.getElementById("themeCheckbox");

/* -------------------------
   App state
   ------------------------- */
let history = []; // store last passwords (most recent first)
const MAX_HISTORY = 5;

/* -------------------------
   Helpers
   ------------------------- */
function buildCharset(){
  let charset = "";
  if(uppercaseChk.checked) charset += UPPER;
  if(lowercaseChk.checked) charset += LOWER;
  if(numbersChk.checked) charset += NUMS;
  if(symbolsChk.checked) charset += SYMBOLS;
  return charset;
}

function randomInt(max){
  return Math.floor(Math.random()*max);
}

function generatePassword(length){
  const charset = buildCharset();
  if(!charset) return "";
  let pw = "";
  // ensure at least one of each selected category (improves strength)
  const selectedSets = [];
  if(uppercaseChk.checked) selectedSets.push(UPPER);
  if(lowercaseChk.checked) selectedSets.push(LOWER);
  if(numbersChk.checked) selectedSets.push(NUMS);
  if(symbolsChk.checked) selectedSets.push(SYMBOLS);

  const requiredCount = Math.min(selectedSets.length, length);
  // place guaranteed characters
  for(let i=0;i<requiredCount;i++){
    let set = selectedSets[i % selectedSets.length];
    let ch = set[randomInt(set.length)];
    pw += ch;
  }
  // fill remaining
  for(let i=pw.length;i<length;i++){
    let ch = charset[randomInt(charset.length)];
    pw += ch;
  }
  // shuffle
  pw = pw.split('').sort(()=>Math.random()-0.5).join('');
  return pw;
}

/* Password strength estimation (simple but practical)
   - Points for length, types included
   - Returns score 0..100 and a label
*/
function evaluateStrength(pw){
  if(!pw) return {score:0,label:"—"};
  let score = 0;
  // length points
  const len = pw.length;
  score += Math.min(40, (len - 6) * 3.33); // up to 40 points for length 6->18+
  // variety
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSym = /[^A-Za-z0-9]/.test(pw);
  const types = [hasLower, hasUpper, hasNum, hasSym].filter(Boolean).length;
  score += types * 15; // up to 60
  // penalty for repeated sequences or common patterns (simple)
  if(/(.)\1{2,}/.test(pw)) score -= 10;
  if(/^(?:password|1234|qwerty|admin)/i.test(pw)) score = 5;
  score = Math.max(0, Math.min(100, Math.round(score)));
  let label = "Very weak";
  if(score >= 80) label = "Strong";
  else if(score >= 60) label = "Medium";
  else if(score >= 30) label = "Weak";
  else label = "Very weak";
  return {score, label};
}

/* Update strength UI */
function updateStrengthUI(pw){
  const s = evaluateStrength(pw);
  strengthFill.style.width = s.score + "%";
  strengthText.textContent = `Strength: ${s.label} (${s.score}%)`;
  // set color classes
  strengthFill.className = "strength-fill";
  if(s.score >= 80) strengthFill.classList.add("strength-strong");
  else if(s.score >= 60) strengthFill.classList.add("strength-medium");
  else if(s.score >= 30) strengthFill.classList.add("strength-weak");
  else strengthFill.classList.add("strength-very-weak");
}

/* History management */
function pushHistory(pw){
  if(!pw) return;
  history.unshift({pw, at: new Date().toISOString()});
  if(history.length > MAX_HISTORY) history.pop();
  renderHistory();
}
function renderHistory(){
  regenerateHistoryList.innerHTML = "";
  history.forEach((h, idx) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = h.pw;
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    const copy = document.createElement("button");
    copy.className = "btn small";
    copy.textContent = "Copy";
    copy.onclick = () => { navigator.clipboard.writeText(h.pw); flashMessage("Copied history item"); };
    actions.appendChild(copy);


    li.appendChild(span);
    li.appendChild(actions);
    regenerateHistoryList.appendChild(li);
  });
}

/* flash message (tiny toast) */
function flashMessage(msg){
  // small ephemeral feedback via title attribute (quick)
  const prev = document.title;
  document.title = msg;
  setTimeout(()=>document.title = prev, 900);
}

/* -------------------------
   Event handlers
   ------------------------- */
function onGenerate(){
  const length = Number(lengthRange.value);
  const pw = generatePassword(length);
  passwordOutput.value = pw;
  updateStrengthUI(pw);
  pushHistory(pw);
}

function onRegenerate(){
  
  onGenerate();
}

function onCopy(){
  const text = passwordOutput.value;
  if(!text) return flashMessage("Nothing to copy");
  navigator.clipboard.writeText(text).then(()=>{
    flashMessage("Copied!");
  }).catch(()=> flashMessage("Copy failed"));
}

/* Update length value view */
lengthRange.addEventListener("input", () => {
  lengthValue.textContent = lengthRange.value;
});

/* Buttons */
generateBtn.addEventListener("click", onGenerate);
copyBtn.addEventListener("click", onCopy);

/* Keyboard: Enter on card to generate */
card.addEventListener("keydown", (e) => {
  if(e.key === "Enter") onGenerate();
});

/* Export history as txt */
exportBtn.addEventListener("click", () => {
  if(history.length === 0) return flashMessage("No history");
  const lines = history.map(h => `${h.pw}    (${new Date(h.at).toLocaleString()})`);
  const blob = new Blob([lines.join('\n')], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "password_history.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

/* Clear history */
clearHistoryBtn.addEventListener("click", () => {
  history = [];
  renderHistory();
});

/* 3D tilt effect */
(function addTilt(){
  const root = card;
  const damp = 16; // smaller = more tilt
  let rect = root.getBoundingClientRect();

  function updateRect(){ rect = root.getBoundingClientRect(); }
  window.addEventListener("resize", updateRect);

  root.addEventListener("pointermove", (e) => {
    const x = e.clientX - rect.left - rect.width/2;
    const y = e.clientY - rect.top - rect.height/2;
    const rx = (y / rect.height) * (damp);
    const ry = - (x / rect.width) * (damp);
    root.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  });
  root.addEventListener("pointerleave", () => {
    root.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
  });
})();

/* On load - generate initial password */
window.addEventListener("DOMContentLoaded", () => {
  lengthValue.textContent = lengthRange.value;
  onGenerate();
});
