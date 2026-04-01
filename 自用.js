const DIRECT_PROXY_NAME = "🟢 直连";
const FRONT_GROUP_NAME = "前置中转";
const HOME_GROUP_NAME = "自建/家宽节点";

const HOME_FILTER = "(?=.*(?i)(自建|\\bCF\\b|The_house|\\bprivate\\b|home|家宽|hgc|HKT|HKBN|icable|Hinet|\\batt\\b))";
const HOME_EXCLUDE_FILTER = "(?=.*(?i)(Seattle))";
const SPECIAL_PROXY_EXCLUDE = "(?i)(🟢 直连)";
const FRONT_GROUP_EXCLUDE = "(?i)(自建|\\bCF\\b|The_house|\\bprivate\\b|home|家宽|hgc|HKT|HKBN|icable|Hinet|\\batt\\b)";
const REGION_HOME_EXCLUDE = "(?i)(自建|\\bCF\\b|The_house|\\bprivate\\b|home|家宽|hgc|HKT|HKBN|icable|Hinet|\\batt\\b|🟢 直连)";

const HK_FILTER = "(?=.*(?i)(香港|港|Hong Kong|hongkong|\\bHK\\b|🇭🇰))";
const SG_FILTER = "(?=.*(?i)(新加坡|狮城|Singapore|\\bSG\\b|🇸🇬))";
const SG_EXCLUDE = "(?=.*(?i)(新西兰|New Zealand|\\bNZ\\b|澳新))";
const JP_FILTER = "(?=.*(?i)(日本|Japan|\\bJP\\b|🇯🇵))";
const TW_FILTER = "(?=.*(?i)(台湾|台灣|Taiwan|\\bTW\\b|🇹🇼))";
const US_FILTER = "(?=.*(?i)(美国|美|United States|America|\\bUS\\b|Los Angeles|Chicago|Ashburn|Seattle|Kansas|🇺🇸))";
const US_EXCLUDE = "(?=.*(?i)(Australia|\\bAU\\b|\\bAUS\\b|Sydney|Melbourne|Russia|\\bRUS\\b|Moscow|莫斯科))";
const EUROPE_FILTER = "(?=.*(?i)(🇦🇱|🇦🇩|🇦🇹|🇧🇾|🇧🇪|🇧🇦|🇧🇬|🇭🇷|🇨🇾|🇨🇿|🇩🇰|🇪🇪|🇫🇮|🇫🇷|🇩🇪|🇬🇷|🇭🇺|🇮🇸|🇮🇪|🇮🇹|🇽🇰|🇱🇻|🇱🇮|🇱🇹|🇱🇺|🇲🇹|🇲🇩|🇲🇨|🇲🇪|🇳🇱|🇲🇰|🇳🇴|🇵🇱|🇵🇹|🇷🇴|🇷🇺|🇸🇲|🇷🇸|🇸🇰|🇸🇮|🇪🇸|🇸🇪|🇨🇭|🇹🇷|🇺🇦|🇬🇧|🇻🇦|EU|Europe|欧洲|Germany|Deutschland|德国|France|法国|United Kingdom|England|英国|Netherlands|荷兰|Switzerland|瑞士|Italy|意大利|Spain|西班牙|Poland|波兰|Sweden|瑞典|Norway|挪威|Finland|芬兰|Denmark|丹麦|Austria|奥地利|Belgium|比利时|Ireland|爱尔兰|Portugal|葡萄牙|Greece|希腊|Czech|捷克|Hungary|匈牙利|Romania|罗马尼亚|Bulgaria|保加利亚|Croatia|克罗地亚|Slovakia|斯洛伐克|Lithuania|立陶宛|Slovenia|斯洛文尼亚|Latvia|拉脱维亚|Estonia|爱沙尼亚|Luxembourg|卢森堡|Iceland|冰岛|Turkey|土耳其|Ukraine|乌克兰|Russia|俄罗斯|Moscow|莫斯科|Saint Petersburg|圣彼得堡|London|Frankfurt|Paris|Amsterdam|Madrid|Milan|Stockholm|Oslo|Copenhagen|Vienna|Brussels|Dublin|Lisbon|Athens|Prague|Budapest|Bucharest|Sofia|Zagreb|Bratislava))";

const HOME_NAME_TEST = /(自建|\bCF\b|The_house|\bprivate\b|home|家宽|hgc|HKT|HKBN|icable|Hinet|\batt\b)/i;
const HOME_NAME_EXCLUDE_TEST = /Seattle/i;

