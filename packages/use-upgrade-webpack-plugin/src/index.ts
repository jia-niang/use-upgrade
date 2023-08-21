/** 使用 `UseUpgradeWebpackPlugin` 的配置项 */
export interface IUseUpgradeWebpackPluginOptions {
  /**
   * 是否默认跳过每次发布的更新提示。
   *
   * 默认 `false`
   *
   * 设为 `true` 后则发布时必须添加 `--use-upgrade` 参数，本次发布才会提示用户网站升级
   */
  defaultSkip?: boolean

  /**
   * 通常无需配置。
   *
   * 如果你使用 `use-upgrade` 时修改了 `skipMetaName` 配置，请在此处提供相同的配置
   *
   * 默认 `"useUpgradeSkip"`
   */
  skipMetaName?: string
}

const defaultUseUpgradeWebpackPluginOptions: IUseUpgradeWebpackPluginOptions = {
  defaultSkip: false,
  skipMetaName: 'useUpgradeSkip',
}

const emptyOptions: Partial<IUseUpgradeWebpackPluginOptions> = {}

const manualSkipParam = 'no-upgrade'
const manualEnableParam = 'use-upgrade'

/** 配合 `use-upgrade` 使用，可以选择性的跳过某些版本发布时的更新提示 */
export default class UseUpgradeWebpackPlugin {
  options: IUseUpgradeWebpackPluginOptions = emptyOptions

  constructor(options?: IUseUpgradeWebpackPluginOptions) {
    this.options = { ...defaultUseUpgradeWebpackPluginOptions, ...options }
  }

  apply(compiler: any) {
    const { options } = this
    if (options.skipMetaName === null) {
      return
    }

    const argvs = process.argv
    const includeSkipParam = argvs.includes('--' + manualSkipParam)
    const includeEnableParam = argvs.includes('--' + manualEnableParam)

    const shouldSkip = (options.defaultSkip && !includeEnableParam) || includeSkipParam
    if (shouldSkip) {
      return
    }

    compiler.hooks.emit.tap('UseUpgradeWebpackPlugin', (compilation: any) => {
      const html = compilation.assets['index.html']
      const updatedHtml = html
        .source()
        .replace(/<head>/, `<head><meta name="${this.options.skipMetaName}">`)
      compilation.assets['index.html'] = {
        source: () => updatedHtml,
        size: () => updatedHtml.length,
      }
    })
  }
}

module.exports = UseUpgradeWebpackPlugin
