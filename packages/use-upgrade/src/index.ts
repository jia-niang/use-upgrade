import { useEffect, useState } from 'react'

declare var window: Window & {
  __checkUpgrade_register__: boolean
  __checkUpgrade_checkFn__: any
  __checkUpgrade_cancelFn__: any
}

interface ICheckUpgradeCommonOptions {
  /**
   * 本地存储使用的 KEY 键名
   *
   * 默认 `"useUpgrade"`
   */
  storageKey?: string

  /**
   * 需要检测 index.html 中的 chunkName，支持多个
   *
   * 默认 `['main', 'umi', 'app']`
   */
  chunkNames?: string | string[]

  /**
   * 如果网站部署在子目录（subpath）上，传入此参数表示子目录
   *
   * 默认 `"/"`
   */
  basename?: string

  /**
   * 本地新版本检查的间隔时间（毫秒）
   *
   * 提供 `0` 可以关闭本地新版本检查
   *
   * 默认 `120 * 1000`
   */
  checkInterval?: number

  /**
   * 请求 index.html 的间隔时间（毫秒）
   *
   * 提供 `0` 可以关闭请求 index.html
   *
   * 默认 `300 * 1000`
   */
  fetchInterval?: number

  /**
   * 每次解析 index.html 时会尝试寻找带有此 name 属性的 `<meta>` 标签，以此来判断是否跳过本次版本更新
   *
   * 提供 `null` 则会禁用跳过版本更新的逻辑
   *
   * 默认 `"useUpgradeSkip"`
   */
  skipMetaName?: string | null

  /** 是否禁用网站切换到前台时自动检查（默认 `false`） */
  disablePageVisibleEmitter?: boolean

  /** 是否禁用网站从离线切换到在线时自动检查（默认 `false`） */
  disablePageReonlineEmitter?: boolean

  /** 是否禁用网站路由导航时自动检查（默认 `false`） */
  disablePageRouteEmitter?: boolean
}

/** 网站新版本检测 `triggerCheckUpgrade()` 的配置项 */
interface ICheckUpgradeOptions extends ICheckUpgradeCommonOptions {
  /**
   * 覆写请求 index.html 的 url
   *
   * 默认 `window.location.origin + basename`
   *
   * 此配置会使 `basename` 配置失效
   */
  overrideHtmlUrl?: string | (() => string)

  /**
   * 覆写拉取 index.html 并解析出主 chunk 的 hash 的方法
   *
   * 此配置会使 `bashname`、`overrideHtmlUrl`、`chunkNames` 配置失效
   *
   * @returns 主 chunk 的 hash 字符串
   */
  overrideFetchHash?: () => Promise<string>

  /**
   * 覆写获取本地页面文件主 chunk 的 hash 的方法
   *
   * @returns 本地页面主 chunk 的 hash 字符串
   */
  overrideLocalHash?: () => string
}

const defaultCheckUpgradeOptions: Required<ICheckUpgradeCommonOptions> = {
  storageKey: 'useUpgrade',
  chunkNames: ['main', 'umi', 'app'],
  basename: '/',
  checkInterval: 120 * 1000,
  fetchInterval: 300 * 1000,
  skipMetaName: 'useUpgradeSkip',
  disablePageVisibleEmitter: false,
  disablePageReonlineEmitter: false,
  disablePageRouteEmitter: false,
}

const globalRegisterTag = '__checkUpgrade_register__'
const globalTriggerFnName = '__checkUpgrade_checkFn__'
const globalCancelFnName = '__checkUpgrade_cancelFn__'

const upgradeEventName = '__checkUpgrade_event__'

const noop = () => {}

interface IStorageData {
  hash?: string
  lastFetchTime?: number
}

/**
 * 检查新版本
 * @param isSendRequest 是否请求 index.html
 */
export function triggerCheckUpgrade(isSendRequest?: boolean) {
  const fn = window[globalTriggerFnName]

  if (fn) {
    fn(isSendRequest)
  }
}

/**
 * 取消新版本检测
 */
export function cancelCheckUpgrade() {
  const fn = window[globalCancelFnName]

  if (fn) {
    fn()
  }
}

/**
 * 开启站点的新版本检测
 * @param callback 有新版本时的回调
 * @param options 配置项（可选）
 */
export function startCheckUpgrade(callback: () => void, options?: ICheckUpgradeOptions): void

/**
 * 开启站点的新版本检测
 * @param options 配置项（可选）
 */
export function startCheckUpgrade(options?: ICheckUpgradeOptions): void

/** 开启站点的新版本检测 */
export function startCheckUpgrade(): void

