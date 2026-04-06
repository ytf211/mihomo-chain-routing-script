// ============================================================
// mihomo 覆写脚本 - 链式路由 + 精细分流
// ============================================================

// ====================
// 0. 手动直连域名
// ====================
const BYPASS_DOMAINS = [
    "example.com", "example1.com"
];

// ====================
// 1. 常量配置
// ====================

const DIRECT_PROXY_NAME = "🟢 直连";
const FRONT_GROUP_NAME = "前置中转";
const HOME_GROUP_NAME = "自建/家宽节点";

// GitHub Raw → jsDelivr CDN 镜像前缀
const GITHUB_RAW = "https://raw.githubusercontent.com/";
const GITHUB_DL = "https://github.com/";
const MIRROR = "https://cdn.jsdelivr.net/gh/";
//const MIRROR = "https://fastly.jsdelivr.net/gh/";

// 家宽 / 信息节点关键词
const HOME_KW = "自建|\\bCF\\b|The_house|\\bprivate\\b|home|家宽|hgc|HKT|HKBN|icable|Hinet|\\batt\\b";
const INFO_KW = "群|邀请|返利|官网|官方|网址|订阅|购买|续费|剩余|到期|过期|流量|备用|邮箱|客服|联系|工单|倒卖|防止|梯子|tg群|电报群|发布|重置";

// JS 正则：dialer-proxy 判断 / 信息节点过滤
const HOME_RE = /(自建|\bCF\b|The_house|\bprivate\b|home|家宽|hgc|HKT|HKBN|icable|Hinet|\batt\b)/i;
const HOME_EX_RE = /Seattle/i;
const INFO_RE = new RegExp(INFO_KW.replace(/\\b/g, "\\b"), "i");

// mihomo filter / exclude-filter
const HOME_FILTER = `(?i)(${HOME_KW})`;
const HOME_EXCLUDE = "(?i)(Seattle)";
const SPECIAL_EX = `(?i)(🟢 直连|${INFO_KW})`;
const FRONT_EX = `(?i)(${HOME_KW}|${INFO_KW})`;
const REGION_EX = `(?i)(${HOME_KW}|🟢 直连|${INFO_KW})`;

// 地区正则
const HK_F = "(?i)(香港|港|Hong Kong|hongkong|\\bHK\\b|🇭🇰)";
const SG_F = "(?i)(新加坡|狮城|Singapore|\\bSG\\b|🇸🇬)";
const SG_EX = "(?i)(新西兰|New Zealand|\\bNZ\\b|澳新)";
const JP_F = "(?i)(日本|Japan|\\bJP\\b|🇯🇵)";
const TW_F = "(?i)(台湾|台灣|Taiwan|\\bTW\\b|🇹🇼)";
const US_F = "(?i)(美国|美|United States|America|\\bUS\\b|Los Angeles|Chicago|Ashburn|Seattle|Kansas|🇺🇸)";
const US_EX = "(?i)(Australia|\\bAU\\b|\\bAUS\\b|Sydney|Melbourne|Russia|\\bRUS\\b|Moscow|莫斯科)";
const EU_F = "(?i)(🇦🇱|🇦🇩|🇦🇹|🇧🇾|🇧🇪|🇧🇦|🇧🇬|🇭🇷|🇨🇾|🇨🇿|🇩🇰|🇪🇪|🇫🇮|🇫🇷|🇩🇪|🇬🇷|🇭🇺|🇮🇸|🇮🇪|🇮🇹|🇽🇰|🇱🇻|🇱🇮|🇱🇹|🇱🇺|🇲🇹|🇲🇩|🇲🇨|🇲🇪|🇳🇱|🇲🇰|🇳🇴|🇵🇱|🇵🇹|🇷🇴|🇷🇺|🇸🇲|🇷🇸|🇸🇰|🇸🇮|🇪🇸|🇸🇪|🇨🇭|🇹🇷|🇺🇦|🇬🇧|🇻🇦|EU|Europe|欧洲|Germany|Deutschland|德国|France|法国|United Kingdom|England|英国|Netherlands|荷兰|Switzerland|瑞士|Italy|意大利|Spain|西班牙|Poland|波兰|Sweden|瑞典|Norway|挪威|Finland|芬兰|Denmark|丹麦|Austria|奥地利|Belgium|比利时|Ireland|爱尔兰|Portugal|葡萄牙|Greece|希腊|Czech|捷克|Hungary|匈牙利|Romania|罗马尼亚|Bulgaria|保加利亚|Croatia|克罗地亚|Slovakia|斯洛伐克|Lithuania|立陶宛|Slovenia|斯洛文尼亚|Latvia|拉脱维亚|Estonia|爱沙尼亚|Luxembourg|卢森堡|Iceland|冰岛|Turkey|土耳其|Ukraine|乌克兰|Russia|俄罗斯|Moscow|莫斯科|Saint Petersburg|圣彼得堡|London|Frankfurt|Paris|Amsterdam|Madrid|Milan|Stockholm|Oslo|Copenhagen|Vienna|Brussels|Dublin|Lisbon|Athens|Prague|Budapest|Bucharest|Sofia|Zagreb|Bratislava)";

