// 화면을 그리기 전에 먼저 실행하는 작은 스크립트 (index.html <head>에서 불러온다).
// 보안 정책(CSP)이 페이지 안에 직접 쓴 스크립트를 막으므로 여기 따로 둔다.

// 설정에서 고른 화면 모드(라이트/다크)를 그리기 전에 적용해 깜빡임을 막는다.
// 고른 모드만 지원한다고 알려(라이트는 "only light") 브라우저의 강제 다크가 겹치지 않게 한다
try {
  const t = localStorage.getItem("soccer-local-theme");
  if (t === "light" || t === "dark") {
    document.documentElement.dataset.theme = t;
    document.getElementById("colorSchemeMeta").content = t === "light" ? "only light" : "dark";
  }
  // 포지션 색상: 단색을 고른 적이 없으면 컬러
  document.documentElement.dataset.poscolor = localStorage.getItem("soccer-local-poscolor") === "mono" ? "mono" : "color";
} catch (e) { document.documentElement.dataset.poscolor = "color"; }

// 설치한 앱(플레이스토어 앱·홈 화면 앱)으로 열면 안드로이드가 아이콘 화면을 먼저 보여 주므로,
// 웹 실행 화면을 또 띄우면 아이콘이 사라졌다 다시 나타나 깜빡여 보인다. 이때는 웹 실행 화면을 쓰지 않는다
try {
  if (matchMedia("(display-mode: standalone)").matches || document.referrer.startsWith("android-app://"))
    document.documentElement.dataset.launch = "app";
} catch (e) {}

// 앱 실행 화면 (브라우저로 열 때만): 최소 0.9초 보여 주고, 화면 준비가 끝나면 사라진다 (늦어도 3초 뒤에는 닫힘)
(() => {
  const hide = () => {
    const s = document.getElementById("splash");
    if (!s || s.classList.contains("hide")) return;
    s.classList.add("hide");
    setTimeout(() => s.remove(), 500);
  };
  addEventListener("load", () => setTimeout(hide, Math.max(0, 900 - performance.now())));
  setTimeout(hide, 3000);
})();

// 오프라인에서도 열리도록 서비스 워커 등록 (local/ 폴더 전용)
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {}));
}
