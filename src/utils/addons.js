const KEY_PREFIX = 'bite_addons_'
const TAG_KEY_PREFIX = 'bite_product_addons_'
const VARIANT_KEY_PREFIX = 'bite_product_variants_'

function key(tenantId) { return `${KEY_PREFIX}${tenantId || 'guest'}` }
function tagKey(tenantId) { return `${TAG_KEY_PREFIX}${tenantId || 'guest'}` }
function variantKey(tenantId) { return `${VARIANT_KEY_PREFIX}${tenantId || 'guest'}` }

export function loadAddons(tenantId) {
  try {
    const raw = localStorage.getItem(key(tenantId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAddons(tenantId, addons) {
  localStorage.setItem(key(tenantId), JSON.stringify(addons || []))
}

export function loadProductAddonTags(tenantId) {
  try {
    const raw = localStorage.getItem(tagKey(tenantId))
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveProductAddonTags(tenantId, tags) {
  localStorage.setItem(tagKey(tenantId), JSON.stringify(tags || {}))
}

export function loadProductVariants(tenantId) {
  try {
    const raw = localStorage.getItem(variantKey(tenantId))
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveProductVariants(tenantId, variants) {
  localStorage.setItem(variantKey(tenantId), JSON.stringify(variants || {}))
}
