import { CREATED, MOUNTED } from '../../core/innerLifecycle'
import { is } from '../../helper/env'

export default function lifecycleMixin (type) {
  let options
  if (is('ali')) {
    options = {
      data: {
        __lifecycle_hack: true
      },
      [MOUNTED] () {
        typeof this.$rawOptions.didMount === 'function' && this.$rawOptions.didMount.call(this)
        typeof this.$rawOptions.onReady === 'function' && this.$rawOptions.onReady.call(this)
      }
    }
    if (type === 'page') {
      options.data.__depth = 0
    } else {
      options.props = {
        __depth: 0
      }
    }
  } else if (is('wx') || is('swan')) {
    options = {
      [CREATED] () {
        typeof this.$rawOptions.created === 'function' && this.$rawOptions.created.call(this)
      }
    }
    if (type === 'page') {
      options.data = {
        __depth: 0
      }
    } else {
      options.properties = {
        __depth: Number
      }
    }
  }
  return options
}