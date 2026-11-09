// ============================================================
// SESIONES
//
// - Admin: contraseña en la propiedad CCH_ADMIN_PASSWORD → token (6 h)
// - Alumno: SOLO número de cuenta registrado en Students → token (2 h)
// Los tokens viven en CacheService; nunca se guarda la contraseña.
// Tras LOGIN_MAX_ATTEMPTS intentos fallidos se bloquea LOGIN_LOCK_S segundos.
// ============================================================

function adminLogin_(params) {
  const cache = CacheService.getScriptCache();
  const rateKey = "fail_admin";
  checkRateLimit_(cache, rateKey);

  const expected = PropertiesService.getScriptProperties().getProperty(SETTINGS.ADMIN_PASSWORD_KEY);
  if (!expected) {
    throw new Error(`Configura la propiedad de script "${SETTINGS.ADMIN_PASSWORD_KEY}" antes de usar el panel.`);
  }
  if (String(params.password || "") !== expected) {
    registerFailure_(cache, rateKey);
    throw new Error("Contraseña incorrecta.");
  }

  cache.remove(rateKey);
  const token = Utilities.getUuid();
  cache.put("adm_" + token, "1", SETTINGS.ADMIN_TOKEN_TTL_S);

  // Primer ingreso: asegura que existan las hojas W_*
  withScriptLock_(() => setupWeb_());

  return { token, expiresIn: SETTINGS.ADMIN_TOKEN_TTL_S };
}

function requireAdmin_(token) {
  if (!token || !CacheService.getScriptCache().get("adm_" + token)) {
    throw appError_("Tu sesión de administrador expiró. Vuelve a entrar.", "AUTH");
  }
}

function studentLogin_(params) {
  const cuenta = limpiarCuenta_(params.cuenta);
  if (!cuenta) throw new Error("Escribe tu número de cuenta (solo dígitos).");

  const cache = CacheService.getScriptCache();
  const rateKey = "fail_stu_" + cuenta;
  checkRateLimit_(cache, rateKey);

  const records = studentRecords_().filter(r => r.cuenta === cuenta);
  if (!records.length) {
    registerFailure_(cache, rateKey);
    throw new Error("No encontramos ese número de cuenta. Revisa que esté bien escrito.");
  }

  cache.remove(rateKey);
  const token = Utilities.getUuid();
  cache.put("stu_" + token, cuenta, SETTINGS.STUDENT_TOKEN_TTL_S);

  return { token, cuenta, nombre: records[0].nombre, expiresIn: SETTINGS.STUDENT_TOKEN_TTL_S };
}

function requireStudent_(token) {
  const cuenta = token ? CacheService.getScriptCache().get("stu_" + token) : null;
  if (!cuenta) throw appError_("Tu sesión expiró. Vuelve a entrar con tu número de cuenta.", "AUTH");
  return cuenta;
}

function logout_(params) {
  if (params.token) {
    const cache = CacheService.getScriptCache();
    cache.remove("adm_" + params.token);
    cache.remove("stu_" + params.token);
  }
  return { message: "Sesión cerrada." };
}

function checkRateLimit_(cache, key) {
  const fails = Number(cache.get(key) || 0);
  if (fails >= SETTINGS.LOGIN_MAX_ATTEMPTS) {
    throw new Error(`Demasiados intentos. Espera ${Math.round(SETTINGS.LOGIN_LOCK_S / 60)} minutos.`);
  }
}

function registerFailure_(cache, key) {
  const fails = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(fails), SETTINGS.LOGIN_LOCK_S);
}
