import { type, merge, extend } from '../helper/utils'
import { COMPONENT_HOOKS, PAGE_HOOKS, APP_HOOKS } from '../platform/lifecycle'

const HOOKS_MAP = {
  'component': COMPONENT_HOOKS,
  'page': PAGE_HOOKS,
  'app': APP_HOOKS,
  'blend': PAGE_HOOKS.concat(COMPONENT_HOOKS)
}

let CURRENT_HOOKS = []
let curType

export default function mergeOptions (options = {}, type) {
  if (!options.mixins || !options.mixins.length) return options
  // 微信小程序使用Component创建page
  curType = options.blend ? 'blend' : type
  CURRENT_HOOKS = HOOKS_MAP[curType]
  const newOptions = {}
  extractMixins(newOptions, options)
  return transformHOOKS(newOptions)
}

function extractMixins (mergeOptions, options) {
  if (options.mixins) {
    for (const mix of options.mixins) {
      extractMixins(mergeOptions, mix)
    }
  }
  options = extractLifetimes(options)
  options = extractPageHooks(options)
  mergeMixins(mergeOptions, options)
}

function extractLifetimes (options) {
  if (type(options.lifetimes) === 'Object') {
    const newOptions = extend({}, options, options.lifetimes)
    delete newOptions.lifetimes
    return newOptions
  } else {
    return options
  }
}

function extractPageHooks (options) {
  if (curType === 'blend') {
    const newOptions = extend({}, options)
    const methods = newOptions.methods
    methods && Object.keys(methods).forEach(key => {
      if (PAGE_HOOKS.indexOf(key) > -1) {
        if (newOptions[key]) {
          console.warn(`Don't redefine the lifecycle [${key}]， it will use the methods's lifecycle if redefined`)
        }
        newOptions[key] = methods[key]
      }
    })
    return newOptions
  } else {
    return options
  }
}

function mergeMixins (parent, child) {
  for (let key in child) {
    if (CURRENT_HOOKS.indexOf(key) > -1) {
      mergeHooks(parent, child, key)
    } else if (key === 'data') {
      mergeData(parent, child, key)
    } else if (/computed|properties|methods|proto/.test(key)) {
      mergeSimpleProps(parent, child, key)
    } else if (/watch|pageLifetimes/.test(key)) {
      mergeToArray(parent, child, key)
    } else if (key !== 'mixins') {
      mergeDefault(parent, child, key)
    }
  }
}

function mergeDefault (parent, child, key) {
  parent[key] = child[key]
}

function mergeHooks (parent, child, key) {
  if (parent[key]) {
    parent[key].push(child[key])
  } else {
    parent[key] = [child[key]]
  }
}

function mergeSimpleProps (parent, child, key) {
  let parentVal = parent[key]
  const childVal = child[key]
  if (!parentVal) {
    parent[key] = parentVal = {}
  }
  extend(parentVal, childVal)
}

function mergeData (parent, child, key) {
  const childVal = child[key]
  if (!parent[key]) {
    parent[key] = {}
  }
  merge(parent[key], childVal)
}

function mergeToArray (parent, child, key) {
  let parentVal = parent[key]
  const childVal = child[key]
  if (!parentVal) {
    parent[key] = parentVal = {}
  }
  Object.keys(childVal).forEach(key => {
    if (key in parentVal) {
      parentVal[key] = type(parentVal[key]) !== 'Array'
        ? [parentVal[key], childVal[key]]
        : parentVal[key].concat([childVal[key]])
    } else {
      parentVal[key] = [childVal[key]]
    }
  })
}

function composeHooks (target, includes) {
  Object.keys(target).forEach(key => {
    if (!includes || includes.indexOf(key) !== -1) {
      const hooksArr = target[key]
      hooksArr && (target[key] = function (...args) {
        let result
        for (let i = 0; i < hooksArr.length; i++) {
          if (type(hooksArr[i]) === 'Function') {
            const data = hooksArr[i].apply(this, args)
            data !== undefined && (result = data)
          }
        }
        return result
      })
    }
  })
}

function transformHOOKS (options) {
  composeHooks(options, CURRENT_HOOKS)
  options.pageLifetimes && composeHooks(options.pageLifetimes)
  if (curType === 'blend') {
    for (const key in options) {
      // 使用Component创建page实例，页面专属生命周期&自定义方法需写在methods内部
      if (typeof options[key] === 'function' && COMPONENT_HOOKS.indexOf(key) === -1) {
        (options.methods || (options.methods = {}))[key] = options[key]
        delete options[key]
      }
    }
  }
  return options
}
