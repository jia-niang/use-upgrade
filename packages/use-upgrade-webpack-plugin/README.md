# `use-upgrade-webpack-plugin`

配合 `use-upgrade` [![npm](https://img.shields.io/npm/v/use-upgrade)](https://www.npmjs.com/package/use-upgrade) 使用，令开发者可以通过命令行参数，来跳过某次版本更新的提示，避免微型补丁发布时过度打扰用户。

# 安装

```bash
yarn add use-upgrade-webpack-plugin -D
```

# 用法

配置 webpack，添加此插件：

```js
const UseUpgradeWebpackPlugin = require('use-upgrade-webpack-plugin')

module.exports = {
  plugins: [
    // 简单的用法，直接开启
    new UseUpgradeWebpackPlugin(),

    // 或

    // 传入一个对象以提供配置项
    new UseUpgradeWebpackPlugin({
      // 是否默认跳过所有更新提示
      defaultSkip: false,

      // 默认无需配置
      // 但如果你配置了 `use-upgrade` 的 `skipMetaName` 配置项，那么这里需要保持一致
      skipMetaName: 'useUpgradeSkip',
    }),
  ],
}
```

默认每次发布新版本，`use-upgrade` 都会触发，提示用户新版本更新。你也可以提供 `defaultSkip: true` 配置来改为每次发布都不触发，在需要提示用户时手动传参来开启。

打包指令添加 `--no-upgrade` 可以强制跳过本次发布的新版本提示。  
例如某次版本发布是微型补丁，不需要给用户强提示，则可以开启这个参数，本次发版 `use-upgrade` 不生效。

打包指令添加 `--use-upgrade` 可以强制开启本次发布的新版本提示。

# API 文档

## `UseUpgradeWebpackPlugin([options])`

插件的构造函数。

- 参数 `options`是可选的配置项，参见下方表格：

| 属性         | 说明                                                                                                                           | 类型    | 默认值             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------ |
| defaultSkip  | 是否默认跳过所有的版本更新提示，也就是每次发版只有提供打包指令带 `--use-upgrade` 参数才会使 `use-upgrade` 生效，否则都不会生效 | boolean | `false`            |
| skipMetaName | 如果你修改了 `use-upgrade` 的 `skipMetaName` 配置项，那么此处请保持一致，否则本插件无法生效                                    | string  | `"useUpgradeSkip"` |
