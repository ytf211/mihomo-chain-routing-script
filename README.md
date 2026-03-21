# Mihomo Chain Routing Script

一个面向 Mihomo / Clash Meta 的 JavaScript 配置脚本，核心目标是把节点分成两层：

- `前置中转`：作为拨号出口使用的中转节点组
- `自建/家宽节点`：识别出的自建、家宽、CF、private 等节点，并自动挂载 `dialer-proxy`

这样可以实现“自建/家宽节点走前置中转”的链式分流，同时保留常规地区分组、自动测速、负载均衡和常见服务分流规则。

## 特性

- 自动补充 `🟢 直连` 节点
- 自动识别自建/家宽类节点并设置 `dialer-proxy: 前置中转`
- 按地区生成香港、新加坡、日本、台湾、美国、欧洲节点组
- 提供 `url-test`、`load-balance`、`fallback` 相关策略组
- 内置常见服务分流：Google、Telegram、GitHub、Discord、PayPal、OpenAI 等
- 内置 DNS、Fake-IP、Sniffer、Geo 数据自动更新配置

## 文件

- `mihomo-chain-routing.js`：主脚本文件

## 适用场景

适合以下场景：

- 你同时有“前置中转节点”和“自建/家宽节点”
- 你希望自建节点统一经由前置中转出站
- 你希望把服务分流、测速、区域组和链式拨号逻辑放到一个脚本里维护

## 使用方式

把 `mihomo-chain-routing.js` 作为脚本配置接入支持 JavaScript 配置处理的 Mihomo / Clash Meta 客户端或工作流，然后让客户端把当前配置对象传入 `main(config)`。

脚本会：

1. 读取现有 `config.proxies`
2. 自动插入 `🟢 直连`
3. 识别自建/家宽节点
4. 为符合条件的节点写入 `dialer-proxy`
5. 重建代理组、规则提供器和规则列表

## 自定义

如果你要调整识别逻辑，优先修改这些常量：

- `HOME_FILTER`
- `HOME_EXCLUDE_FILTER`
- `FRONT_GROUP_EXCLUDE`
- `HK_FILTER`
- `SG_FILTER`
- `JP_FILTER`
- `TW_FILTER`
- `US_FILTER`
- `EUROPE_FILTER`

如果你的节点命名风格不同，也可以直接修改：

- `HOME_NAME_TEST`
- `HOME_NAME_EXCLUDE_TEST`

## 规则来源

脚本内引用了以下规则或数据来源：

- MetaCubeX `meta-rules-dat`
- `Lanlan13-14/Rules`

使用前请确认你接受这些远程规则源的可用性和维护方式。

## 说明

这个仓库目前只包含单文件脚本，没有打包、构建或测试流程。适合作为个人配置仓库直接维护和版本化。
