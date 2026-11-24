import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { GOOGLE_WEB_CLIENT_ID } from "../google-auth-config.js";

let initialization;

async function initializeGoogle() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("El inicio de sesión con Google solo está disponible dentro del APK.");
  }
  if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID.startsWith("REPLACE_")) {
    throw new Error("Configura el cliente web de OAuth en apk/google-auth-config.js.");
  }
  if (!initialization) {
    initialization = SocialLogin.initialize({
      google: { webClientId: GOOGLE_WEB_CLIENT_ID, mode: "online" }
    });
  }
  await initialization;
}

async function getIdToken() {
  await initializeGoogle();
  const response = await SocialLogin.login({
    provider: "google",
    options: {
      style: "bottom",
      autoSelectEnabled: true,
      filterByAuthorizedAccounts: false
    }
  });
  if (!response.result.idToken) throw new Error("Google no devolvió un token de identidad.");
  return response.result.idToken;
}

async function signOut() {
  if (!Capacitor.isNativePlatform()) return;
  await SocialLogin.logout({ provider: "google" });
}

window.CCHGoogleAuth = Object.freeze({ getIdToken, signOut });
