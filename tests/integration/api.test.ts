import Database from 'better-sqlite3'
import request from 'supertest'
import { createApiApp } from '../../src/main/server'
import { runMigrations } from '../../src/main/db/migrations'

describe('Cortex API', () => {
  let db: Database.Database
  let app: ReturnType<typeof createApiApp>

  beforeEach(() => {
    db = new Database(':memory:')
    runMigrations(db)
    app = createApiApp(db)
  })

  afterEach(() => {
    db.close()
  })

  it('creates and lists items', async () => {
    const createResponse = await request(app).post('/api/items').send({
      type: 'link',
      title: 'Karpathy Makemore',
      url: 'https://www.youtube.com/watch?v=PaCmpygFfXo',
      priority: 'inbox',
      tags: ['YouTube', 'AI']
    })

    expect(createResponse.status).toBe(201)
    expect(createResponse.body.priority).toBe('inbox')

    const listResponse = await request(app).get('/api/items')
    expect(listResponse.status).toBe(200)
    expect(listResponse.body).toHaveLength(1)
  })

  it('updates, archives, restores, and permanently deletes an item', async () => {
    const createResponse = await request(app).post('/api/items').send({
      type: 'idea',
      title: 'Ship Cortex',
      note: 'Get Phase 1 over the line',
      priority: 'today',
      tags: ['Roadmap']
    })

    const id = createResponse.body.id as string

    const patchResponse = await request(app).patch(`/api/items/${id}`).send({
      title: 'Ship Cortex v1',
      priority: 'this-week',
      tags: ['roadmap', 'Focus']
    })

    expect(patchResponse.status).toBe(200)
    expect(patchResponse.body.tags).toEqual(['Roadmap', 'Focus'])

    const appendResponse = await request(app).post(`/api/items/${id}/notes`).send({
      content: 'Add the onboarding checklist next'
    })

    expect(appendResponse.status).toBe(201)
    expect(appendResponse.body.note_entries).toHaveLength(2)
    expect(appendResponse.body.note_entries[1].content).toContain('onboarding checklist')

    const archiveResponse = await request(app).post(`/api/items/${id}/archive`)
    expect(archiveResponse.status).toBe(204)

    const archived = await request(app).get('/api/items/archived')
    expect(archived.body).toHaveLength(1)

    const restoreResponse = await request(app).post(`/api/items/${id}/restore`)
    expect(restoreResponse.status).toBe(204)

    const restored = await request(app).get('/api/items')
    expect(restored.body).toHaveLength(1)

    const deleteResponse = await request(app).delete(`/api/items/${id}`)
    expect(deleteResponse.status).toBe(204)

    const afterDelete = await request(app).get('/api/items')
    expect(afterDelete.body).toHaveLength(0)
  })

  it('supports prefix search and tag lookup', async () => {
    await request(app).post('/api/items').send({
      type: 'link',
      title: 'Karpathy makemore lecture',
      url: 'https://youtube.com/watch?v=xyz',
      priority: 'today',
      tags: ['AI', 'YouTube']
    })

    await request(app).post('/api/items').send({
      type: 'idea',
      title: 'Review github issue',
      note: 'Look at the open renderer bug',
      priority: 'tomorrow',
      tags: ['GitHub']
    })

    const searchResponse = await request(app).get('/api/search').query({ q: 'make' })
    expect(searchResponse.status).toBe(200)
    expect(searchResponse.body).toHaveLength(1)
    expect(searchResponse.body[0].title).toContain('makemore')

    const tagsResponse = await request(app).get('/api/tags')
    expect(tagsResponse.status).toBe(200)
    expect(tagsResponse.body).toEqual(['AI', 'GitHub', 'YouTube'])
  })
})
