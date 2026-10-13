
const crypto = require('node:crypto');
const { db, digits, validCpf, hash } = require('../lib/access');

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';

  if (!origin || origin !== `${proto}://${host}`) {
    return res.status(403).json({ error: 'Origem não autorizada' });
  }

  if (!String(req.headers['content-type'] || '')
    .toLowerCase().startsWith('application/json')) {
    return res.status(415).json({ error: 'Envie JSON' });
  }

  const body = req.body || {};
  const secret = process.env.BOOTSTRAP_MASTER_TOKEN || '';

  if (
    secret.length < 32 ||
    typeof body.token !== 'string' ||
    Buffer.byteLength(body.token) !== Buffer.byteLength(secret) ||
    !crypto.timingSafeEqual(
      Buffer.from(body.token),
      Buffer.from(secret)
    )
  ) {
    return res.status(403).json({ error: 'Token inválido' });
  }

  const nome = String(body.nome || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const cpf = digits(body.cpf);
  const senha = body.senha;

  if (
    !validCpf(cpf) ||
    nome.length < 2 ||
    nome.length > 150 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    typeof senha !== 'string' ||
    senha.length < 12 ||
    senha.length > 256
  ) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  try {
    const { data, error } = await db().rpc(
      'os_bootstrap_master',
      {
        p_nome: nome,
        p_email: email,
        p_cpf: cpf,
        p_hash: hash(senha)
      }
    );

    if (error) throw error;

    if (!data) {
      return res.status(409).json({
        error: 'Cadastro inicial indisponível'
      });
    }

    return res.status(201).json({
      ok: true,
      message: 'Administrador Master cadastrado'
    });
  } catch (error) {
    console.error('Bootstrap Master:', error.message);
    return res.status(503).json({
      error: 'Não foi possível concluir o cadastro'
    });
  }
};
