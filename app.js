// SafeSphere AI — browser-only demonstration. This is not an encrypted vault or an actual emergency dispatch service.
"use strict";
let currentCoords = { lat: null, lng: null };
let countdownInterval = null;
let sirenAudioCtx = null, sirenOscillator = null, sirenGain = null, sirenModulation = null;
let cameraStream = null;
let latestAnalysis = null;

document.addEventListener("DOMContentLoaded", () => { getGPSLocation(); loadUserSettings(); renderVaultRecords(); });

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(tabId)?.classList.add("active");
  const map = {"sos-tab":"tab-sos","threatlens-tab":"tab-threatlens","vault-tab":"tab-vault","settings-tab":"tab-settings"};
  document.getElementById(map[tabId])?.classList.add("active");
}
function getGPSLocation() {
  const coordsEl = document.getElementById("location-coords"), badgeEl = document.getElementById("gps-status-badge"), mapsBtn = document.getElementById("gmaps-link");
  if (!("geolocation" in navigator)) { coordsEl.textContent = "Geolocation is not supported by this browser."; badgeEl.textContent = "⚠️ GPS Unavailable"; return; }
  coordsEl.textContent = "Requesting location permission…";
  navigator.geolocation.getCurrentPosition(position => {
    currentCoords.lat = position.coords.latitude; currentCoords.lng = position.coords.longitude;
    coordsEl.textContent = `Latitude: ${currentCoords.lat.toFixed(5)} | Longitude: ${currentCoords.lng.toFixed(5)} (Accuracy: ±${Math.round(position.coords.accuracy)}m)`;
    badgeEl.textContent = "📡 GPS Locked";
    mapsBtn.href = `https://www.google.com/maps?q=${currentCoords.lat},${currentCoords.lng}`;
    mapsBtn.classList.remove("hidden");
  }, error => { coordsEl.textContent = error.code === 1 ? "Location permission denied. You can allow it in browser settings." : "Location unavailable. Try again or check browser permissions."; badgeEl.textContent = "⚠️ GPS Off"; }, { enableHighAccuracy: true, timeout: 10000 });
}
function triggerSOS() {
  if (countdownInterval) clearInterval(countdownInterval);
  let timeLeft = 5;
  document.getElementById("sos-countdown").classList.remove("hidden");
  document.getElementById("timer-seconds").textContent = timeLeft;
  countdownInterval = setInterval(() => {
    timeLeft--; document.getElementById("timer-seconds").textContent = timeLeft;
    if (timeLeft <= 0) { clearInterval(countdownInterval); countdownInterval = null; executeEmergencyAlert(); }
  }, 1000);
}
function cancelSOS() { if (countdownInterval) clearInterval(countdownInterval); countdownInterval = null; document.getElementById("sos-countdown").classList.add("hidden"); showStatusBox("SOS countdown cancelled. No alert was sent."); }
function executeEmergencyAlert() {
  document.getElementById("sos-countdown").classList.add("hidden");
  const coords = currentCoords.lat == null ? "Location unavailable" : `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`;
  saveRecordToVault({id:`INC-${Date.now()}`,timestamp:new Date().toLocaleString(),type:"SOS DEMO TRIGGERED",coords,details:"SOS button triggered. This demo logged the event locally; it did not contact emergency services or send SMS."});
  showStatusBox("SOS demo recorded locally. No emergency service was contacted automatically. If you are in immediate danger in India, call 112.");
}
function showStatusBox(message) { const box = document.getElementById("sos-status-box"); box.textContent = message; box.className = "status-box active"; box.classList.remove("hidden"); }
function sendEmergencySMS() {
  const settings = JSON.parse(localStorage.getItem("safesphere_settings") || "{}");
  const phone = (settings.parent1 || "").trim();
  if (!phone) { alert("Please add a primary trusted contact in Settings & Contacts first."); switchTab("settings-tab"); return; }
  const locText = currentCoords.lat == null ? "Location unavailable" : `https://maps.google.com/?q=${currentCoords.lat},${currentCoords.lng}`;
  const body = encodeURIComponent(`${settings.customMsg || "EMERGENCY SOS: I need immediate help!"} My location: ${locText}`);
  window.location.href = `sms:${phone}?body=${body}`;
}
async function toggleSiren() {
  const btn = document.getElementById("siren-btn");
  try {
    if (!sirenOscillator) {
      sirenAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      await sirenAudioCtx.resume();
      sirenOscillator = sirenAudioCtx.createOscillator(); sirenGain = sirenAudioCtx.createGain();
      sirenOscillator.type = "sawtooth"; sirenOscillator.frequency.value = 800; sirenGain.gain.value = 0.12;
      sirenOscillator.connect(sirenGain); sirenGain.connect(sirenAudioCtx.destination); sirenOscillator.start();
      let high = false; sirenModulation = setInterval(() => { if (sirenOscillator && sirenAudioCtx) { sirenOscillator.frequency.setTargetAtTime(high ? 800 : 1200, sirenAudioCtx.currentTime, 0.05); high = !high; } }, 400);
      btn.textContent = "🛑 Stop Siren Alarm"; btn.className = "btn btn-danger";
    } else {
      clearInterval(sirenModulation); sirenModulation = null;
      try { sirenOscillator.stop(); } catch (_) {}
      sirenOscillator = null; if (sirenAudioCtx) await sirenAudioCtx.close(); sirenAudioCtx = null; sirenGain = null;
      btn.textContent = "🔊 Loud Siren Alarm"; btn.className = "btn btn-warning";
    }
  } catch (err) { alert("Audio could not start. Check browser audio permissions."); }
}
function triggerFakeCall() { const settings = JSON.parse(localStorage.getItem("safesphere_settings") || "{}"); document.getElementById("fake-caller-name").textContent = settings.name ? `${settings.name}'s trusted contact` : "Trusted Contact"; document.getElementById("fake-call-modal").classList.remove("hidden"); }
function endFakeCall() { document.getElementById("fake-call-modal").classList.add("hidden"); }
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) { alert("Camera access requires a supported browser and usually HTTPS or localhost."); return; }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false});
    document.getElementById("webcam-feed").srcObject = cameraStream;
    document.getElementById("camera-placeholder").classList.add("hidden");
    document.getElementById("capture-btn").disabled = false; document.getElementById("stop-cam-btn").disabled = false;
  } catch (err) { alert("Camera permission denied or camera unavailable."); }
}
function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  cameraStream = null; document.getElementById("webcam-feed").srcObject = null;
  document.getElementById("camera-placeholder").classList.remove("hidden");
  document.getElementById("capture-btn").disabled = true; document.getElementById("stop-cam-btn").disabled = true;
}
function capturePhoto() {
  const video = document.getElementById("webcam-feed");
  if (!cameraStream || !video.videoWidth) { alert("Start the camera and wait for the preview before capturing."); return; }
  const canvas = document.getElementById("photo-canvas"), context = canvas.getContext("2d");
  canvas.width = video.videoWidth; canvas.height = video.videoHeight; context.drawImage(video,0,0,canvas.width,canvas.height);
  const photoDataUrl = canvas.toDataURL("image/jpeg",0.75);
  const img = document.createElement("img"); img.src = photoDataUrl; img.alt = "Captured evidence snapshot"; document.getElementById("captured-photos-gallery").prepend(img);
  saveRecordToVault({id:`EVID-${Date.now()}`,timestamp:new Date().toLocaleString(),type:"CAMERA EVIDENCE SNAPSHOT",coords:currentCoords.lat == null ? "Location unavailable" : `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`,image:photoDataUrl,details:"Photo captured locally in this browser."});
}
const SAMPLE_MESSAGES = {
  1:"Send me your private photos right now or I will post our private chat logs to your family and college groups.",
  2:"I know exactly where you live and which campus building you walk out of at 6 PM. I am watching you.",
  3:"URGENT SECURITY ALERT: Your bank account has been locked. Click http://bit.ly/fake-link to verify immediately.",
  4:"Hey! Are we still meeting up for project study group at the library today?"
};
function loadSampleText(id) { document.getElementById("threat-input-text").value = SAMPLE_MESSAGES[id] || ""; }
function clearThreatInput() { document.getElementById("threat-input-text").value = ""; document.getElementById("threat-results-box").classList.add("hidden"); latestAnalysis = null; }
function analyzeTextWithAI() {
  const text = document.getElementById("threat-input-text").value.trim();
  if (!text) { alert("Please enter or paste a message to analyze."); return; }
  const rules = {
    High: ["private photos","chat logs","expose","share with family","tell everyone","blackmail","pay me","watching you","know where you live","followed","outside your house","at 6 pm"],
    Medium: ["bank account","urgent","locked","click link","verify","password","account suspended","gift card","one-time password","otp"]
  };
  const lower = text.toLowerCase(), flagged = [], factors = [], actions = [];
  rules.High.forEach(k => { if (lower.includes(k)) flagged.push(k); });
  rules.Medium.forEach(k => { if (lower.includes(k)) flagged.push(k); });
  const risk = flagged.some(k => rules.High.includes(k)) ? "High" : flagged.length ? "Medium" : "Low";
  if (risk === "High") { factors.push("Possible coercion, intimidation, or stalking language was found."); actions.push("If safe, preserve the full message and sender details."); actions.push("Do not comply with threats or send money/private files."); actions.push("Consider contacting someone you trust or local support services."); }
  else if (risk === "Medium") { factors.push("Possible urgency, credential theft, or suspicious-link language was found."); actions.push("Do not click links or share passwords, OTPs, or banking details."); actions.push("Verify through the organization's official app or website."); }
  else { factors.push("No matching warning phrases were detected by this simple rule-based scan."); actions.push("This does not prove the message is safe; assess the sender and context carefully."); }
  const badge = document.getElementById("risk-score-badge"); badge.textContent = risk === "High" ? "HIGH CONCERN" : risk === "Medium" ? "MEDIUM CONCERN" : "LOW / NO MATCH"; badge.className = `risk-badge risk-${risk.toLowerCase()}`;
  fillList("risk-factors-list",factors); fillList("recommended-actions-list",actions);
  const phraseBox = document.getElementById("flagged-phrases-box"); phraseBox.replaceChildren();
  if (!flagged.length) { const span = document.createElement("span"); span.className="text-subtle"; span.textContent="No matching phrases"; phraseBox.append(span); }
  else flagged.forEach(p => { const span=document.createElement("span"); span.className="phrase-tag"; span.textContent=`"${p}"`; phraseBox.append(span); });
  latestAnalysis = {text,risk,flagged,factors,actions};
  document.getElementById("threat-results-box").classList.remove("hidden");
}
function fillList(id, items) { const list=document.getElementById(id); list.replaceChildren(); items.forEach(item => { const li=document.createElement("li"); li.textContent=item; list.append(li); }); }
function saveThreatAnalysisToVault() {
  if (!latestAnalysis) { alert("Analyze a message first."); return; }
  saveRecordToVault({id:`THREAT-${Date.now()}`,timestamp:new Date().toLocaleString(),type:`THREATLENS RULE-BASED ANALYSIS (${latestAnalysis.risk})`,details:latestAnalysis.text,analysis:latestAnalysis});
  alert("Analysis saved to this browser's local vault.");
}
function getVaultData() { try { return JSON.parse(localStorage.getItem("safesphere_vault") || "[]"); } catch (_) { return []; } }
function saveRecordToVault(record) {
  const vault=getVaultData(); vault.unshift(record);
  try { localStorage.setItem("safesphere_vault",JSON.stringify(vault)); renderVaultRecords(); }
  catch (_) { alert("Could not save record. Browser storage may be full, especially if photos are included."); }
}
function renderVaultRecords() {
  const container=document.getElementById("vault-records-list"); if (!container) return;
  const vault=getVaultData(); container.replaceChildren();
  if (!vault.length) { const p=document.createElement("p"); p.className="text-subtle"; p.style.marginTop="16px"; p.textContent="No incidents logged yet. Your vault is clear."; container.append(p); return; }
  vault.forEach(item => {
    const card=document.createElement("div"); card.className="vault-record-card";
    const header=document.createElement("div"); header.className="vault-record-header";
    const strong=document.createElement("strong"); strong.textContent=item.type || "Incident";
    const time=document.createElement("span"); time.textContent=item.timestamp || "";
    header.append(strong,time); card.append(header);
    const p=document.createElement("p"); p.style.fontSize=".9rem"; p.textContent=item.details || "Evidence snapshot recorded."; card.append(p);
    if (item.coords) { const loc=document.createElement("p"); loc.className="text-subtle"; loc.style.fontSize=".8rem"; loc.style.marginTop="4px"; loc.textContent=`📍 Location: ${item.coords}`; card.append(loc); }
    if (item.image) { const img=document.createElement("img"); img.src=item.image; img.alt="Saved evidence"; img.style.cssText="width:100px;height:80px;object-fit:cover;margin-top:8px;border-radius:4px"; card.append(img); }
    container.append(card);
  });
}
function createNewManualIncident() {
  const note=prompt("Enter incident details or notes. Avoid including passwords or unnecessary sensitive information:");
  if (note?.trim()) saveRecordToVault({id:`MANUAL-${Date.now()}`,timestamp:new Date().toLocaleString(),type:"MANUAL USER INCIDENT NOTE",coords:currentCoords.lat == null ? "" : `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}`,details:note.trim()});
}
function exportVaultData() {
  const blob=new Blob([JSON.stringify(getVaultData(),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download=`safesphere_vault_${Date.now()}.json`; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function clearVaultData() { if (confirm("Permanently erase all SafeSphere records saved in this browser? This cannot be undone.")) { localStorage.removeItem("safesphere_vault"); renderVaultRecords(); } }
function saveUserSettings(e) {
  e.preventDefault();
  const settings={name:document.getElementById("user-full-name").value.trim(),phone:document.getElementById("user-phone").value.trim(),parent1:document.getElementById("parent-contact-1").value.trim(),parent2:document.getElementById("parent-contact-2").value.trim(),customMsg:document.getElementById("sos-custom-message").value.trim()};
  localStorage.setItem("safesphere_settings",JSON.stringify(settings)); alert("Settings saved in this browser.");
}
function loadUserSettings() {
  let settings={}; try { settings=JSON.parse(localStorage.getItem("safesphere_settings") || "{}"); } catch (_) {}
  if (settings.name) document.getElementById("user-full-name").value=settings.name;
  if (settings.phone) document.getElementById("user-phone").value=settings.phone;
  if (settings.parent1) document.getElementById("parent-contact-1").value=settings.parent1;
  if (settings.parent2) document.getElementById("parent-contact-2").value=settings.parent2;
  if (settings.customMsg) document.getElementById("sos-custom-message").value=settings.customMsg;
}