const NO_DIALER = new Set(["direct", "reject", "reject-drop", "pass", "compatible"]);

const BASE_PROXIES = [
    "节点选择", "香港节点", "新加坡节点", "日本节点", "台湾节点", "美国节点", "欧洲节点",
    "全部节点", HOME_GROUP_NAME, "全球直连",
];
const FRONT_PROXIES = ["香港节点", "新加坡节点", "日本节点", "台湾节点", "美国节点", "欧洲节点"];

// ====================
// 2. 工具函数
// ====================

const mergeEx = (...f) => f.filter(Boolean).join("|");

/** GitHub Raw / Download URL → jsDelivr CDN 镜像 */
function mirror(url) {
    // 格式 A: raw.githubusercontent.com/Owner/Repo/refs/heads/Branch/path
    // 格式 B: raw.githubusercontent.com/Owner/Repo/Branch/path
    if (url.startsWith(GITHUB_RAW)) {
        const p = url.slice(GITHUB_RAW.length);
        // 先处理 refs/heads 格式
        const a = p.replace(/^([^/]+\/[^/]+)\/refs\/heads\/([^/]+)\//, "$1@$2/");
        if (a !== p) return MIRROR + a;
        // 再处理普通格式：Owner/Repo/Branch/path → Owner/Repo@Branch/path
        return MIRROR + p.replace(/^([^/]+\/[^/]+)\/([^/]+)\//, "$1@$2/");
    }
    // 格式 C: github.com/Owner/Repo/raw/refs/heads/Branch/path
    if (url.startsWith(GITHUB_DL)) {
        const p = url.slice(GITHUB_DL.length);
        const a = p.replace(/^([^/]+\/[^/]+)\/raw\/refs\/heads\/([^/]+)\//, "$1@$2/");
        if (a !== p) return MIRROR + a;
        return MIRROR + p.replace(/^([^/]+\/[^/]+)\/raw\/([^/]+)\//, "$1@$2/");
    }
    return url;
}
/** 创建 rule-provider */
function rp(behavior, url) {
    return {
        type: "http",
        interval: 86400,
        behavior,
        format: "mrs",
        url: mirror(url)
    };
}

function addIfMissing(arr, proxy) {
    if (!arr.some((p) => p && p.name === proxy.name)) arr.push(proxy);
}

/** 节点名去重 */
function dedup(proxies) {
    const used = new Set(),
        idx = new Map();
    proxies.forEach((p) => {
        if (!p || !p.name) return;
        const b = String(p.name);
        if (!used.has(b)) {
            used.add(b);
            idx.set(b, 1);
            return;
        }
        let i = idx.get(b) || 1,
            c = `${b}_${i}`;
        while (used.has(c)) c = `${b}_${++i}`;
        p.name = c;
        used.add(c);
        idx.set(b, i + 1);
    });
}

/** 分离信息节点 */
function splitInfo(proxies) {
    const normal = [],
        info = [];
    proxies.forEach((p) => {
        if (!p || !p.name) return;
        (INFO_RE.test(p.name) ? info : normal).push(p);
    });
    return {
        normal,
        info
    };
}

/** 家宽节点添加 dialer-proxy */
function applyDialer(proxies) {
    return proxies.map((p) => {
        if (!p || !p.name) return p;
        if (NO_DIALER.has(String(p.type || "").toLowerCase())) return p;
        if (p.name === DIRECT_PROXY_NAME) return p;
        if (HOME_RE.test(p.name) && !HOME_EX_RE.test(p.name)) return {
            ...p,
            "dialer-proxy": FRONT_GROUP_NAME
        };
        return p;
    });
}

// ====================
// 3. 策略组构建
// ====================

function svcGroup(name, extra) {
    return {
        name,
        type: "select",
        proxies: [...BASE_PROXIES],
        ...(extra || {})
    };
}

function regionGroup(name, bfb, lb, filter, ex) {
    const g = {
        name,
        type: "select",
        proxies: [bfb, lb],
        "include-all": true
    };
    if (filter) g.filter = filter;
    if (ex) g["exclude-filter"] = ex;
    return g;
}

function loadBalance(name, filter, ex) {
    const g = {
        name,
        type: "load-balance",
        hidden: true,
        "include-all": true,
        url: "https://www.gstatic.com/generate_204",
        timeout: 3000,
        interval: 300,
        lazy: true,
        strategy: "consistent-hashing",
    };
    if (filter) g.filter = filter;
    if (ex) g["exclude-filter"] = ex;
    return g;
}

/** BetterFB: 高容差 url-test，兼顾稳定性与智能选择 */
function betterFb(name, filter, ex) {
    const g = {
        name,
        type: "url-test",
        hidden: true,
        "include-all": true,
        url: "https://www.gstatic.com/generate_204",
        timeout: 3000,
        interval: 300,
        tolerance: 3000,
        lazy: true,
        "max-failed-times": 3,
    };
    if (filter) g.filter = filter;
    if (ex) g["exclude-filter"] = ex;
    return g;
}

// ====================
// 4. 主函数
// ====================

const main = (config) => {
    // --- 4.1 全局设置 ---
    Object.assign(config, {
        ipv6: true,
        "unified-delay": true,
        "tcp-concurrent": true,
        "find-process-mode": "always",
        "keep-alive-idle": 15,
        "keep-alive-interval": 15,
    });
    config.profile = {
        "store-selected": true,
        "store-fake-ip": false
    };

    // --- 4.2 Sniffer ---
    config.sniffer = {
        enable: true,
        "force-dns-mapping": true,
        "parse-pure-ip": true,
        sniff: {
            HTTP: {
                ports: ["80", "8080-8880"],
                "override-destination": false
            },
            TLS: {
                ports: ["443", "8443"]
            },
            QUIC: {
                ports: ["443", "8443"]
            },
        },
        "force-domain": ["+.v2ex.com"],
        "skip-domain": [
            "Mijia Cloud", "dlg.io.mi.com",
            "+.push.apple.com", "+.apple.com", "+.wechat.com", "+.qpic.cn", "+.qq.com",
            "+.wechatapp.com", "+.vivox.com", "+.douyinpic.com", "+.douyincdn.com",
            "+.oray.com", "+.sunlogin.net",
        ],
        "skip-dst-address": [
            "2600:1417::/32", // Akamai CDN
            "2409:8000::/20", // 中国移动 IPv6
            "240e::/16", // 中国电信 IPv6
            "2408:8000::/20", // 中国联通 IPv6
        ],
    };

    // --- 4.3 GeoData ---
    Object.assign(config, {
        "geodata-mode": true,
        "geodata-loader": "standard",
        "geo-auto-update": true,
        "geo-update-interval": 48,
    });
    config["geox-url"] = {
        geosite: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
        mmdb: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.metadb",
        geoip: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat",
        asn: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/GeoLite2-ASN.mmdb",
    };

    // --- 4.4 DNS ---
    const directDns = ["https://doh.pub/dns-query#DIRECT", "https://223.5.5.5/dns-query#DIRECT"];
    const proxyDns = (tag) => [`https://dns.google/dns-query#${tag}`, `https://dns.cloudflare.com/dns-query#${tag}`];

    config.dns = {
        enable: true,
        ipv6: true,
        "cache-algorithm": "arc",
        "prefer-h3": false,
        "respect-rules": true,
        "enhanced-mode": "fake-ip",
        "fake-ip-range": "198.18.0.1/16",
        "fake-ip-filter-mode": "blacklist",
        "fake-ip-filter": [
            "rule-set:fakeip_filter_domain", "rule-set:game_cn_domain", "rule-set:bank_cn_domain",
            "rule-set:wechat_domain", "rule-set:douyin_domain", "rule-set:ai_cn_domain",
            "rule-set:NetEaseMusic_domain", "rule-set:fcm_domain", "rule-set:alibaba_domain",
            "rule-set:media_cn_domain", "rule-set:xiaomi_domain", "rule-set:steam_cn_domain",
            "rule-set:pt_cn_domain", "rule-set:public-tracker_domain", "rule-set:115_domain",
            "rule-set:aliyun_domain", "rule-set:direct_domain", "rule-set:apple_cn_domain",
            "rule-set:iptv_domain", "rule-set:private_domain", "rule-set:cn_domain",
        ],
        "default-nameserver": ["119.29.29.29", "223.5.5.5"],
        "proxy-server-nameserver": directDns,
        "direct-nameserver": directDns,
        "direct-nameserver-follow-policy": true,
        nameserver: proxyDns("节点选择"),
        "nameserver-policy": {
            "rule-set:cn_domain,private_domain,apple_cn_domain,alibaba_domain,aliyun_domain,xiaomi_domain,direct_domain,wechat_domain,douyin_domain,bank_cn_domain,ai_cn_domain,steam_cn_domain,game_cn_domain,media_cn_domain,pt_cn_domain,iptv_domain,ifast_domain": directDns,
            "rule-set:115_domain": directDns,
            "rule-set:NetEaseMusic_domain": directDns,
            "rule-set:public-tracker_domain": directDns,
            "rule-set:ai!cn_domain,ai_domain,openai_domain": proxyDns("AI"),
            "rule-set:google_domain,youtube_domain,fcm_domain,googlevpn_domain": ["https://dns.google/dns-query#Google"],
            "rule-set:telegram_domain": proxyDns("Telegram"),
            "rule-set:github_domain,gitbook_domain": proxyDns("GitHub"),
            "rule-set:discord_domain": proxyDns("Discord"),
            "rule-set:microsoft_domain": proxyDns("Microsoft"),
            "rule-set:onedrive_domain": proxyDns("OneDrive"),
        },
    };

    // --- 4.5 节点处理 ---
    if (!config.proxies) config.proxies = [];
    addIfMissing(config.proxies, {
        name: DIRECT_PROXY_NAME,
        type: "direct",
        udp: true
    });
    dedup(config.proxies);

    const {
        normal,
        info
    } = splitInfo(config.proxies);
    config.proxies = applyDialer(normal);
    if (info.length) config.proxies.push(...info);

    // --- 4.6 exclude-filter ---
    const hkEx = REGION_EX;
    const sgEx = mergeEx(REGION_EX, SG_EX);
    const jpEx = REGION_EX;
    const twEx = REGION_EX;
    const usEx = mergeEx(REGION_EX, US_EX);
    const euEx = REGION_EX;

    // --- 4.7 策略组 ---
    config["proxy-groups"] = [
        // 顶层（默认 BetterFB，高容差自动选择）
        {
            name: "节点选择",
            type: "select",
            proxies: ["全局BetterFB", "手动选择",
                "香港节点", "新加坡节点", "日本节点", "台湾节点", "美国节点", "欧洲节点",
                "全部节点", HOME_GROUP_NAME
            ],
        },
        {
            name: "手动选择",
            type: "select",
            "include-all": true,
            "exclude-filter": SPECIAL_EX
        },

        // 服务分流
        svcGroup("LinuxDo"),
        svcGroup("Google"),
        svcGroup("Telegram"),
        svcGroup("GitHub"),
        svcGroup("OneDrive"),
        svcGroup("Microsoft"),
        svcGroup("Discord"),
        svcGroup("Cloudflare"),
        svcGroup("PayPal"),
        svcGroup("AI", {
            "include-all": true,
            "exclude-filter": SPECIAL_EX
        }),
        svcGroup("Speedtest", {
            "include-all": true,
            "exclude-filter": SPECIAL_EX
        }),
        svcGroup("漏网之鱼", {
            "include-all": true,
            "exclude-filter": SPECIAL_EX
        }),

        // 直连 & 拦截
        {
            name: "全球直连",
            type: "select",
            proxies: [DIRECT_PROXY_NAME, "全部节点"]
        },
        {
            name: "隐私拦截",
            type: "select",
            proxies: ["REJECT", "REJECT-DROP", DIRECT_PROXY_NAME]
        },

        // 链式路由
        {
            name: FRONT_GROUP_NAME,
            type: "select",
            proxies: [...FRONT_PROXIES],
            "include-all": true,
            "exclude-filter": FRONT_EX
        },
        {
            name: HOME_GROUP_NAME,
            type: "select",
            "include-all": true,
            filter: HOME_FILTER,
            "exclude-filter": HOME_EXCLUDE
        },

        // 地区选择（默认 BetterFB + 均衡 + 手动节点）
        regionGroup("香港节点", "香港BetterFB", "香港均衡", HK_F, hkEx),
        regionGroup("新加坡节点", "新加坡BetterFB", "新加坡均衡", SG_F, sgEx),
        regionGroup("日本节点", "日本BetterFB", "日本均衡", JP_F, jpEx),
        regionGroup("台湾节点", "台湾BetterFB", "台湾均衡", TW_F, twEx),
        regionGroup("美国节点", "美国BetterFB", "美国均衡", US_F, usEx),
        {
            name: "欧洲节点",
            type: "select",
            proxies: ["全部节点"],
            "include-all": true,
            filter: EU_F,
            "exclude-filter": euEx
        },
        {
            name: "全部节点",
            type: "select",
            "include-all": true,
            "exclude-filter": SPECIAL_EX
        },

        // 隐藏组：全局 BetterFB
        betterFb("全局BetterFB", undefined, SPECIAL_EX),

        // 隐藏组：地区均衡
        loadBalance("香港均衡", HK_F, hkEx), loadBalance("新加坡均衡", SG_F, sgEx),
        loadBalance("日本均衡", JP_F, jpEx), loadBalance("台湾均衡", TW_F, twEx),
        loadBalance("美国均衡", US_F, usEx),

        // 隐藏组：地区 BetterFB
        betterFb("香港BetterFB", HK_F, hkEx), betterFb("新加坡BetterFB", SG_F, sgEx),
        betterFb("日本BetterFB", JP_F, jpEx), betterFb("台湾BetterFB", TW_F, twEx),
        betterFb("美国BetterFB", US_F, usEx),
    ];

    // 信息节点组
    if (info.length) {
        config["proxy-groups"].push({
            name: "📋 订阅信息",
            type: "select",
            hidden: true,
            proxies: info.map((p) => p.name),
        });
    }

    // --- 4.8 rule-providers ---
    // 缩写: D=domain, IP=ipcidr, M=MetaCubeX base, L=Lanlan13-14 base
    const M = "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo";
    const M2 = "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo"; // 部分旧路径
    const L = "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules";

    config["rule-providers"] = {
        banAd_domain: rp("domain", `${L}/Domain/banAd_mini.mrs`),
        private_domain: rp("domain", `${M}/geosite/private.mrs`),
        private_ip: rp("ipcidr", `${M}/geoip/private.mrs`),
        wechat_domain: rp("domain", `${L}/Domain/WeChat.mrs`),
        wechat_asn: rp("ipcidr", `${L}/IP/AS132203.mrs`),
        douyin_domain: rp("domain", `${M}/geosite/douyin.mrs`),
        bank_cn_domain: rp("domain", `${M}/geosite/category-bank-cn.mrs`),
        ai_cn_domain: rp("domain", `${M}/geosite/category-ai-cn.mrs`),
        alibaba_domain: rp("domain", `${M}/geosite/alibaba.mrs`),
        aliyun_domain: rp("domain", `${M}/geosite/aliyun.mrs`),
        xiaomi_domain: rp("domain", `${M}/geosite/xiaomi.mrs`),
        apple_cn_domain: rp("domain", `${M}/geosite/apple%40cn.mrs`),
        direct_domain: rp("domain", `${L}/Domain/direct.mrs`),
        "115_domain": rp("domain", `${M}/geosite/115.mrs`),
        ifast_domain: rp("domain", `${M}/geosite/ifast.mrs`),
        iptv_domain: rp("domain", `${L}/Domain/iptv.mrs`),
        steam_cn_domain: rp("domain", `${M}/geosite/steam%40cn.mrs`),
        steamcdn_domain: rp("domain", `${L}/Domain/Steam-domain.mrs`),
        steamcdn_ip: rp("ipcidr", `${L}/IP/steamCDN-ip.mrs`),
        NetEaseMusic_domain: rp("domain", `${L}/Domain/NetEaseMusic-domain.mrs`),
        NetEaseMusic_ip: rp("ipcidr", `${L}/IP/NetEaseMusic-ip.mrs`),
        pt_cn_domain: rp("domain", `${M}/geosite/category-pt.mrs`),
        "public-tracker_domain": rp("domain", `${M}/geosite/category-public-tracker.mrs`),
        game_cn_domain: rp("domain", `${M}/geosite/category-games%40cn.mrs`),
        fakeip_filter_domain: rp("domain", `${L}/Domain/fakeip-filter.mrs`),
        media_cn_domain: rp("domain", `${M}/geosite/category-media-cn.mrs`),
        proxy_domain: rp("domain", `${L}/Domain/proxy.mrs`),
        speedtest_domain: rp("domain", `${M2}/geosite/ookla-speedtest.mrs`),
        Cloudflare_domain: rp("domain", `${M}/geosite/cloudflare.mrs`),
        "ai!cn_domain": rp("domain", `https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/category-ai-!cn.mrs`),
        ai_domain: rp("domain", `${L}/Domain/ai.mrs`),
        openai_domain: rp("domain", `${M}/geosite/openai.mrs`),
        googlevpn_domain: rp("domain", `${L}/Domain/googleVPN.mrs`),
        youtube_domain: rp("domain", `${M2}/geosite/youtube.mrs`),
        fcm_domain: rp("domain", `${M}/geosite/googlefcm.mrs`),
        google_domain: rp("domain", `${M}/geosite/google.mrs`),
        google_ip: rp("ipcidr", `${M2}/geoip/google.mrs`),
        google_asn_cn: rp("ipcidr", `${L}/IP/AS24424.mrs`),
        github_domain: rp("domain", `${M2}/geosite/github.mrs`),
        gitbook_domain: rp("domain", `${M}/geosite/gitbook.mrs`),
        telegram_domain: rp("domain", `${M2}/geosite/telegram.mrs`),
        telegram_ip: rp("ipcidr", `${M2}/geoip/telegram.mrs`),
        onedrive_domain: rp("domain", `${M2}/geosite/onedrive.mrs`),
        microsoft_domain: rp("domain", `${M2}/geosite/microsoft.mrs`),
        discord_domain: rp("domain", `${M}/geosite/discord.mrs`),
        discord_asn: rp("ipcidr", `${L}/IP/AS49544.mrs`),
        paypal_domain: rp("domain", `${M2}/geosite/paypal.mrs`),
        gfw_domain: rp("domain", `${M2}/geosite/gfw.mrs`),
        "geolocation-!cn": rp("domain", `${M2}/geosite/geolocation-!cn.mrs`),
        cn_domain: rp("domain", `${M2}/geosite/cn.mrs`),
        cn_ip: rp("ipcidr", `${M2}/geoip/cn.mrs`),
    };

    // --- 4.9 分流规则 ---
    config.rules = [
        // 广告拦截
        "RULE-SET,banAd_domain,隐私拦截",

        // 私有网络
        "RULE-SET,private_domain,全球直连",
        "RULE-SET,private_ip,全球直连,no-resolve",

        // 手动直连域名
        ...BYPASS_DOMAINS.filter(Boolean).map((d) => `DOMAIN-SUFFIX,${d.trim()},全球直连`),

        // 国内应用直连
        "RULE-SET,wechat_domain,全球直连",
        "RULE-SET,wechat_asn,全球直连,no-resolve",
        "RULE-SET,douyin_domain,全球直连",
        "RULE-SET,bank_cn_domain,全球直连",
        "RULE-SET,ai_cn_domain,全球直连",
        "RULE-SET,alibaba_domain,全球直连",
        "RULE-SET,aliyun_domain,全球直连",
        "RULE-SET,xiaomi_domain,全球直连",
        "RULE-SET,apple_cn_domain,全球直连",
        "RULE-SET,direct_domain,全球直连",
        "RULE-SET,115_domain,全球直连",
        "RULE-SET,ifast_domain,全球直连",
        "RULE-SET,iptv_domain,全球直连",
        "RULE-SET,steam_cn_domain,全球直连",
        "RULE-SET,steamcdn_domain,全球直连",
        "RULE-SET,steamcdn_ip,全球直连,no-resolve",
        "RULE-SET,NetEaseMusic_domain,全球直连",
        "RULE-SET,NetEaseMusic_ip,全球直连,no-resolve",
        "RULE-SET,pt_cn_domain,全球直连",
        "RULE-SET,public-tracker_domain,全球直连",
        "RULE-SET,game_cn_domain,全球直连",
        "RULE-SET,media_cn_domain,全球直连",

        // LinuxDo
        "DOMAIN-SUFFIX,hybgzs.com,LinuxDo",
        "DOMAIN-SUFFIX,linux.do,LinuxDo",

        // AI
        "RULE-SET,ai!cn_domain,AI",
        "RULE-SET,ai_domain,AI",
        "RULE-SET,openai_domain,AI",

        // Google
        "RULE-SET,googlevpn_domain,Google",
        "PROCESS-NAME,com.android.vending,Google",
        "RULE-SET,youtube_domain,Google",
        "RULE-SET,fcm_domain,Google",
        "RULE-SET,google_domain,Google",
        "RULE-SET,google_asn_cn,Google,no-resolve",
        "RULE-SET,google_ip,Google,no-resolve",

        // Telegram
        "RULE-SET,telegram_domain,Telegram",
        "RULE-SET,telegram_ip,Telegram,no-resolve",

        // GitHub
        "RULE-SET,github_domain,GitHub",
        "RULE-SET,gitbook_domain,GitHub",

        // Microsoft
        "RULE-SET,onedrive_domain,OneDrive",
        "RULE-SET,microsoft_domain,Microsoft",

        // Discord
        "RULE-SET,discord_domain,Discord",
        "RULE-SET,discord_asn,Discord,no-resolve",

        // 其他服务
        "RULE-SET,paypal_domain,PayPal",
        "RULE-SET,speedtest_domain,Speedtest",
        "RULE-SET,Cloudflare_domain,Cloudflare",

        // 代理兜底
        "RULE-SET,proxy_domain,节点选择",
        "RULE-SET,gfw_domain,节点选择",
        "RULE-SET,geolocation-!cn,节点选择",

        // 国内兜底
        "RULE-SET,cn_domain,全球直连",
        "RULE-SET,cn_ip,全球直连,no-resolve",

        // 最终兜底
        "MATCH,漏网之鱼",
    ];

    return config;
};