const BASE_SERVICE_PROXIES = [
    "节点选择",
    "香港节点",
    "新加坡节点",
    "日本节点",
    "台湾节点",
    "美国节点",
    "欧洲节点",
    "全部节点",
    HOME_GROUP_NAME,
    "全球直连",
];

// [修改8] 前置中转只列区域组，去掉 include-all，职责明确：仅供家宽节点的 dialer-proxy 使用
const FRONT_GROUP_PROXIES = [
    "香港节点",
    "新加坡节点",
    "日本节点",
    "台湾节点",
    "美国节点",
    "欧洲节点",
];

const PROXY_TYPES_WITHOUT_DIALER = new Set([
    "direct",
    "reject",
    "reject-drop",
    "pass",
    "compatible",
]);

function mergeExcludeFilters(...filters) {
    return filters.filter(Boolean).join("|");
}

function addProxyIfMissing(proxies, proxy) {
    if (!proxies.some((item) => item && item.name === proxy.name)) {
        proxies.push(proxy);
    }
}

function applyDialerProxyToHomeNodes(proxies) {
    return proxies.map((proxy) => {
        if (!proxy || !proxy.name) return proxy;

        const type = String(proxy.type || "").toLowerCase();
        if (PROXY_TYPES_WITHOUT_DIALER.has(type)) return proxy;
        if (proxy.name === DIRECT_PROXY_NAME) return proxy;

        if (HOME_NAME_TEST.test(proxy.name) && !HOME_NAME_EXCLUDE_TEST.test(proxy.name)) {
            return {
                ...proxy,
                "dialer-proxy": FRONT_GROUP_NAME,
            };
        }

        return proxy;
    });
}

function createServiceGroup(name, extra = {}) {
    return {
        name,
        type: "select",
        proxies: [...BASE_SERVICE_PROXIES],
        ...extra,
    };
}

function createRegionSelectGroup(name, autoName, balanceName, filter, excludeFilter) {
    return {
        name,
        type: "select",
        proxies: [autoName, balanceName],
        "include-all": true,
        filter,
        "exclude-filter": excludeFilter,
    };
}

// [修改7] tolerance 从 20 改为 50，加 lazy: true
// lazy: true 表示有实际流量时才发起测试，避免 IPv6/IPv4 节点因细微延迟差反复互切
function createHealthCheckGroup(name, type, filter, excludeFilter) {
    const group = {
        name,
        type,
        hidden: true,
        "include-all": true,
        url: "https://www.gstatic.com/generate_204",
        timeout: 3000,
        interval: 300,
        lazy: true,
        filter,
        "exclude-filter": excludeFilter,
    };

    if (type === "url-test") {
        group.tolerance = 50;
        group["max-failed-times"] = 3;
    }

    if (type === "load-balance") {
        group.strategy = "consistent-hashing";
    }

    return group;
}

