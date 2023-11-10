# `use-upgrade`

自动检测网站是否已发布了新版本，提示用户刷新。

# 安装

```bash
yarn add use-upgrade
```

# 简介

只需要在项目入口处添加一行 `startCheckUpgrade(...)` 即可自动开始检测新版本，一旦有新版本发布，便会调用回调。

此工具方法具备以下特点：

- 兼容 `React`、`Vue`、`Angular`、`Umi`、`Taro` 等项目，如有需求还可以自行拓展；
- 通过请求 `index.html` 判断是否有新版本发布，无需其他任何额外配置；
- 多个标签页打开时，只会同时发一个请求，而任一标签页收到更新可同步到其他标签页；
- 请求由路由导航、定时器等事件自动触发，网页处在后台、网页离线时不会发请求，减少网络开销；
- 采用异步设计，不会占用同步任务而影响性能，工具代码报错不会使项目受影响；
- 配置项丰富，几乎所有行为都能定制；
- 对于 React 项目，提供 hook 方法 `useUpgrade()` 用于获取新版本状态和注册副作用；
- 提供方法 `triggerCheckUpgrade()` 手动触发新版本检查；
- 提供方法 `cancelCheckUpgrade()` 停止运行。

# 使用示例

只需要在项目启动入口处调用方法即可：

```jsx
import { startCheckUpgrade } from 'use-upgrade'
import { Modal } from 'antd'

startCheckUpgrade(() => {
  Modal.info({
    title: '系统已更新',
    content: '请点击刷新按钮，加载新版本页面',
    okText: '刷新',
    onOk() {
      window.location.reload()
    },
  })
})
```

---

如果是 `Umi` 项目，请修改 `src/app.ts` 文件：

```jsx
import { startCheckUpgrade } from 'use-upgrade';
import { Modal } from 'antd';

export function render(oldRender: Function) {
  oldRender();

  startCheckUpgrade(() => {
    Modal.info({
      title: '系统已更新',
      content: '请点击刷新按钮，加载新版本页面',
      okText: '刷新',
      onOk() {
        window.location.reload();
      },
    });
  });
}
```

# React 应用

提供一个 `useUpgrade()`，它接受一个函数作为检测到新版本后的回调，且返回一个布尔值表示是否有新版本。

**注意，必须调用过 `startCheckUpgrade()`，此 hook 才能生效。**

使用示例：

```jsx
import { useUpgrade } from 'use-upgrade'

export default function HomePage() {
  // 用法一： 注册一个发现新版本时会执行的副作用函数
  useUpgrade(() => {
    console.log('发现新版本')
  })

  // 用法二： 使用返回值，表示当前是否检测到存在新版本
  const hasNewVersion = useUpgrade()

  return <div>是否有新版本：{hasNewVersion ? '是' : '否'}</div>
}
```


# 进阶使用

`startCheckUpgrade()` 有多种重载：

```jsx
import { startCheckUpgrade } from 'use-upgrade'
import { Modal } from 'antd'

// 直接调用，以默认配置运行
startCheckUpgrade()

// 或
// 提供一个回调，会在检测到新版本时执行它
startCheckUpgrade(() => {
  Modal.info({ title: '系统已更新' })
})

// 或
// 提供一个配置对象
startCheckUpgrade({
  // 在 localStorage 中存储的 KEY 名
  storageKey: 'myapp.update-check',

  // 网站如果部署在子目录上，请提供子目录路径
  basename: process.env.PUBLIC_URL,

  // ...
  // 更多参数请见下方 API 文档
})

// 或
// 既提供回调函数，又提供配置对象（顺序不能错）
startCheckUpgrade(
  () => {
    Modal.info({ title: '系统已更新' })
  },
  {
    storageKey: 'myapp.update-check',
    basename: process.env.PUBLIC_URL,
  }
)
```

# 原理与解释

SPA 项目只要是使用 Webpack 打包，就一定会存在一个 “主 chunk” 并插入到 `index.html` 中，格式形如 `<script defer="defer" src="/static/js/main.b5dd354f.js"></script>`。

