if ("serviceWorker" in navigator) {
  const serviceWorkerUrl = new URL("./service-worker.js", document.currentScript.src);
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(serviceWorkerUrl.href)
      .catch(error => console.error("No se pudo registrar el modo instalable CCH.", error));
  });
}
