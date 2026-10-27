import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const file = join(root, '.data', 'salircontigo.sqlite')
mkdirSync(dirname(file), { recursive: true })

const db = new DatabaseSync(file)
db.exec('PRAGMA foreign_keys = ON')
const migrations = join(root, 'migrations')
for (const name of readdirSync(migrations).filter(file => file.endsWith('.sql')).sort()) {
  db.exec(readFileSync(join(migrations, name), 'utf8'))
}

let raw
try {
  raw = readFileSync(join(root, 'data', 'db.json'), 'utf8')
}
catch {
  raw = ''
}

if (!raw) {
  console.log('Base local lista. No había data/db.json para importar.')
}
else {
  const total = Number(db.prepare('select count(*) as total from users').get().total)
  if (total > 0) {
    console.log('La base local ya tiene cuentas. No importé el archivo JSON.')
  }
  else {
    const data = JSON.parse(raw)
    const insertUser = db.prepare('insert into users (id, name, email, password_hash, salt, invites_created, created_at) values (?, ?, ?, ?, ?, ?, ?)')
    const insertInvite = db.prepare(`insert into invites (
      id, user_id, slug, name, photo_url, active, kind, steps, prompts, languages,
      default_lang, copy, foods, times, whatsapp, callmebot_key, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const insertResponse = db.prepare(`insert into responses (
      id, invite_id, lang, no_attempts, date, time, food_id, answers, callmebot_ok, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    db.exec('BEGIN')
    try {
      for (const user of data.users || []) {
        insertUser.run(user.id, user.name, user.email, user.passwordHash, user.salt, Number(user.invitesCreated) || 0, user.createdAt)
      }
      for (const invite of data.invites || []) {
        insertInvite.run(
          invite.id,
          invite.userId,
          invite.slug,
          invite.name,
          invite.photoUrl || '',
          invite.active === false ? 0 : 1,
          invite.kind === 'sorry' ? 'sorry' : 'date',
          JSON.stringify(invite.steps || {}),
          JSON.stringify(invite.prompts || []),
          JSON.stringify(invite.languages || ['es']),
          invite.defaultLang || 'es',
          JSON.stringify(invite.copy || {}),
          JSON.stringify(invite.foods || []),
          JSON.stringify(invite.times || []),
          invite.whatsapp || '',
          invite.callmebotKey || '',
          invite.createdAt,
        )
      }
      for (const response of data.responses || []) {
        insertResponse.run(
          response.id,
          response.inviteId,
          response.lang || 'es',
          Number(response.noAttempts) || 0,
          response.date || '',
          response.time || '',
          response.foodId || '',
          JSON.stringify(response.answers || []),
          response.callmebotOk ? 1 : 0,
          response.createdAt,
          response.updatedAt || response.createdAt,
        )
      }
      db.exec('COMMIT')
    }
    catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    console.log(`Importé ${(data.users || []).length} cuentas, ${(data.invites || []).length} invitaciones y ${(data.responses || []).length} respuestas.`)
  }
}

db.close()
console.log('Base local lista.')