export function startCheckUpgrade(
  callbackOrOptions?: ICheckUpgradeOptions | (() => void),
  mustBeOptions?: ICheckUpgradeOptions
): void {
  const callback = typeof callbackOrOptions === 'function' ? callbackOrOptions : noop
  const options = typeof callbackOrOptions === 'object' ? callbackOrOptions : mustBeOptions

  if (window[globalRegisterTag]) {
    return
  }
  window[globalRegisterTag] = true

  let isCancel = false

  const {
    storageKey,
    chunkNames,
    basename,
    checkInterval,
    fetchInterval,
    skipMetaName,
    disablePageVisibleEmitter,
    disablePageReonlineEmitter,
    disablePageRouteEmitter,
    overrideHtmlUrl,
    overrideFetchHash,
    overrideLocalHash,
  } = {
    ...defaultCheckUpgradeOptions,
    ...options,
  }

  function getStorageData(): IStorageData {
    return JSON.parse(localStorage.getItem(storageKey) || '{}')
  }

  function setStorageData(data: Partial<IStorageData>) {
    localStorage.setItem(storageKey, JSON.stringify({ ...getStorageData(), ...data }))
  }

  const varHash = getCurrentDomHash() || ''
  let newHash = ''

  setStorageData({ hash: varHash })

  function getCurrentDomHash() {
    if (overrideLocalHash) {
      return overrideLocalHash()
    }

    const chunks = (Array.isArray(chunkNames) ? chunkNames : [chunkNames]).sort()
    const allHash = chunks.map(chunkName => {
      const node = window.document.querySelector<HTMLScriptElement>(`script[src*="/${chunkName}."]`)

      if (node) {
        const src = node.getAttribute('src') || ''
        const chunkRegExp = new RegExp(`\\/${chunkName}\\.([0-9a-f.]*)(.async)?\\.js`, 'g')

        const matchResult = chunkRegExp.exec(src)
        const mainChunkHashId = matchResult?.[1] || ''

        return mainChunkHashId
      }

      return ''
    })

    const result = allHash.join('')

    return result
  }

  async function fetchHtmlHash(): Promise<string> {
    if (overrideFetchHash) {
      return overrideFetchHash()
    }

    let url = overrideHtmlUrl || window.location.origin + basename

    if (typeof url === 'function') {
      url = url()
    }
    const htmlText = await fetch(`${url}?t=${new Date().getTime()}`).then(res => res.text())

    if (skipMetaName) {
      const skipTagRegExp = new RegExp(`<meta[ ]+name=['"]${skipMetaName}["']`, 'g')
      const shouldSkip = skipTagRegExp.test(htmlText)

      if (shouldSkip) {
        return getStorageData().hash || ''
      }
    }

    const chunks = (Array.isArray(chunkNames) ? chunkNames : [chunkNames]).sort()
    const allHash = chunks.map(chunkName => {
      const chunkRegExp = new RegExp(`\\/${chunkName}\\.([0-9a-f]*)\\.js"><\\/script>`, 'g')

      const matchResult = chunkRegExp.exec(htmlText)
      const mainChunkHashId = matchResult?.[1] || ''

      return mainChunkHashId
    })

    const result = allHash.join('')

    return result
  }

  function checkNewVersionByLocal(): boolean {
    const newLocalHash = getStorageData().hash || ''

    if (varHash !== newLocalHash) {
      if (newLocalHash !== newHash) {
        newHash = newLocalHash
        window.dispatchEvent(new Event(upgradeEventName))
        callback()
      }

      return true
    }

    return false
  }

  async function checkNewVersionByFetch(): Promise<boolean> {
    setStorageData({ lastFetchTime: new Date().getTime() - 50 })

    return fetchHtmlHash()
      .then(hash => {
        setStorageData({ hash })

        return checkNewVersionByLocal()
      })
      .catch(() => false)
  }

  function check() {
    if (isCancel) {
      return
    }

    const now = new Date().getTime()
    let { lastFetchTime } = getStorageData()

    if (!lastFetchTime) {
      lastFetchTime = now
      setStorageData({ lastFetchTime })
    }

    const hasNew = checkNewVersionByLocal()

    if (
      !hasNew &&
      fetchInterval > 0 &&
      lastFetchTime + fetchInterval < now &&
      document.visibilityState === 'visible'
    ) {
      checkNewVersionByFetch()
    }
  }

  function pageVisibleCallback() {
    if (document.visibilityState === 'visible') {
      check()
    }
  }
  if (!disablePageVisibleEmitter) {
    try {
      window.document.addEventListener('visibilitychange', pageVisibleCallback)
    } catch {}
  }

  function pageReonlineCallback() {
    if (window.navigator.onLine) {
      check()
    }
  }
  if (!disablePageReonlineEmitter) {
    try {
      window.addEventListener('online', pageReonlineCallback)
    } catch {}
  }

  let interval = -1

  if (checkInterval > 0) {
    interval = Number(setInterval(check, checkInterval))
  }

  if (!disablePageRouteEmitter) {
    try {
      const rawPushStateFn = window.history.pushState

      window.history.pushState = function pushState(state: any, title: any, url: any) {
        rawPushStateFn.call(this, state, title, url)
        check()
      }
    } catch {}
  }

  function globalTrigger(fetchHtml?: boolean) {
    if (fetchHtml) {
      checkNewVersionByFetch()
    } else {
      checkNewVersionByLocal()
    }
  }

  function cancel() {
    try {
      window.document.removeEventListener('visibilitychange', pageVisibleCallback)
      window.removeEventListener('online', pageReonlineCallback)
      clearInterval(interval)
      isCancel = true
    } catch {}
  }

  window[globalTriggerFnName] = globalTrigger
  window[globalCancelFnName] = cancel

  check()
}

/**
 * 获取当前站点是否有新版本
 * @param callback 有新版本检测到时，触发此回调
 * @returns 站点是否有新版本
 */
export function useUpgrade(callback?: () => void): boolean {
  const [hasNewVersion, setHasNewVersion] = useState(false)

  useEffect(() => {
    const upgradeHandler = () => {
      setHasNewVersion(true)

      if (typeof callback === 'function') {
        callback()
      }
    }

    window.addEventListener(upgradeEventName, upgradeHandler)

    return () => {
      window.removeEventListener(upgradeEventName, upgradeHandler)
    }
  }, [callback])

  return hasNewVersion
}