const main = (config) => {
    config["ipv6"] = true;
    config["unified-delay"] = true;
    config["tcp-concurrent"] = true;
    config["keep-alive-idle"] = 600;
    config["find-process-mode"] = "always";
    config["keep-alive-interval"] = 30;

    config["profile"] = {
        "store-selected": true,
        "store-fake-ip": true,
    };

    // [修改5] sniffer HTTP ports 的 80 改为数字，范围段保留字符串，符合文档规范
    config["sniffer"] = {
        enable: true,
        sniff: {
            HTTP: {
                ports: [80, "8080-8880"],
                "override-destination": false,
            },
            TLS: {
                ports: [443, 8443],
            },
            QUIC: {
                ports: [443, 8443],
            },
        },
        "force-domain": ["+.v2ex.com"],
        "skip-domain": [
            "Mijia Cloud",
            "dlg.io.mi.com",
            "+.push.apple.com",
            "+.apple.com",
            "+.wechat.com",
            "+.qpic.cn",
            "+.qq.com",
            "+.wechatapp.com",
            "+.vivox.com",
            "+.douyinpic.com",
            "+.douyincdn.com",
            "+.oray.com",
            "+.sunlogin.net",
        ],
    };

    config["geodata-mode"] = true;
    config["geodata-loader"] = "standard";
    config["geo-auto-update"] = true;
    config["geo-update-interval"] = 48;
    config["geox-url"] = {
        geosite: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
        mmdb: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.metadb",
        geoip: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat",
        asn: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/GeoLite2-ASN.mmdb",
    };

    config["dns"] = {
        enable: true,
        ipv6: true,
        "prefer-h3": false,
        "respect-rules": true,
        "enhanced-mode": "fake-ip",

        // [修改1] 原 28.0.0.1/8 是公网 IP 段，改为标准保留段
        "fake-ip-range": "198.18.0.1/16",

        "fake-ip-filter-mode": "blacklist",
        "fake-ip-filter": [
            "rule-set:fakeip_filter_domain",
            "rule-set:game_cn_domain",
            "rule-set:bank_cn_domain",
            "rule-set:wechat_domain",
            "rule-set:douyin_domain",
            "rule-set:ai_cn_domain",
            "rule-set:NetEaseMusic_domain",
            "rule-set:fcm_domain",
            "rule-set:alibaba_domain",
            "rule-set:media_cn_domain",
            "rule-set:xiaomi_domain",
            "rule-set:steam_cn_domain",
            "rule-set:pt_cn_domain",
            "rule-set:public-tracker_domain",
            "rule-set:115_domain",
            "rule-set:aliyun_domain",
            "rule-set:direct_domain",
            "rule-set:apple_cn_domain",
            "rule-set:iptv_domain",
            "rule-set:private_domain",
            "rule-set:cn_domain",
        ],

        "default-nameserver": ["119.29.29.29", "180.184.1.1"],

        // [修改3] 加 #DIRECT，确保解析代理服务器域名时强制走直连，不产生循环依赖
        "proxy-server-nameserver": [
            "https://doh.pub/dns-query#DIRECT",
            "https://223.5.5.5/dns-query#DIRECT",
        ],

        // [修改3] 同上，direct-nameserver 也绑定 DIRECT
        "direct-nameserver": [
            "https://doh.pub/dns-query#DIRECT",
            "https://223.5.5.5/dns-query#DIRECT",
        ],
        "direct-nameserver-follow-policy": false,

        // [修改4] 新增 nameserver-policy：
        // 国内域名强制走国内 DNS 直连解析，避免污染；私有域名走系统 DNS
        "nameserver-policy": {
            "rule-set:private_domain,geosite:private": "system",
            "rule-set:cn_domain,rule-set:direct_domain,geosite:cn": [
                "https://doh.pub/dns-query#DIRECT",
                "https://223.5.5.5/dns-query#DIRECT",
            ],
        },

        // [修改2] nameserver 加 #节点选择，境外域名的 DNS 查询走代理出去，防止 DNS 泄露
        nameserver: [
            "https://dns.google/dns-query#节点选择",
            "https://dns.cloudflare.com/dns-query#节点选择",
        ],
    };

    if (!config["proxies"]) config["proxies"] = [];

    addProxyIfMissing(config["proxies"], {
        name: DIRECT_PROXY_NAME,
        type: "direct",
        udp: true,
    });

    config["proxies"] = applyDialerProxyToHomeNodes(config["proxies"]);

    const regionOnlyExclude = REGION_HOME_EXCLUDE;
    const hkExclude = regionOnlyExclude;
    const sgExclude = mergeExcludeFilters(regionOnlyExclude, SG_EXCLUDE);
    const jpExclude = regionOnlyExclude;
    const twExclude = regionOnlyExclude;
    const usExclude = mergeExcludeFilters(regionOnlyExclude, US_EXCLUDE);
    const europeExclude = regionOnlyExclude;
    const genericSpecialExclude = SPECIAL_PROXY_EXCLUDE;
    const autoExclude = SPECIAL_PROXY_EXCLUDE;
    const frontExclude = FRONT_GROUP_EXCLUDE;

    config["proxy-groups"] = [
        {
            name: "节点选择",
            type: "select",
            proxies: [
                "全局自动",
                "手动选择",
                "香港节点",
                "新加坡节点",
                "日本节点",
                "台湾节点",
                "美国节点",
                "欧洲节点",
                "全部节点",
                HOME_GROUP_NAME,
                "故障转移",
            ],
        },
        {
            name: "手动选择",
            type: "select",
            "include-all": true,
            "exclude-filter": genericSpecialExclude,
        },

        createServiceGroup("LinuxDo"),
        createServiceGroup("Google"),
        createServiceGroup("Telegram"),
        createServiceGroup("GitHub"),
        createServiceGroup("OneDrive"),
        createServiceGroup("Microsoft"),
        createServiceGroup("Discord"),
        createServiceGroup("Cloudflare"),
        createServiceGroup("PayPal"),
        createServiceGroup("AI", {
            "include-all": true,
            "exclude-filter": genericSpecialExclude,
        }),
        createServiceGroup("Speedtest", {
            "include-all": true,
            "exclude-filter": genericSpecialExclude,
        }),
        createServiceGroup("Final", {
            "include-all": true,
            "exclude-filter": genericSpecialExclude,
        }),

        {
            name: "全球直连",
            type: "select",
            proxies: [DIRECT_PROXY_NAME, "全部节点"],
        },
        {
            name: "隐私拦截",
            type: "select",
            proxies: ["REJECT", "REJECT-DROP", DIRECT_PROXY_NAME],
        },

        // [修改8] 去掉 include-all，前置中转只列区域组，不混入全部节点
        {
            name: FRONT_GROUP_NAME,
            type: "select",
            proxies: [...FRONT_GROUP_PROXIES],
        },

        // [修改9] 家宽组首位加 节点选择 作为兜底，防止家宽节点全部离线时无法出站
        {
            name: HOME_GROUP_NAME,
            type: "select",
            proxies: ["节点选择"],
            "include-all": true,
            filter: HOME_FILTER,
            "exclude-filter": HOME_EXCLUDE_FILTER,
        },

        createRegionSelectGroup("香港节点", "香港自动", "香港均衡", HK_FILTER, hkExclude),
        createRegionSelectGroup("新加坡节点", "新加坡自动", "新加坡均衡", SG_FILTER, sgExclude),
        createRegionSelectGroup("日本节点", "日本自动", "日本均衡", JP_FILTER, jpExclude),
        createRegionSelectGroup("台湾节点", "台湾自动", "台湾均衡", TW_FILTER, twExclude),
        createRegionSelectGroup("美国节点", "美国自动", "美国均衡", US_FILTER, usExclude),

        // [修改6] 欧洲节点改用 createRegionSelectGroup，补充自动/均衡子组，与其他地区一致
        createRegionSelectGroup("欧洲节点", "欧洲自动", "欧洲均衡", EUROPE_FILTER, europeExclude),

        {
            name: "全部节点",
            type: "select",
            "include-all": true,
            "exclude-filter": genericSpecialExclude,
        },

        // [修改7] 全局自动：tolerance 50，lazy: true，IPv6 节点不因细微延迟差乱切
        {
            name: "全局自动",
            type: "url-test",
            hidden: true,
            "include-all": true,
            url: "https://www.gstatic.com/generate_204",
            timeout: 3000,
            tolerance: 50,
            lazy: true,
            interval: 300,
            "max-failed-times": 3,
            "exclude-filter": autoExclude,
        },

        createHealthCheckGroup("香港自动", "url-test", HK_FILTER, hkExclude),
        createHealthCheckGroup("新加坡自动", "url-test", SG_FILTER, sgExclude),
        createHealthCheckGroup("日本自动", "url-test", JP_FILTER, jpExclude),
        createHealthCheckGroup("台湾自动", "url-test", TW_FILTER, twExclude),
        createHealthCheckGroup("美国自动", "url-test", US_FILTER, usExclude),
        // [修改6] 新增欧洲自动
        createHealthCheckGroup("欧洲自动", "url-test", EUROPE_FILTER, europeExclude),

        createHealthCheckGroup("香港均衡", "load-balance", HK_FILTER, hkExclude),
        createHealthCheckGroup("新加坡均衡", "load-balance", SG_FILTER, sgExclude),
        createHealthCheckGroup("日本均衡", "load-balance", JP_FILTER, jpExclude),
        createHealthCheckGroup("台湾均衡", "load-balance", TW_FILTER, twExclude),
        createHealthCheckGroup("美国均衡", "load-balance", US_FILTER, usExclude),
        // [修改6] 新增欧洲均衡
        createHealthCheckGroup("欧洲均衡", "load-balance", EUROPE_FILTER, europeExclude),

        {
            name: "故障转移",
            type: "fallback",
            "include-all": true,
            url: "https://www.gstatic.com/generate_204",
            timeout: 3000,
            interval: 300,
            "max-failed-times": 3,
            "exclude-filter": autoExclude,
        },
    ];

    config["rule-providers"] = {
        banAd_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/banAd_mini.mrs",
        },

        private_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs",
        },
        private_ip: {
            type: "http",
            interval: 86400,
            behavior: "ipcidr",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geoip/private.mrs",
        },

        wechat_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/WeChat.mrs",
        },
        wechat_asn: {
            type: "http",
            interval: 86400,
            behavior: "ipcidr",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/IP/AS132203.mrs",
        },
        douyin_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/douyin.mrs",
        },
        bank_cn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/category-bank-cn.mrs",
        },
        ai_cn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/category-ai-cn.mrs",
        },
        alibaba_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/alibaba.mrs",
        },
        aliyun_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/aliyun.mrs",
        },
        xiaomi_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/xiaomi.mrs",
        },
        apple_cn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/apple%40cn.mrs",
        },
        direct_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/direct.mrs",
        },
        "115_domain": {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/115.mrs",
        },
        ifast_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/ifast.mrs",
        },
        iptv_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/iptv.mrs",
        },
        steam_cn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/steam%40cn.mrs",
        },
        steamcdn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/Steam-domain.mrs",
        },
        steamcdn_ip: {
            type: "http",
            interval: 86400,
            behavior: "ipcidr",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/IP/steamCDN-ip.mrs",
        },
        NetEaseMusic_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/NetEaseMusic-domain.mrs",
        },
        NetEaseMusic_ip: {
            type: "http",
            interval: 86400,
            behavior: "ipcidr",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/IP/NetEaseMusic-ip.mrs",
        },
        pt_cn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/category-pt.mrs",
        },
        "public-tracker_domain": {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/category-public-tracker.mrs",
        },
        game_cn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/category-games%40cn.mrs",
        },
        fakeip_filter_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/fakeip-filter.mrs",
        },
        media_cn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/category-media-cn.mrs",
        },

        proxy_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/proxy.mrs",
        },
        speedtest_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/ookla-speedtest.mrs",
        },
        Cloudflare_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/cloudflare.mrs",
        },

        "ai!cn_domain": {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/category-ai-!cn.mrs",
        },
        ai_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/ai.mrs",
        },
        openai_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/openai.mrs",
        },

        googlevpn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/Domain/googleVPN.mrs",
        },
        youtube_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs",
        },
        fcm_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/googlefcm.mrs",
        },
        google_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/google.mrs",
        },
        google_ip: {
            type: "http",
            interval: 86400,
            behavior: "ipcidr",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/google.mrs",
        },
        google_asn_cn: {
            type: "http",
            interval: 86400,
            behavior: "ipcidr",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/IP/AS24424.mrs",
        },

        github_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.mrs",
        },
        gitbook_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/gitbook.mrs",
        },
        telegram_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs",
        },
        telegram_ip: {
            type: "http",
            interval: 86400,
            behavior: "ipcidr",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs",
        },

        onedrive_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.mrs",
        },
        microsoft_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs",
        },

        discord_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/discord.mrs",
        },
        discord_asn: {
            type: "http",
            interval: 86400,
            behavior: "ipcidr",
            format: "mrs",
            url: "https://raw.githubusercontent.com/Lanlan13-14/Rules/refs/heads/main/rules/IP/AS49544.mrs",
        },

        paypal_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/paypal.mrs",
        },

        gfw_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.mrs",
        },
        "geolocation-!cn": {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs",
        },

        cn_domain: {
            type: "http",
            interval: 86400,
            behavior: "domain",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs",
        },
        cn_ip: {
            type: "http",
            interval: 86400,
            behavior: "ipcidr",
            format: "mrs",
            url: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs",
        },
    };

    config["rules"] = [
        "RULE-SET,banAd_domain,隐私拦截",

        "RULE-SET,private_domain,全球直连",
        "RULE-SET,private_ip,全球直连,no-resolve",

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

        // LinuxDo 主域名 + 历史相关域名
        "DOMAIN-SUFFIX,hybgzs.com,LinuxDo",
        "DOMAIN-SUFFIX,linux.do,LinuxDo",

        "RULE-SET,ai!cn_domain,AI",
        "RULE-SET,ai_domain,AI",
        "RULE-SET,openai_domain,AI",

        "RULE-SET,googlevpn_domain,Google",
        "PROCESS-NAME,com.android.vending,Google",
        "RULE-SET,youtube_domain,Google",
        "RULE-SET,fcm_domain,Google",
        "RULE-SET,google_domain,Google",
        "RULE-SET,google_asn_cn,Google,no-resolve",
        "RULE-SET,google_ip,Google,no-resolve",

        "RULE-SET,telegram_domain,Telegram",
        "RULE-SET,telegram_ip,Telegram,no-resolve",

        "RULE-SET,github_domain,GitHub",
        "RULE-SET,gitbook_domain,GitHub",

        "RULE-SET,onedrive_domain,OneDrive",
        "RULE-SET,microsoft_domain,Microsoft",

        "RULE-SET,discord_domain,Discord",
        "RULE-SET,discord_asn,Discord,no-resolve",

        "RULE-SET,paypal_domain,PayPal",
        "RULE-SET,speedtest_domain,Speedtest",
        "RULE-SET,Cloudflare_domain,Cloudflare",

        "RULE-SET,proxy_domain,节点选择",
        "RULE-SET,gfw_domain,节点选择",
        "RULE-SET,geolocation-!cn,节点选择",

        "RULE-SET,cn_domain,全球直连",
        "RULE-SET,cn_ip,全球直连,no-resolve",

        "MATCH,Final",
    ];

    return config;
};
