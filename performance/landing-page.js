import http from 'k6/http'
import { check, group } from 'k6'

const baseUrl = (__ENV.NEXUDUS_AP_BASE_URL || 'https://dashboard.nexudus.com/').replace(/\/+$/, '')
const vus = Number.parseInt(__ENV.K6_VUS || '5', 10)
const duration = __ENV.K6_DURATION || '30s'

export const options = {
  vus,
  duration,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
  },
}

function extractAssetPath(html, extension) {
  const pattern = new RegExp(`(?:src|href)=["']([^"']+\\.${extension}[^"']*)["']`, 'i')
  return html.match(pattern)?.[1]
}

function resolveAssetUrl(assetPath) {
  if (!assetPath) {
    return null
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath
  }

  if (assetPath.startsWith('/')) {
    return `${baseUrl}${assetPath}`
  }

  return `${baseUrl}/${assetPath}`
}

export default function () {
  group('landing page', () => {
    const pageResponse = http.get(`${baseUrl}/`, {
      tags: { name: 'landing-page' },
    })

    check(pageResponse, {
      'landing page responded with 200': (response) => response.status === 200,
      'landing page includes Nexudus title': (response) => response.body.includes('<title>Nexudus platform</title>'),
      'landing page returned HTML': (response) =>
        String(response.headers['Content-Type'] || '').includes('text/html'),
    })

    const scriptPath = extractAssetPath(pageResponse.body, 'js')
    const stylesheetPath = extractAssetPath(pageResponse.body, 'css')
    const scriptUrl = resolveAssetUrl(scriptPath)
    const stylesheetUrl = resolveAssetUrl(stylesheetPath)

    if (scriptUrl) {
      const scriptResponse = http.get(scriptUrl, {
        tags: { name: 'landing-script' },
      })

      check(scriptResponse, {
        'landing script responded with 200': (response) => response.status === 200,
      })
    }

    if (stylesheetUrl) {
      const stylesheetResponse = http.get(stylesheetUrl, {
        tags: { name: 'landing-stylesheet' },
      })

      check(stylesheetResponse, {
        'landing stylesheet responded with 200': (response) => response.status === 200,
      })
    }
  })
}
