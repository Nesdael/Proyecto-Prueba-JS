import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const require = createRequire(import.meta.url)
const dbData = require('../../db.json')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json'
}

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' }
    }

    // Strip function prefix to get the resource path
    const apiPath = event.path
        .replace(/^\/\.netlify\/functions\/api/, '')
        .replace(/^\/api/, '')
        .replace(/\/$/, '') || '/'

    const parts = apiPath.split('/').filter(Boolean)
    const resource = parts[0]
    const id = parts[1]

    const method = event.httpMethod
    const query = event.queryStringParameters || {}
    const body = event.body ? JSON.parse(event.body) : null

    // Deep copy to avoid mutating module cache
    const db = JSON.parse(JSON.stringify(dbData))

    const respond = (statusCode, data) => ({
        statusCode,
        headers: corsHeaders,
        body: JSON.stringify(data)
    })

    try {
        if (!resource || !db[resource]) {
            return respond(404, { error: 'Resource not found' })
        }

        // GET /resource (with optional query filters)
        if (method === 'GET' && !id) {
            let results = db[resource]
            for (const [key, value] of Object.entries(query)) {
                results = results.filter(item => String(item[key]) === String(value))
            }
            return respond(200, results)
        }

        // GET /resource/:id
        if (method === 'GET' && id) {
            const item = db[resource].find(i => String(i.id) === String(id))
            return item ? respond(200, item) : respond(404, { error: 'Not found' })
        }

        // POST /resource
        if (method === 'POST' && !id) {
            const newItem = { ...body, id: Date.now().toString() }
            return respond(201, newItem)
        }

        // PATCH /resource/:id
        if (method === 'PATCH' && id) {
            const item = db[resource].find(i => String(i.id) === String(id))
            if (!item) return respond(404, { error: 'Not found' })
            return respond(200, { ...item, ...body })
        }

        // DELETE /resource/:id
        if (method === 'DELETE' && id) {
            const item = db[resource].find(i => String(i.id) === String(id))
            if (!item) return respond(404, { error: 'Not found' })
            return respond(200, {})
        }

        return respond(405, { error: 'Method not allowed' })

    } catch (err) {
        return respond(500, { error: err.message })
    }
}
