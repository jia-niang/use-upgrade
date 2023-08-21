# `use-upgrade-webpack-plugin`

配合 `use-upgrade` 使用，令开发者可以手动跳过某次版本更新。

# 安装

```bash
yarn add use-upgrade-webpack-plugin -D
```

# 用法

配置 webpack，添加此插件：

```js
const UseUpgradeWebpackPlugin = require('use-upgrade-webpack-plugin')

// 简单的用法，直接开启
new UseUpgradeWebpackPlugin()

// 或
// 支持提供配置项
new UseUpgradeWebpackPlugin({
  // 是否默认跳过所有更新提示
  defaultSkip: false,

  // 默认无需配置
  // 但如果你配置了 `use-upgrade` 的 `skipMetaName` 配置项，那么这里需要保持一致
  skipMetaName: 'useUpgradeSkip',
})
```

配置项 `defaultSkip` 表示是否跳过版本更新提示，默认 `false` 表示每次更新都会提示用户。改为 `true` 后则默认不提示用户。

（推荐测试环境默认 `false` 即可，生产环境开启为 `true`。）

打包指令添加 `--no-upgrade` 可以强制跳过本次发布的新版本提示。

打包指令添加 `--use-upgrade` 可以强制开启本次发布的新版本提示。