注意这里的文件名 `main.b5dd354f.js`，其中 `main` 是 chunk 名，主 chunk 默认叫 `main`（React 项目、Angular 项目）、`umi`（Umi 项目）、`app`（Vue 项目、Taro 项目），后面的 `b5dd354f` 为文件哈希，只要项目中任一文件发生变动，主 chunk 的哈希值一定会发生变化。

因此只要定期拉取最新的 `index.html`，使用正则表达式等方式取出最新主 chunk 的哈希，并与当前文件中主 chunk 的哈希进行比对即可判断站点是否有新版本发布。

因为 `localStorage` 可以跨标签页，所以可以利用它来在多个标签页之间同步最新版本，无需每个标签页都去请求 `index.html`。

---

推荐网站配置 nginx，避免 `index.html` 这个文件有缓存。配置方式示例：

```
location / {
  alias /path/to/your/website;
  try_files $uri @my-website;
  index index.html;
}

location @my-website {
  root /path/to/your/website;
  try_files /index.html =404;
  add_header Cache-Control "private, no-cache, max-age=0";
}
```

---

# API 文档

## `startCheckUpgrade`

启动站点新版本检测。

方法签名 `startCheckUpgrade(callback [, options])`：

- 参数 `callback` 检测到网站有新版本时，会调用此回调。
- 参数 `options` 可选的配置项，参见下方表格：

| 属性                       | 说明                                                                                               | 类型                    | 默认值                              |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------- |
| storageKey                 | 本地 localStorage 使用的 Key                                                                       | string                  | `"useUpgrade"`                      |
| chunkNames                 | 需要检测的主 chunk 名，支持多个                                                                    | string / string[]       | `['main', 'umi', 'app']`            |
| basename                   | 如果网站部署在子目录（subpath）上，传入此参数表示子目录                                            | string                  | -                                   |
| checkInterval              | 本地新版本检查的间隔时间（毫秒），若为 `0` 则停止本地检查                                          | number                  | `120 * 1000`                        |
| fetchInterval              | 请求 `index.html` 的间隔时间（毫秒），若为 `0` 则停止请求                                          | number                  | `300 * 1000`                        |
| skipMetaName               | 新的 html 中如果存在带有此 name 属性的 `<meta>` 标签，则跳过本次版本更新，设为 `null` 可关闭此功能 | string / null           | `"useUpgradeSkip"`                  |
| disablePageVisibleEmitter  | 是否禁用网站切换到前台时自动检查                                                                   | boolean                 | `false`                             |
| disablePageReonlineEmitter | 是否禁用网站从离线切换到在线时自动检查                                                             | boolean                 | `false`                             |
| disablePageRouteEmitter    | 是否禁用网站路由导航时自动检查                                                                     | boolean                 | `false`                             |
| overrideHtmlUrl            | 覆写请求 index.html 的 url，配置此项会使 `basename` 失效                                           | string / `() => string` | `window.location.origin + basename` |
| overrideFetchHash          | 覆写拉取 index.html 并解析出主 chunk 的 hash 的方法                                                | `() => Promise<string>` | -                                   |
| overrideLocalHash          | 覆写获取本地页面文件主 chunk 的 hash 的方法                                                        | `() => string`          | -                                   |

## `useUpgrade`

用于 React 的 FC 组件的 hook 函数，既可以获知当前是否有新版本，也可以用于注册收到新版本时的副作用。

方法签名 `useUpgrade([upgradeEffect]): boolean`：

- 返回 `boolean` 表示当前是否检测到了新版本；
- 参数 `upgradeEffect` 是一个可选的回调函数，如果检测到新版本，会调用此回调。

## `triggerCheckUpgrade`

用于强制触发新版本的检测。

方法签名 `triggerCheckUpgrade([isSendRequest = false])`：

- 参数 `isSendRequest` 是一个布尔值；此方法检查新版本默认是不会发请求拉取最新 `index.html` 的，将参数设为 `true` 时则会立即请求 `index.html` 来判断版本。

## `cancelCheckUpgrade`

用于停止站点新版本检测。

方法签名 `cancelCheckUpgrade()`，调用后，停止站点新版本检测。
