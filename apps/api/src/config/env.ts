const requiredVariables = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;

export function validateEnv(config: Record<string, unknown>) {
  const missing = requiredVariables.filter((name) => {
    const value = config[name];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  }

  const apiPort = Number(config.API_PORT ?? 4000);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error('API_PORT deve ser um número inteiro entre 1 e 65535');
  }

  if (config.NODE_ENV === 'production' || config.NODE_ENV === 'staging') {
    for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
      const value = String(config[name]).toLowerCase();
      if (value.length < 32 || value.includes('change-before-production') || value.includes('replace-me') || value.includes('troque-por')) {
        throw new Error(`${name} precisa ser um secret forte e exclusivo em produção ou homologação`);
      }
    }
  }

  return { ...config, API_PORT: apiPort };
}
