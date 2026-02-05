// ==UserScript==
// @name         Linux.do 帖子导出到 Obsidian
// @namespace    https://linux.do/
// @version      4.2.2
// @description  导出 Linux.do 帖子到 Obsidian（支持 Local REST API、图片处理、Callout 格式）
// @author       ilvsx
// @license      MIT
// @match        https://linux.do/t/*
// @match        https://linux.do/t/topic/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_download
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // -----------------------
    // 存储 key
    // -----------------------
    const K = {
        // 筛选相关
        RANGE_MODE: "ld_export_range_mode",
        RANGE_START: "ld_export_range_start",
        RANGE_END: "ld_export_range_end",
        FILTER_ONLY_OP: "ld_export_filter_only_op",
        FILTER_IMG: "ld_export_filter_img",
        FILTER_USERS: "ld_export_filter_users",
        FILTER_INCLUDE: "ld_export_filter_include",
        FILTER_EXCLUDE: "ld_export_filter_exclude",
        FILTER_MINLEN: "ld_export_filter_minlen",
        // UI 状态
        PANEL_COLLAPSED: "ld_export_panel_collapsed",
        ADVANCED_OPEN: "ld_export_panel_advanced_open",
        // Obsidian 配置
        OBS_DIR: "ld_export_obs_dir",
        OBS_IMG_MODE: "ld_export_obs_img_mode",
        OBS_IMG_DIR: "ld_export_obs_img_dir",
        OBS_API_URL: "ld_export_obs_api_url",
        OBS_API_KEY: "ld_export_obs_api_key",
        OBS_PANEL_OPEN: "ld_export_obs_panel_open",
    };

    const DEFAULTS = {
        rangeMode: "all",
        rangeStart: 1,
        rangeEnd: 999999,
        onlyOp: false,
        imgFilter: "none",
        users: "",
        include: "",
        exclude: "",
        minLen: 0,
        // Obsidian 导出相关
        obsDir: "Linux.do",
        obsImgMode: "file",
        obsImgDir: "Linux.do/attachments",
        obsApiUrl: "https://127.0.0.1:27124",
        obsApiKey: "",
    };

    // -----------------------
    // Emoji 名称到 Unicode 映射
    // -----------------------
    const EMOJI_MAP = {
        // 笑脸表情
        grinning_face: "😀", smiley: "😃", grinning_face_with_smiling_eyes: "😄", grin: "😁",
        laughing: "😆", sweat_smile: "😅", rofl: "🤣", joy: "😂",
        slightly_smiling_face: "🙂", upside_down_face: "🙃", melting_face: "🫠",
        wink: "😉", blush: "😊", innocent: "😇",
        smiling_face_with_three_hearts: "🥰", heart_eyes: "😍", star_struck: "🤩",
        face_blowing_a_kiss: "😘", kissing_face: "😗", smiling_face: "☺️",
        kissing_face_with_closed_eyes: "😚", kissing_face_with_smiling_eyes: "😙",
        smiling_face_with_tear: "🥲",
        // 舌头表情
        face_savoring_food: "😋", face_with_tongue: "😛", winking_face_with_tongue: "😜",
        zany_face: "🤪", squinting_face_with_tongue: "😝", money_mouth_face: "🤑",
        // 手势类表情
        hugs: "🤗", face_with_hand_over_mouth: "🤭", face_with_open_eyes_and_hand_over_mouth: "🫢",
        face_with_peeking_eye: "🫣", shushing_face: "🤫", thinking: "🤔", saluting_face: "🫡",
        // 嘴部表情
        zipper_mouth_face: "🤐", face_with_raised_eyebrow: "🤨", neutral_face: "😐",
        expressionless: "😑", expressionless_face: "😑", face_without_mouth: "😶",
        dotted_line_face: "🫥", face_in_clouds: "😶‍🌫️",
        // 斜眼表情
        smirk: "😏", smirking_face: "😏", unamused: "😒", unamused_face: "😒",
        roll_eyes: "🙄", rolling_eyes: "🙄", grimacing: "😬", face_exhaling: "😮‍💨",
        lying_face: "🤥", shaking_face: "🫨",
        head_shaking_horizontally: "🙂‍↔️", head_shaking_vertically: "🙂‍↕️",
        // 疲惫表情
        relieved: "😌", relieved_face: "😌", pensive: "😔", pensive_face: "😔",
        sleepy: "😪", sleepy_face: "😪", drooling_face: "🤤", sleeping: "😴", sleeping_face: "😴",
        face_with_bags_under_eyes: "🫩",
        // 生病表情
        mask: "😷", face_with_medical_mask: "😷", face_with_thermometer: "🤒",
        face_with_head_bandage: "🤕", nauseated_face: "🤢", face_vomiting: "🤮",
        sneezing_face: "🤧", hot_face: "🥵", cold_face: "🥶", woozy_face: "🥴",
        face_with_crossed_out_eyes: "😵", face_with_spiral_eyes: "😵‍💫", exploding_head: "🤯",
        // 帽子和眼镜表情
        cowboy_hat_face: "🤠", face_with_cowboy_hat: "🤠", partying_face: "🥳", disguised_face: "🥸",
        sunglasses: "😎", smiling_face_with_sunglasses: "😎", nerd_face: "🤓", face_with_monocle: "🧐",
        // 困惑表情
        confused: "😕", face_with_diagonal_mouth: "🫤", worried: "😟",
        slightly_frowning_face: "🙁", frowning: "☹️",
        // 惊讶表情
        open_mouth: "😮", hushed_face: "😯", astonished_face: "😲", flushed_face: "😳",
        distorted_face: "🫨", pleading_face: "🥺", face_holding_back_tears: "🥹",
        frowning_face_with_open_mouth: "😦", anguished_face: "😧",
        // 恐惧表情
        fearful: "😨", anxious_face_with_sweat: "😰", sad_but_relieved_face: "😥",
        cry: "😢", sob: "😭", scream: "😱",
        confounded: "😖", confounded_face: "😖", persevering_face: "😣",
        disappointed: "😞", disappointed_face: "😞", sweat: "😓", downcast_face_with_sweat: "😓",
        weary_face: "😩", tired_face: "😫", yawning_face: "🥱",
        // 愤怒表情
        face_with_steam_from_nose: "😤", enraged_face: "😡", angry: "😠", rage: "😡",
        face_with_symbols_on_mouth: "🤬",
        smiling_face_with_horns: "😈", angry_face_with_horns: "👿",
        // 骷髅和怪物
        skull: "💀", skull_and_crossbones: "☠️", poop: "💩", clown_face: "🤡",
        ogre: "👹", goblin: "👺", ghost: "👻", alien: "👽", alien_monster: "👾", robot: "🤖",
        // 猫咪表情
        grinning_cat: "😺", grinning_cat_with_smiling_eyes: "😸", joy_cat: "😹",
        smiling_cat_with_heart_eyes: "😻", cat_with_wry_smile: "😼", kissing_cat: "😽",
        weary_cat: "🙀", crying_cat: "😿", pouting_cat: "😾",
        // 三猴子
        see_no_evil_monkey: "🙈", hear_no_evil_monkey: "🙉", speak_no_evil_monkey: "🙊",
        // 心形类
        love_letter: "💌", heart_with_arrow: "💘", heart_with_ribbon: "💝",
        sparkling_heart: "💖", growing_heart: "💗", beating_heart: "💓",
        revolving_hearts: "💞", two_hearts: "💕", heart_decoration: "💟",
        heart_exclamation: "❣️", broken_heart: "💔", heart_on_fire: "❤️‍🔥", mending_heart: "❤️‍🩹",
        heart: "❤️", pink_heart: "🩷", orange_heart: "🧡", yellow_heart: "💛",
        green_heart: "💚", blue_heart: "💙", light_blue_heart: "🩵", purple_heart: "💜",
        brown_heart: "🤎", black_heart: "🖤", grey_heart: "🩶", white_heart: "🤍",
        // 符号类
        kiss_mark: "💋", "100": "💯", anger_symbol: "💢", fight_cloud: "💨",
        collision: "💥", dizzy: "💫", sweat_droplets: "💦", sweat_drops: "💦",
        dashing_away: "💨", dash: "💨", hole: "🕳️",
        speech_balloon: "💬", eye_in_speech_bubble: "👁️️🗨️", left_speech_bubble: "🗨️",
        right_anger_bubble: "🗯️", thought_balloon: "💭", zzz: "💤",
        // 兼容旧版本的别名
        smile: "😊", grinning: "😀", kissing: "😗", kissing_heart: "😘",
        stuck_out_tongue: "😛", heartpulse: "💗", heartbeat: "💓", cupid: "💘", gift_heart: "💝",
        // 手势
        thumbsup: "👍", thumbsdown: "👎", "+1": "👍", "-1": "👎",
        ok_hand: "👌", punch: "👊", fist: "✊", v: "✌️", wave: "👋",
        raised_hand: "✋", open_hands: "👐", muscle: "💪", pray: "🙏",
        point_up: "☝️", point_up_2: "👆", point_down: "👇", point_left: "👈", point_right: "👉",
        clap: "👏", raised_hands: "🙌", handshake: "🤝",
        // 通用符号
        star: "⭐", star2: "🌟", sparkles: "✨", zap: "⚡", fire: "🔥",
        boom: "💥", droplet: "💧",
        check: "✅", white_check_mark: "✅", x: "❌", cross_mark: "❌",
        heavy_check_mark: "✔️", heavy_multiplication_x: "✖️",
        question: "❓", exclamation: "❗", warning: "⚠️", no_entry: "⛔",
        triangular_flag: "🚩", triangular_flag_on_post: "🚩",
        sos: "🆘", ok: "🆗", cool: "🆒", new: "🆕", free: "🆓",
        // 动物
        dog: "🐕", cat: "🐈", mouse: "🐁", rabbit: "🐇", bear: "🐻",
        panda_face: "🐼", koala: "🐨", tiger: "🐯", lion: "🦁", cow: "🐄",
        pig: "🐷", monkey: "🐒", chicken: "🐔", penguin: "🐧", bird: "🐦",
        frog: "🐸", turtle: "🐢", snake: "🐍", dragon: "🐉", whale: "🐋",
        dolphin: "🐬", fish: "🐟", octopus: "🐙", bug: "🐛", bee: "🐝",
        // 食物
        apple: "🍎", green_apple: "🍏", banana: "🍌", orange: "🍊", lemon: "🍋",
        grapes: "🍇", watermelon: "🍉", strawberry: "🍓", peach: "🍑", cherries: "🍒",
        pizza: "🍕", hamburger: "🍔", fries: "🍟", hotdog: "🌭", taco: "🌮",
        coffee: "☕", tea: "🍵", beer: "🍺", wine_glass: "🍷", tropical_drink: "🍹",
        cake: "🍰", cookie: "🍪", chocolate_bar: "🍫", candy: "🍬", lollipop: "🍭",
        // 物品
        gift: "🎁", balloon: "🎈", tada: "🎉", confetti_ball: "🎊",
        trophy: "🏆", medal: "🏅", first_place_medal: "🥇", second_place_medal: "🥈", third_place_medal: "🥉",
        soccer: "⚽", basketball: "🏀", football: "🏈", tennis: "🎾", volleyball: "🏐",
        computer: "💻", keyboard: "⌨️", desktop_computer: "🖥️", printer: "🖨️", mouse_three_button: "🖱️",
        phone: "📱", telephone: "☎️", email: "📧", envelope: "✉️", memo: "📝",
        book: "📖", books: "📚", newspaper: "📰", bookmark: "🔖",
        bulb: "💡", flashlight: "🔦", candle: "🕯️",
        lock: "🔒", unlock: "🔓", key: "🔑",
        // 交通与天气
        rocket: "🚀", airplane: "✈️", car: "🚗", bus: "🚌", train: "🚆",
        sun: "☀️", cloud: "☁️", umbrella: "☂️", rainbow: "🌈", snowflake: "❄️",
        clock: "🕐", alarm_clock: "⏰", stopwatch: "⏱️", timer_clock: "⏲️",
        hourglass: "⌛", watch: "⌚",
        globe_showing_americas: "🌎", globe_showing_europe_africa: "🌍", globe_showing_asia_australia: "🌏",
        earth_americas: "🌎", earth_africa: "🌍", earth_asia: "🌏",
        bullseye: "🎯", dart: "🎯",
        // 国旗
        cn: "🇨🇳", us: "🇺🇸", jp: "🇯🇵", kr: "🇰🇷", gb: "🇬🇧",
    };

    // -----------------------
    // 工具函数
    // -----------------------
    function getTopicId() {
        const m =
            window.location.pathname.match(/\/topic\/(\d+)/) ||
            window.location.pathname.match(/\/t\/[^/]+\/(\d+)/);
        return m ? m[1] : null;
    }

    function absoluteUrl(src) {
        if (!src) return "";
        if (src.startsWith("http://") || src.startsWith("https://")) return src;
        if (src.startsWith("//")) return window.location.protocol + src;
        if (src.startsWith("/")) return window.location.origin + src;
        return window.location.origin + "/" + src.replace(/^\.?\//, "");
    }

    function clampInt(n, min, max, fallback) {
        const x = parseInt(String(n), 10);
        if (Number.isNaN(x)) return fallback;
        return Math.max(min, Math.min(max, x));
    }

    function normalizeListInput(s) {
        return (s || "")
            .split(/[\s,，;；]+/g)
            .map((x) => x.trim())
            .filter(Boolean);
    }

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    // -----------------------
    // DOM -> Obsidian Markdown
    // -----------------------
    function cookedToObsidianMd(cookedHtml, settings, imgMap) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(cookedHtml || "", "text/html");
        const root = doc.body;

        function getTableAlign(cell) {
            const alignAttr = (cell.getAttribute("align") || "").toLowerCase();
            if (alignAttr === "left" || alignAttr === "center" || alignAttr === "right") return alignAttr;
            const style = cell.getAttribute("style") || "";
            const match = style.match(/text-align\s*:\s*(left|center|right)/i);
            return match ? match[1].toLowerCase() : "";
        }

        function alignToSeparator(align) {
            if (align === "left") return ":---";
            if (align === "center") return ":---:";
            if (align === "right") return "---:";
            return "---";
        }

        function escapeTableCell(text) {
            return (text || "")
                .replace(/\r\n/g, "\n")
                .replace(/\n+/g, "<br>")
                .replace(/\|/g, "\\|")
                .replace(/\s+/g, " ")
                .trim();
        }

        function tableRowCells(rowEl) {
            return Array.from(rowEl.children).filter((c) => {
                const t = c.tagName ? c.tagName.toLowerCase() : "";
                return t === "td" || t === "th";
            });
        }

        function tableToMarkdown(tableEl) {
            const headRows = Array.from(tableEl.querySelectorAll("thead tr"));
            const bodyRows = Array.from(tableEl.querySelectorAll("tbody tr"));

            let headerCells = [];
            let alignments = [];
            let dataRows = [];

            if (headRows.length) {
                const firstHead = tableRowCells(headRows[0]);
                headerCells = firstHead.map((cell) => {
                    const raw = Array.from(cell.childNodes).map((c) => serialize(c, false)).join("");
                    return escapeTableCell(raw);
                });
                alignments = firstHead.map((cell) => getTableAlign(cell));
                for (let i = 1; i < headRows.length; i += 1) {
                    const cells = tableRowCells(headRows[i]).map((cell) => {
                        const raw = Array.from(cell.childNodes).map((c) => serialize(c, false)).join("");
                        return escapeTableCell(raw);
                    });
                    dataRows.push(cells);
                }
            } else {
                const allRows = bodyRows.length ? bodyRows : Array.from(tableEl.querySelectorAll("tr"));
                if (!allRows.length) return "";
                const firstRow = allRows.shift();
                const firstCells = tableRowCells(firstRow);
                headerCells = firstCells.map((cell) => {
                    const raw = Array.from(cell.childNodes).map((c) => serialize(c, false)).join("");
                    return escapeTableCell(raw);
                });
                alignments = firstCells.map((cell) => getTableAlign(cell));
                dataRows = allRows.map((row) =>
                    tableRowCells(row).map((cell) => {
                        const raw = Array.from(cell.childNodes).map((c) => serialize(c, false)).join("");
                        return escapeTableCell(raw);
                    })
                );
            }

            if (headRows.length) {
                dataRows = dataRows.concat(
                    bodyRows.map((row) =>
                        tableRowCells(row).map((cell) => {
                            const raw = Array.from(cell.childNodes).map((c) => serialize(c, false)).join("");
                            return escapeTableCell(raw);
                        })
                    )
                );
            }

            const allRows = [headerCells, ...dataRows];
            const colCount = Math.max(0, ...allRows.map((r) => r.length));
            if (!colCount) return "";

            const padRow = (cells) => {
                const out = cells.slice(0, colCount);
                while (out.length < colCount) out.push("");
                return out;
            };

            const headerLine = `| ${padRow(headerCells).join(" | ")} |`;
            const sepLine = `| ${padRow(alignments).map((a) => alignToSeparator(a)).join(" | ")} |`;
            const bodyLines = dataRows.map((row) => `| ${padRow(row).join(" | ")} |`).join("\n");

            return [headerLine, sepLine, bodyLines].filter(Boolean).join("\n");
        }

        function serialize(node, inPre = false) {
            if (!node) return "";
            if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
            if (node.nodeType !== Node.ELEMENT_NODE) return "";

            const el = node;
            const tag = el.tagName.toLowerCase();

            // 跳过 Discourse 的图片元信息容器
            if (el.classList && el.classList.contains('meta')) {
                return "";
            }

            // 处理 Discourse 引用块
            if (tag === "aside" && el.classList.contains("quote")) {
                // 适配两种结构：.quote-title__text-content a 或 .title > a
                const titleLink = el.querySelector(".quote-title__text-content a") || el.querySelector(".title > a");
                const title = titleLink?.textContent?.trim() || "引用";
                const href = titleLink?.getAttribute("href") || "";

                const blockquote = el.querySelector("blockquote");
                const content = blockquote
                    ? Array.from(blockquote.childNodes).map(c => serialize(c, inPre)).join("").trim()
                    : "";

                const header = href ? `[${title}](${absoluteUrl(href)})` : title;
                const lines = content.split("\n").filter(l => l.trim());
                return "\n> [!quote] " + header + "\n" + lines.map(l => `> ${l}`).join("\n") + "\n\n";
            }

            // 处理 Discourse onebox（链接预览）
            if (tag === "aside" && el.classList.contains("onebox")) {
                const titleEl = el.querySelector("h3 a") || el.querySelector("header a");
                const title = titleEl?.textContent?.trim() || "";
                const href = titleEl?.getAttribute("href") || "";
                const desc = el.querySelector("article p")?.textContent?.trim() || "";

                if (href) {
                    const link = `[${title || href}](${absoluteUrl(href)})`;
                    if (desc) {
                        return `\n> [!info] ${link}\n> ${desc}\n\n`;
                    }
                    return `\n${link}\n`;
                }
                return "";
            }

            if (tag === "br") return "\n";

            if (tag === "img") {
                const src = el.getAttribute("src") || el.getAttribute("data-src") || "";

                // 检测是否为 emoji 图片
                const emojiMatch = src.match(/\/images\/emoji\/(?:twemoji|apple|google|twitter)\/([^/.]+)\.png/i);
                if (emojiMatch) {
                    const emojiName = emojiMatch[1];
                    // 优先使用映射表
                    if (EMOJI_MAP[emojiName]) {
                        return EMOJI_MAP[emojiName];
                    }
                    // 如果映射表中没有，使用 alt 或 title 属性
                    const emojiAlt = el.getAttribute("alt") || el.getAttribute("title") || "";
                    if (emojiAlt && emojiAlt.length <= 4) {
                        return emojiAlt;
                    }
                    // 降级为 :name: 格式
                    return `:${emojiName}:`;
                }

                const full = absoluteUrl(src);
                if (!full) return "";

                // 不导出图片模式：跳过所有非 emoji 图片
                if (settings.obsidian && settings.obsidian.imgMode === "none") {
                    return "";
                }

                const alt = "图片";

                if (settings.obsidian && settings.obsidian.imgMode === "file" && imgMap && imgMap[full]) {
                    const filename = imgMap[full];
                    return `\n![[${filename}]]\n`;
                } else if (settings.obsidian && settings.obsidian.imgMode === "base64" && imgMap && imgMap[full]) {
                    return `\n![${alt}](${imgMap[full]})\n`;
                } else {
                    return `\n![${alt}](${full})\n`;
                }
            }

            if (tag === "a") {
                const href = el.getAttribute("href") || "";
                const classes = el.getAttribute("class") || "";
                // 跳过 Discourse 的标题锚点链接
                if (classes.includes("anchor") || href.startsWith("#")) {
                    // 如果有子节点内容，仍然处理（如图片等）
                    const childContent = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("").trim();
                    return childContent;
                }
                const hasImg = el.querySelector("img");
                if (hasImg) {
                    return Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("");
                }
                const text = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("").trim();
                const link = absoluteUrl(href);
                if (!link) return text;
                if (!text) return link;
                if (text === link) return `<${text}>`;
                return `[${text}](${link})`;
            }

            if (tag === "pre") {
                const codeEl = el.querySelector("code");
                const langClass = codeEl?.getAttribute("class") || "";
                const lang = (langClass.match(/lang(?:uage)?-([a-z0-9_+-]+)/i) || [])[1] || "";
                const code = (codeEl ? codeEl.textContent : el.textContent) || "";
                return `\n\`\`\`${lang}\n${code.replace(/\n+$/g, "")}\n\`\`\`\n\n`;
            }

            if (tag === "code") {
                if (inPre) return el.textContent || "";
                const t = (el.textContent || "").replace(/\n/g, " ");
                return t ? `\`${t}\`` : "";
            }

            if (tag === "blockquote") {
                const inner = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("");
                const lines = inner.trim().split("\n");
                return "\n" + lines.map((l) => `> ${l}`).join("\n") + "\n\n";
            }

            if (/^h[1-6]$/.test(tag)) {
                const inner = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("").trim();
                return inner ? `\n**${inner}**\n\n` : "";
            }

            if (tag === "li") {
                const inner = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("").trim();
                return inner ? `- ${inner}\n` : "";
            }

            if (tag === "ul" || tag === "ol") {
                const inner = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("");
                return `\n${inner}\n`;
            }

            if (tag === "p") {
                const inner = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("").trim();
                return inner ? `${inner}\n\n` : "\n";
            }

            if (tag === "strong" || tag === "b") {
                const inner = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("");
                return `**${inner}**`;
            }

            if (tag === "em" || tag === "i") {
                const inner = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("");
                return `*${inner}*`;
            }

            if (tag === "s" || tag === "del" || tag === "strike") {
                const inner = Array.from(el.childNodes).map((c) => serialize(c, inPre)).join("");
                return `~~${inner}~~`;
            }

            if (tag === "table") {
                const tableMd = tableToMarkdown(el);
                return tableMd ? `\n${tableMd}\n\n` : "";
            }

            const nextInPre = inPre || tag === "pre";
            return Array.from(el.childNodes).map((c) => serialize(c, nextInPre)).join("");
        }

        let text = Array.from(root.childNodes).map((n) => serialize(n, false)).join("");
        text = text.replace(/\r\n/g, "\n");
        text = text.replace(/[ \t]+\n/g, "\n");
        text = text.replace(/\n{3,}/g, "\n\n");
        // 修复链接前的多余空格，如 "  [text](url)" -> "[text](url)"
        text = text.replace(/^[ \t]+\[/gm, "[");
        return text.trim();
    }

    // -----------------------
    // Panel UI
    // -----------------------
    const ui = {
        container: null,
        progressBar: null,
        progressText: null,
        statusText: null,
        btnObsidian: null,
        btnTestConnection: null,

        selRangeMode: null,
        inputRangeStart: null,
        inputRangeEnd: null,

        chkOnlyOp: null,
        selImgFilter: null,
        inputUsers: null,
        inputInclude: null,
        inputExclude: null,
        inputMinLen: null,

        advancedWrap: null,
        obsidianWrap: null,

        // Obsidian 相关
        inputObsApiUrl: null,
        inputObsApiKey: null,
        inputObsDir: null,
        selObsImgMode: null,
        obsImgDirWrap: null,
        inputObsImgDir: null,

        downloadFallbackUrl: null,
        downloadFallbackName: null,
        btnFallback: null,

        init() {
            if (this.container) return;

            const wrap = document.createElement("div");
            wrap.id = "ld-export-panel";
            wrap.innerHTML = `
<div style="
  position:fixed;bottom:16px;right:16px;z-index:99999;
  width:320px;max-height:90vh;overflow-y:auto;overflow-x:hidden;
  background:linear-gradient(180deg,rgba(15,23,42,.95),rgba(30,41,59,.98));
  border:1px solid rgba(148,163,184,0.25);border-radius:18px;
  box-shadow:0 24px 60px rgba(2,6,23,.7),0 2px 6px rgba(0,0,0,.45);
  font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  font-size:13px;color:#e5e7eb;user-select:none;">

  <div id="ld-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px;border-bottom:1px solid rgba(148,163,184,0.15);cursor:pointer;">
    <span style="font-weight:800;font-size:14px;color:#f8fafc;"><span style="color:#a855f7;">▣</span> Linux.do Obsidian Export</span>
    <span id="ld-export-toggle" style="color:#94a3b8;font-size:14px;">▾</span>
  </div>

  <div id="ld-export-body" style="padding:10px 14px 14px;">
    <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(148,163,184,0.15);border-radius:10px;padding:8px 10px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <div id="ld-progress-bar" style="flex:1;height:6px;border-radius:99px;background:rgba(148,163,184,0.2);overflow:hidden;">
          <div id="ld-progress-fill" style="width:0%;height:100%;background:#7c3aed;transition:width .2s;"></div>
        </div>
        <span id="ld-progress-text" style="min-width:60px;text-align:right;font-size:11px;color:#a5b4fc;">准备就绪</span>
      </div>
      <div id="ld-status" style="margin-top:5px;font-size:11px;color:#6ee7b7;word-break:break-all;"></div>
    </div>

    <button id="ld-export-obsidian" style="
      width:100%;margin-bottom:10px;
      border:none;border-radius:10px;padding:11px 12px;
      font-size:13px;font-weight:700;cursor:pointer;color:white;
      background:#7c3aed;
    ">导出到 Obsidian</button>

    <div id="ld-fallback-wrap" style="display:none;margin-bottom:8px;">
      <a id="ld-fallback-btn" download style="
        display:block;text-align:center;width:100%;padding:9px 12px;
        border:1px dashed rgba(168,85,247,0.4);border-radius:999px;
        font-size:12px;font-weight:600;color:#c4b5fd;text-decoration:none;
        cursor:pointer;
      ">兜底下载（点击保存）</a>
    </div>

    <div id="ld-obsidian-toggle" style="
      display:flex;align-items:center;justify-content:space-between;
      padding:8px 0;cursor:pointer;font-size:12px;color:#cbd5e1;
      border-top:1px solid rgba(148,163,184,0.1);margin-top:4px;
    "><span>▸ Obsidian 连接设置</span><span id="ld-obsidian-arrow" style="font-size:10px;">▾</span></div>

    <div id="ld-obsidian-wrap" style="display:none;padding-top:8px;">
      <input id="ld-obs-api-url" type="text" placeholder="API 地址（默认 https://127.0.0.1:27124）" style="width:100%;margin-bottom:6px;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:8px 10px;font-size:12px;outline:none;" />
      <input id="ld-obs-api-key" type="password" placeholder="API Key（在 Obsidian 插件设置中获取）" style="width:100%;margin-bottom:6px;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:8px 10px;font-size:12px;outline:none;" />
      <button id="ld-test-connection" style="
        width:100%;margin-bottom:8px;
        border:1px solid rgba(124,58,237,0.5);border-radius:8px;padding:7px 12px;
        font-size:11px;font-weight:600;cursor:pointer;color:#c4b5fd;
        background:transparent;transition:all .3s;
      ">测试连接</button>
      <input id="ld-obs-dir" type="text" placeholder="导出目录（如 Linux.do）" style="width:100%;margin-bottom:6px;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:8px 10px;font-size:12px;outline:none;" />
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
        <span style="color:#cbd5e1;font-size:12px;white-space:nowrap;">图片模式：</span>
        <select id="ld-obs-img-mode" style="flex:1;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:6px 10px;font-size:12px;outline:none;">
          <option value="file">保存图片并引用（体积小）</option>
          <option value="base64">内嵌到笔记（单文件）</option>
          <option value="none">不导出图片（纯文字）</option>
        </select>
      </div>
      <div id="ld-obs-img-dir-wrap" style="display:none;margin-bottom:6px;">
        <input id="ld-obs-img-dir" type="text" placeholder="图片目录（如 Linux.do/attachments）" style="width:100%;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:8px 10px;font-size:12px;outline:none;" />
      </div>
      <div style="color:#94a3b8;font-size:10px;line-height:1.4;">
        提示：需安装 <a href="https://github.com/coddingtonbear/obsidian-local-rest-api" target="_blank" style="color:#60a5fa;">Local REST API</a> 插件
      </div>
    </div>

    <div id="ld-advanced-toggle" style="
      display:flex;align-items:center;justify-content:space-between;
      padding:8px 0;cursor:pointer;font-size:12px;color:#cbd5e1;
      border-top:1px solid rgba(148,163,184,0.1);margin-top:4px;
    "><span>▸ 高级筛选</span><span id="ld-advanced-arrow" style="font-size:10px;">▾</span></div>

    <div id="ld-advanced-wrap" style="display:none;padding-top:8px;">
      <div style="font-size:12px;font-weight:700;color:#e5e7eb;margin-bottom:8px;">楼层范围</div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <select id="ld-range-mode" style="background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:6px 10px;font-size:12px;outline:none;">
          <option value="all">全部楼层</option>
          <option value="range">指定范围</option>
        </select>
        <input id="ld-range-start" type="number" placeholder="起始" style="width:60px;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:6px 8px;font-size:12px;outline:none;" />
        <span style="color:#94a3b8;">-</span>
        <input id="ld-range-end" type="number" placeholder="结束" style="width:60px;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:6px 8px;font-size:12px;outline:none;" />
      </div>

      <div style="height:1px;background:rgba(148,163,184,0.1);margin:10px 0;"></div>

      <div style="font-size:12px;font-weight:700;color:#e5e7eb;margin-bottom:8px;">筛选条件</div>
      <div style="display:flex;gap:12px;margin-bottom:8px;">
        <label style="display:flex;align-items:center;gap:4px;color:#cbd5e1;font-size:12px;">
          <input id="ld-only-op" type="checkbox" style="accent-color:#7c3aed;" /> 只看楼主
        </label>
      </div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <span style="color:#cbd5e1;font-size:12px;white-space:nowrap;">图片筛选：</span>
        <select id="ld-img-filter" style="flex:1;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:6px 10px;font-size:12px;outline:none;">
          <option value="none">无（不筛选）</option>
          <option value="withImg">仅含图楼层</option>
          <option value="noImg">仅无图楼层</option>
        </select>
      </div>
      <input id="ld-users" type="text" placeholder="指定用户（逗号分隔）" style="width:100%;margin-bottom:6px;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:8px 10px;font-size:12px;outline:none;" />
      <input id="ld-include" type="text" placeholder="包含关键词（逗号分隔）" style="width:100%;margin-bottom:6px;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:8px 10px;font-size:12px;outline:none;" />
      <input id="ld-exclude" type="text" placeholder="排除关键词（逗号分隔）" style="width:100%;margin-bottom:6px;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:8px 10px;font-size:12px;outline:none;" />
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <span style="color:#cbd5e1;font-size:12px;">最少字数：</span>
        <input id="ld-minlen" type="number" placeholder="0" style="width:80px;background:rgba(15,23,42,0.8);color:#e5e7eb;border:1px solid rgba(148,163,184,0.3);border-radius:8px;padding:6px 8px;font-size:12px;outline:none;" />
      </div>
    </div>
  </div>
</div>`;
            document.body.appendChild(wrap);
            this.container = wrap;

            this.progressBar = wrap.querySelector("#ld-progress-fill");
            this.progressText = wrap.querySelector("#ld-progress-text");
            this.statusText = wrap.querySelector("#ld-status");
            this.btnObsidian = wrap.querySelector("#ld-export-obsidian");
            this.btnTestConnection = wrap.querySelector("#ld-test-connection");

            this.selRangeMode = wrap.querySelector("#ld-range-mode");
            this.inputRangeStart = wrap.querySelector("#ld-range-start");
            this.inputRangeEnd = wrap.querySelector("#ld-range-end");

            this.chkOnlyOp = wrap.querySelector("#ld-only-op");
            this.selImgFilter = wrap.querySelector("#ld-img-filter");
            this.inputUsers = wrap.querySelector("#ld-users");
            this.inputInclude = wrap.querySelector("#ld-include");
            this.inputExclude = wrap.querySelector("#ld-exclude");
            this.inputMinLen = wrap.querySelector("#ld-minlen");

            this.advancedWrap = wrap.querySelector("#ld-advanced-wrap");
            this.obsidianWrap = wrap.querySelector("#ld-obsidian-wrap");

            this.inputObsApiUrl = wrap.querySelector("#ld-obs-api-url");
            this.inputObsApiKey = wrap.querySelector("#ld-obs-api-key");
            this.inputObsDir = wrap.querySelector("#ld-obs-dir");
            this.selObsImgMode = wrap.querySelector("#ld-obs-img-mode");
            this.obsImgDirWrap = wrap.querySelector("#ld-obs-img-dir-wrap");
            this.inputObsImgDir = wrap.querySelector("#ld-obs-img-dir");

            this.btnFallback = wrap.querySelector("#ld-fallback-btn");

            // 恢复状态
            const rangeMode = GM_getValue(K.RANGE_MODE, DEFAULTS.rangeMode);
            const rangeStart = GM_getValue(K.RANGE_START, DEFAULTS.rangeStart);
            const rangeEnd = GM_getValue(K.RANGE_END, DEFAULTS.rangeEnd);
            const onlyOp = GM_getValue(K.FILTER_ONLY_OP, DEFAULTS.onlyOp);
            const imgFilter = GM_getValue(K.FILTER_IMG, DEFAULTS.imgFilter);
            const users = GM_getValue(K.FILTER_USERS, DEFAULTS.users);
            const include = GM_getValue(K.FILTER_INCLUDE, DEFAULTS.include);
            const exclude = GM_getValue(K.FILTER_EXCLUDE, DEFAULTS.exclude);
            const minLen = GM_getValue(K.FILTER_MINLEN, DEFAULTS.minLen);
            const obsDir = GM_getValue(K.OBS_DIR, DEFAULTS.obsDir);
            const obsImgMode = GM_getValue(K.OBS_IMG_MODE, DEFAULTS.obsImgMode);
            const obsImgDir = GM_getValue(K.OBS_IMG_DIR, DEFAULTS.obsImgDir);
            const obsApiUrl = GM_getValue(K.OBS_API_URL, DEFAULTS.obsApiUrl);
            const obsApiKey = GM_getValue(K.OBS_API_KEY, DEFAULTS.obsApiKey);

            this.selRangeMode.value = rangeMode;
            this.inputRangeStart.value = String(rangeStart);
            this.inputRangeEnd.value = String(rangeEnd);
            this.chkOnlyOp.checked = !!onlyOp;
            this.selImgFilter.value = imgFilter || DEFAULTS.imgFilter;
            this.inputUsers.value = users || "";
            this.inputInclude.value = include || "";
            this.inputExclude.value = exclude || "";
            this.inputMinLen.value = String(minLen || 0);
            this.inputObsDir.value = obsDir || "";
            this.selObsImgMode.value = obsImgMode || DEFAULTS.obsImgMode;
            this.inputObsImgDir.value = obsImgDir || "";
            this.inputObsApiUrl.value = obsApiUrl || "";
            this.inputObsApiKey.value = obsApiKey || "";
            this.obsImgDirWrap.style.display = obsImgMode === "file" ? "" : "none";

            // 面板折叠 - 点击整个标题栏即可展开/折叠
            const header = wrap.querySelector("#ld-header");
            const toggleIcon = wrap.querySelector("#ld-export-toggle");
            const bodyDiv = wrap.querySelector("#ld-export-body");
            const collapsed = GM_getValue(K.PANEL_COLLAPSED, false);
            if (collapsed) {
                bodyDiv.style.display = "none";
                toggleIcon.textContent = "▴";
            }

            header.addEventListener("click", () => {
                const isHidden = bodyDiv.style.display === "none";
                bodyDiv.style.display = isHidden ? "" : "none";
                toggleIcon.textContent = isHidden ? "▾" : "▴";
                GM_setValue(K.PANEL_COLLAPSED, !isHidden);
            });

            // Obsidian 设置面板展开（如果 API Key 为空则自动展开）
            const obsBtn = wrap.querySelector("#ld-obsidian-toggle");
            const obsArrow = wrap.querySelector("#ld-obsidian-arrow");
            const obsPanelOpen = GM_getValue(K.OBS_PANEL_OPEN, false);
            const obsApiKeyEmpty = !GM_getValue(K.OBS_API_KEY, "");
            // 如果 API Key 为空或用户之前展开过，则展开面板
            if (obsApiKeyEmpty || obsPanelOpen) {
                this.obsidianWrap.style.display = "";
                obsArrow.textContent = "▴";
            }
            obsBtn.addEventListener("click", () => {
                const open = this.obsidianWrap.style.display !== "none";
                this.obsidianWrap.style.display = open ? "none" : "";
                obsArrow.textContent = open ? "▾" : "▴";
                GM_setValue(K.OBS_PANEL_OPEN, !open);
            });

            // 高级设置展开
            const advBtn = wrap.querySelector("#ld-advanced-toggle");
            const advArrow = wrap.querySelector("#ld-advanced-arrow");
            const advOpen = GM_getValue(K.ADVANCED_OPEN, false);
            if (advOpen) {
                this.advancedWrap.style.display = "";
                advArrow.textContent = "▴";
            }
            advBtn.addEventListener("click", () => {
                const open = this.advancedWrap.style.display !== "none";
                this.advancedWrap.style.display = open ? "none" : "";
                advArrow.textContent = open ? "▾" : "▴";
                GM_setValue(K.ADVANCED_OPEN, !open);
            });

            // 保存配置事件
            const saveRange = () => {
                const mode = this.selRangeMode.value === "range" ? "range" : "all";
                const start = clampInt(this.inputRangeStart.value, 1, 999999, DEFAULTS.rangeStart);
                const end = clampInt(this.inputRangeEnd.value, 1, 999999, DEFAULTS.rangeEnd);
                GM_setValue(K.RANGE_MODE, mode);
                GM_setValue(K.RANGE_START, start);
                GM_setValue(K.RANGE_END, end);
                const disabled = mode !== "range";
                this.inputRangeStart.disabled = disabled;
                this.inputRangeEnd.disabled = disabled;
                this.inputRangeStart.style.opacity = disabled ? "0.55" : "1";
                this.inputRangeEnd.style.opacity = disabled ? "0.55" : "1";
            };
            this.selRangeMode.addEventListener("change", saveRange);
            this.inputRangeStart.addEventListener("change", saveRange);
            this.inputRangeEnd.addEventListener("change", saveRange);
            saveRange();

            const saveFilters = () => {
                GM_setValue(K.FILTER_ONLY_OP, !!this.chkOnlyOp.checked);
                GM_setValue(K.FILTER_IMG, this.selImgFilter.value || "none");
                GM_setValue(K.FILTER_USERS, this.inputUsers.value || "");
                GM_setValue(K.FILTER_INCLUDE, this.inputInclude.value || "");
                GM_setValue(K.FILTER_EXCLUDE, this.inputExclude.value || "");
                GM_setValue(K.FILTER_MINLEN, clampInt(this.inputMinLen.value, 0, 999999, 0));
            };
            [this.chkOnlyOp].forEach((el) => el.addEventListener("change", saveFilters));
            [this.selImgFilter].forEach((el) => el.addEventListener("change", saveFilters));
            [this.inputUsers, this.inputInclude, this.inputExclude, this.inputMinLen].forEach((el) => el.addEventListener("change", saveFilters));

            // Obsidian 配置保存
            this.inputObsDir.addEventListener("change", () => GM_setValue(K.OBS_DIR, this.inputObsDir.value || ""));
            this.inputObsImgDir.addEventListener("change", () => GM_setValue(K.OBS_IMG_DIR, this.inputObsImgDir.value || ""));
            this.inputObsApiUrl.addEventListener("change", () => GM_setValue(K.OBS_API_URL, this.inputObsApiUrl.value || ""));
            this.inputObsApiKey.addEventListener("change", () => GM_setValue(K.OBS_API_KEY, this.inputObsApiKey.value || ""));
            this.selObsImgMode.addEventListener("change", () => {
                const mode = this.selObsImgMode.value;
                GM_setValue(K.OBS_IMG_MODE, mode);
                this.obsImgDirWrap.style.display = mode === "file" ? "" : "none";
            });

            this.setProgress(0, 1, "准备就绪");
            this.setStatus("", "#6ee7b7");
            this.setBusy(false);
            this.clearDownloadFallback();
        },

        getSettings() {
            const rangeMode = this.selRangeMode.value === "range" ? "range" : "all";
            const rangeStart = clampInt(this.inputRangeStart.value, 1, 999999, DEFAULTS.rangeStart);
            const rangeEnd = clampInt(this.inputRangeEnd.value, 1, 999999, DEFAULTS.rangeEnd);

            const onlyOp = !!this.chkOnlyOp.checked;
            const imgFilter = this.selImgFilter.value || DEFAULTS.imgFilter;
            const users = this.inputUsers.value || "";
            const include = this.inputInclude.value || "";
            const exclude = this.inputExclude.value || "";
            const minLen = clampInt(this.inputMinLen.value, 0, 999999, 0);

            const obsDir = this.inputObsDir.value || DEFAULTS.obsDir;
            const obsImgMode = this.selObsImgMode.value || DEFAULTS.obsImgMode;
            const obsImgDir = this.inputObsImgDir.value || DEFAULTS.obsImgDir;
            const obsApiUrl = this.inputObsApiUrl.value || DEFAULTS.obsApiUrl;
            const obsApiKey = this.inputObsApiKey.value || "";

            return {
                rangeMode,
                rangeStart,
                rangeEnd,
                filters: { onlyOp, imgFilter, users, include, exclude, minLen },
                obsidian: { dir: obsDir, imgMode: obsImgMode, imgDir: obsImgDir, apiUrl: obsApiUrl, apiKey: obsApiKey },
            };
        },

        setProgress(completed, total, stageText) {
            if (!this.container) this.init();
            total = total || 1;
            const percent = Math.round((completed / total) * 100);
            this.progressBar.style.width = percent + "%";
            this.progressText.textContent = `${stageText} (${completed}/${total}，${percent}%)`;
        },

        setStatus(msg, color) {
            if (!this.container) this.init();
            this.statusText.textContent = msg;
            this.statusText.style.color = color || "#6ee7b7";
        },

        setBusy(busy) {
            if (!this.container) this.init();
            this.btnObsidian.disabled = busy;
            this.btnObsidian.style.opacity = busy ? "0.6" : "1";
            this.btnTestConnection.disabled = busy;
            this.btnTestConnection.style.opacity = busy ? "0.6" : "1";
        },

        setDownloadFallback(url, filename) {
            if (!this.container) this.init();
            if (this.downloadFallbackUrl) URL.revokeObjectURL(this.downloadFallbackUrl);
            this.downloadFallbackUrl = url;
            this.downloadFallbackName = filename;
            const wrap = this.container.querySelector("#ld-fallback-wrap");
            if (wrap) wrap.style.display = "";
            if (this.btnFallback) {
                this.btnFallback.href = url;
                this.btnFallback.download = filename;
                this.btnFallback.textContent = `兜底下载：${filename}`;
            }
        },

        clearDownloadFallback() {
            if (!this.container) return;
            const wrap = this.container.querySelector("#ld-fallback-wrap");
            if (wrap) wrap.style.display = "none";
            if (this.btnFallback) {
                this.btnFallback.href = "#";
                this.btnFallback.download = "";
                this.btnFallback.textContent = "兜底下载（点击保存）";
            }
        },
    };

    // -----------------------
    // 网络请求
    // -----------------------
    async function fetchJson(url, opts, retries = 2) {
        let lastErr = null;
        for (let i = 0; i <= retries; i++) {
            try {
                const res = await fetch(url, opts);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } catch (e) {
                lastErr = e;
                if (i < retries) await sleep(250 * (i + 1));
            }
        }
        throw lastErr || new Error("fetchJson failed");
    }

    function getRequestOpts() {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        const headers = { "x-requested-with": "XMLHttpRequest" };
        if (csrf) headers["x-csrf-token"] = csrf;
        return { headers };
    }

    // -----------------------
    // 拉取所有帖子
    // -----------------------
    async function fetchAllPostsDetailed(topicId) {
        const opts = getRequestOpts();

        const idData = await fetchJson(
            `${window.location.origin}/t/${topicId}/post_ids.json?post_number=0&limit=99999`,
            opts
        );
        let postIds = idData.post_ids || [];

        const mainData = await fetchJson(`${window.location.origin}/t/${topicId}.json`, opts);
        const mainFirstPost = mainData.post_stream?.posts?.[0];
        if (mainFirstPost && !postIds.includes(mainFirstPost.id)) postIds.unshift(mainFirstPost.id);

        const opUsername =
            mainData?.details?.created_by?.username ||
            mainData?.post_stream?.posts?.[0]?.username ||
            "";

        const domCategory = document.querySelector(".badge-category__name")?.textContent?.trim() || "";
        const domTags = Array.from(document.querySelectorAll(".discourse-tag"))
            .map((t) => t.textContent.trim())
            .filter(Boolean);

        const topic = {
            topicId: String(topicId || ""),
            title: mainData?.title ? String(mainData.title) : document.title,
            category: domCategory,
            tags:
                (Array.isArray(mainData?.tags) && mainData.tags.length
                    ? mainData.tags.map((t) =>
                          typeof t === "object" && t ? t.name || String(t) : String(t)
                      )
                    : domTags) || [],
            url: window.location.href,
            opUsername: opUsername || "",
        };

        let allPosts = [];
        for (let i = 0; i < postIds.length; i += 200) {
            const chunk = postIds.slice(i, i + 200);
            const q = chunk.map((id) => `post_ids[]=${encodeURIComponent(id)}`).join("&");
            const data = await fetchJson(
                `${window.location.origin}/t/${topicId}/posts.json?${q}&include_suggested=false`,
                opts
            );
            const posts = data.post_stream?.posts || [];
            allPosts = allPosts.concat(posts);
            ui.setProgress(Math.min(i + 200, postIds.length), postIds.length, "拉取帖子数据");
        }

        allPosts.sort((a, b) => a.post_number - b.post_number);
        return { topic, posts: allPosts };
    }

    // -----------------------
    // 筛选
    // -----------------------
    function postHasImageFast(post) {
        const cooked = post?.cooked || "";
        return cooked.includes("<img");
    }

    function buildPlainCache(posts) {
        const cache = new Map();
        for (const p of posts) {
            const text = cookedToObsidianMd(p.cooked || "", {}, {});
            cache.set(p.id, text || "");
        }
        return cache;
    }

    function applyFilters(topic, posts, settings) {
        const { rangeMode, rangeStart, rangeEnd, filters } = settings;
        const op = (topic.opUsername || "").toLowerCase();

        const wantUsers = new Set(normalizeListInput(filters.users).map((u) => u.toLowerCase()));
        const includeKws = normalizeListInput(filters.include);
        const excludeKws = normalizeListInput(filters.exclude);
        const minLen = clampInt(filters.minLen, 0, 999999, 0);

        const needTextCheck = includeKws.length > 0 || excludeKws.length > 0 || minLen > 0;
        const plainCache = needTextCheck ? buildPlainCache(posts) : null;

        const inRange = (n) => {
            if (rangeMode !== "range") return true;
            return n >= rangeStart && n <= rangeEnd;
        };

        const matchKeywords = (txt, kws) => {
            if (!kws.length) return true;
            const low = txt.toLowerCase();
            return kws.some((k) => low.includes(k.toLowerCase()));
        };

        const hitExclude = (txt, kws) => {
            if (!kws.length) return false;
            const low = txt.toLowerCase();
            return kws.some((k) => low.includes(k.toLowerCase()));
        };

        const selected = [];
        for (const p of posts) {
            const pn = p.post_number || 0;
            if (!inRange(pn)) continue;

            if (filters.onlyOp && op) {
                if ((p.username || "").toLowerCase() !== op) continue;
            }

            if (wantUsers.size) {
                if (!wantUsers.has((p.username || "").toLowerCase())) continue;
            }

            // 图片筛选
            if (filters.imgFilter === "withImg") {
                if (!postHasImageFast(p)) continue;
            } else if (filters.imgFilter === "noImg") {
                if (postHasImageFast(p)) continue;
            }

            if (needTextCheck) {
                const txt = plainCache.get(p.id) || "";
                if (minLen > 0 && txt.replace(/\s+/g, "").length < minLen) continue;
                if (!matchKeywords(txt, includeKws)) continue;
                if (hitExclude(txt, excludeKws)) continue;
            }

            selected.push(p);
        }

        return { selected, opUsername: topic.opUsername || "" };
    }

    function buildFilterSummary(settings, topic) {
        const { rangeMode, rangeStart, rangeEnd, filters } = settings;
        const parts = [];
        parts.push(rangeMode === "range" ? `范围=${rangeStart}-${rangeEnd}` : "范围=全部");
        if (filters.onlyOp) parts.push(`只楼主=@${topic.opUsername || "OP"}`);
        if (filters.imgFilter === "withImg") parts.push("仅含图");
        if (filters.imgFilter === "noImg") parts.push("仅无图");
        if ((filters.users || "").trim()) parts.push(`用户=${filters.users.trim()}`);
        if ((filters.include || "").trim()) parts.push(`包含=${filters.include.trim()}`);
        if ((filters.exclude || "").trim()) parts.push(`排除=${filters.exclude.trim()}`);
        if ((filters.minLen || 0) > 0) parts.push(`最短=${filters.minLen}`);
        return parts.join("；");
    }

    // -----------------------
    // 图片处理
    // -----------------------
    async function imageUrlToBase64(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const blob = await res.blob();

            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            return dataUrl;
        } catch (e) {
            console.error("图片转换失败:", url, e);
            return url;
        }
    }

    function collectImageUrlsFromPosts(posts) {
        const urlSet = new Set();

        for (const p of posts) {
            const div = document.createElement("div");
            div.innerHTML = p.cooked || "";
            div.querySelectorAll("img").forEach((img) => {
                const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
                const full = absoluteUrl(src);
                if (full) urlSet.add(full);

                const a = img.closest("a");
                if (a) {
                    const href = a.getAttribute("href") || "";
                    const h = absoluteUrl(href);
                    if (h && /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(h)) urlSet.add(h);
                }
            });
        }

        return Array.from(urlSet);
    }

    // -----------------------
    // Obsidian API
    // -----------------------
    async function writeToObsidian(path, content, settings) {
        const apiUrl = settings.obsidian.apiUrl || DEFAULTS.obsApiUrl;
        const apiKey = settings.obsidian.apiKey;

        if (!apiKey) throw new Error("请先配置 Obsidian API Key");

        const response = await fetch(`${apiUrl}/vault/${encodeURIComponent(path)}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "text/markdown",
            },
            body: content,
        });

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            throw new Error(`写入失败: ${response.status} ${response.statusText} ${text}`);
        }
        return response;
    }

    async function writeImageToObsidian(path, blob, settings) {
        const apiUrl = settings.obsidian.apiUrl || DEFAULTS.obsApiUrl;
        const apiKey = settings.obsidian.apiKey;

        if (!apiKey) throw new Error("请先配置 Obsidian API Key");

        const response = await fetch(`${apiUrl}/vault/${encodeURIComponent(path)}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": blob.type || "application/octet-stream",
            },
            body: blob,
        });

        if (!response.ok) {
            throw new Error(`图片写入失败: ${response.status}`);
        }
        return response;
    }

    async function testObsidianConnection() {
        const settings = ui.getSettings();
        const apiUrl = settings.obsidian.apiUrl || DEFAULTS.obsApiUrl;
        const apiKey = settings.obsidian.apiKey;
        const btn = ui.btnTestConnection;

        if (!apiKey) {
            ui.setStatus("⚠️ 请先填写 API Key", "#facc15");
            return;
        }

        // 保存原始状态
        const originalText = btn.textContent;
        const originalStyle = btn.style.cssText;

        // 测试中状态
        btn.textContent = "连接中...";
        btn.disabled = true;
        btn.style.opacity = "0.7";

        try {
            const response = await fetch(`${apiUrl}/`, {
                method: "GET",
                headers: { Authorization: `Bearer ${apiKey}` },
            });

            if (response.ok) {
                // 成功状态
                btn.textContent = "✓ 连接成功";
                btn.style.background = "#10b981";
                btn.style.color = "white";
                btn.style.borderColor = "#10b981";
                btn.style.opacity = "1";
                ui.setStatus("✅ Obsidian 连接正常", "#6ee7b7");
            } else if (response.status === 401) {
                throw new Error("API Key 无效");
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (e) {
            // 失败状态
            btn.textContent = "✗ " + e.message;
            btn.style.background = "#ef4444";
            btn.style.color = "white";
            btn.style.borderColor = "#ef4444";
            btn.style.opacity = "1";
            ui.setStatus(`❌ 连接失败: ${e.message}`, "#fecaca");
        }

        // 3 秒后恢复
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.cssText = originalStyle;
            btn.disabled = false;
        }, 3000);
    }

    // -----------------------
    // Markdown 生成
    // -----------------------
    function escapeYaml(str) {
        return String(str || "").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    }

    function generateObsidianMarkdown(topic, posts, settings, imgMap, filterSummary) {
        const now = new Date();

        // 合并原有 tags 和 linuxdo，去重
        const allTags = [...new Set([...(topic.tags || []), "linuxdo"])];
        const tagsYaml = allTags.map((t) => `  - "${escapeYaml(t)}"`).join("\n");

        const frontmatter = `---
title: "${escapeYaml(topic.title || "")}"
topic_id: ${topic.topicId || 0}
url: "${topic.url || ""}"
author: "${escapeYaml(topic.opUsername || "")}"
category: "${escapeYaml(topic.category || "")}"
tags:
${tagsYaml}
export_time: "${now.toISOString()}"
floors: ${posts.length}
---

`;

        let content = `# ${topic.title || "无标题"}\n\n`;
        content += `> [!info] 帖子信息\n`;
        content += `> - **原始链接**: [${topic.url || ""}](${topic.url || ""})\n`;
        content += `> - **主题 ID**: ${topic.topicId || 0}\n`;
        content += `> - **楼主**: @${topic.opUsername || "未知"}\n`;
        content += `> - **分类**: ${topic.category || "无"}\n`;
        content += `> - **标签**: ${allTags.join(", ")}\n`;
        content += `> - **导出时间**: ${now.toLocaleString("zh-CN")}\n`;
        content += `> - **楼层数**: ${posts.length}\n`;
        if (filterSummary) {
            content += `> - **筛选条件**: ${filterSummary}\n`;
        }
        content += "\n";

        for (const p of posts) {
            content += generatePostCallout(p, topic, settings, imgMap);
            content += "\n";
        }

        return frontmatter + content;
    }

    function generatePostCallout(post, topic, settings, imgMap) {
        const isOp = (post.username || "").toLowerCase() === (topic.opUsername || "").toLowerCase();
        const dateStr = post.created_at ? new Date(post.created_at).toLocaleString("zh-CN") : "";

        const calloutType = isOp ? "success" : "note";
        const opBadge = isOp ? " 🏠 楼主" : "";

        let title = `#${post.post_number} ${post.name || post.username || "匿名"}`;
        if (post.name && post.username && post.name !== post.username) {
            title += ` (@${post.username})`;
        }
        title += opBadge;
        if (dateStr) title += ` · ${dateStr}`;

        let md = `> [!${calloutType}]+ ${title}\n`;

        if (post.reply_to_post_number) {
            md += `> > 回复 [[#^floor-${post.reply_to_post_number}|#${post.reply_to_post_number}楼]]\n>\n`;
        }

        const bodyMd = cookedToObsidianMd(post.cooked, settings, imgMap);
        const lines = bodyMd.split("\n");
        for (const line of lines) {
            md += `> ${line}\n`;
        }

        md += `> ^floor-${post.post_number}\n`;

        return md;
    }

    // -----------------------
    // 导出主流程
    // -----------------------
    async function exportObsidianMarkdown() {
        const topicId = getTopicId();
        if (!topicId) return alert("未检测到帖子 ID");

        ui.init();
        ui.clearDownloadFallback();
        ui.setBusy(true);
        ui.setStatus("正在拉取帖子内容…", "#a855f7");
        ui.setProgress(0, 1, "准备中");

        try {
            const settings = ui.getSettings();

            if (!settings.obsidian.apiKey) {
                // 自动展开 Obsidian 设置面板
                ui.obsidianWrap.style.display = "";
                ui.container.querySelector("#ld-obsidian-arrow").textContent = "▴";
                GM_setValue(K.OBS_PANEL_OPEN, true);

                ui.setStatus("⚠️ 请先配置 Obsidian 连接", "#facc15");
                ui.setBusy(false);
                return;
            }

            const data = await fetchAllPostsDetailed(topicId);
            // 范围合法性检查
            if (settings.rangeMode === "range" && settings.rangeStart > settings.rangeEnd) {
                ui.setStatus("⚠️ 起始楼层不能大于结束楼层", "#facc15");
                ui.setBusy(false);
                return;
            }

            const { selected } = applyFilters(data.topic, data.posts, settings);

            if (!selected.length) {
                ui.setStatus("筛选后无可导出的楼层", "#facc15");
                ui.setBusy(false);
                return;
            }

            // none 模式下跳过图片收集以优化性能
            const imgUrls = settings.obsidian.imgMode === "none"
                ? []
                : collectImageUrlsFromPosts(selected);
            let imgMap = {};

            if (settings.obsidian.imgMode === "base64" && imgUrls.length > 0) {
                ui.setStatus("正在下载图片（Base64 模式）…", "#a855f7");
                let done = 0;
                for (const url of imgUrls) {
                    try {
                        const dataUrl = await imageUrlToBase64(url);
                        imgMap[url] = dataUrl;
                    } catch (e) {
                        console.warn("图片下载失败:", url, e);
                        imgMap[url] = url;
                    }
                    done++;
                    ui.setProgress(done, imgUrls.length, "下载图片");
                }
            } else if (settings.obsidian.imgMode === "file" && imgUrls.length > 0) {
                ui.setStatus("正在下载并保存图片到 Obsidian…", "#a855f7");
                const imgDir = settings.obsidian.imgDir || DEFAULTS.obsImgDir;
                const topicImgDir = `${imgDir}/${topicId}`;
                let done = 0;

                for (const url of imgUrls) {
                    try {
                        const urlObj = new URL(url);
                        let ext = urlObj.pathname.split(".").pop() || "png";
                        if (ext.length > 5 || !/^[a-z0-9]+$/i.test(ext)) ext = "png";
                        const filename = `${Date.now()}-${done}.${ext}`;
                        const fullPath = `${topicImgDir}/${filename}`;

                        const response = await fetch(url);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const blob = await response.blob();

                        await writeImageToObsidian(fullPath, blob, settings);
                        imgMap[url] = fullPath;
                    } catch (e) {
                        console.warn("图片保存失败:", url, e);
                        imgMap[url] = null;
                    }
                    done++;
                    ui.setProgress(done, imgUrls.length, "保存图片");
                }
            }

            ui.setStatus("正在生成 Markdown…", "#a855f7");
            const filterSummary = buildFilterSummary(settings, data.topic);
            const markdown = generateObsidianMarkdown(data.topic, selected, settings, imgMap, filterSummary);

            const safeTitle = (data.topic.title || "untitled")
                .replace(/[\\/:*?"<>|]/g, "_")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 80);
            const dir = settings.obsidian.dir || DEFAULTS.obsDir;
            const filename = `${safeTitle}-${data.topic.topicId}.md`;
            const fullPath = `${dir}/${filename}`;

            ui.setStatus("正在写入 Obsidian…", "#a855f7");
            await writeToObsidian(fullPath, markdown, settings);

            ui.setProgress(1, 1, "导出完成");
            ui.setStatus(`✅ 已导出到 Obsidian: ${fullPath}`, "#6ee7b7");
        } catch (e) {
            console.error(e);
            ui.setStatus("导出失败：" + (e?.message || e), "#fecaca");
            alert("Obsidian 导出失败：" + (e?.message || e));
        } finally {
            ui.setBusy(false);
        }
    }

    // -----------------------
    // 入口
    // -----------------------
    function init() {
        const topicId = getTopicId();
        if (!topicId) return;

        ui.init();

        ui.btnObsidian.addEventListener("click", exportObsidianMarkdown);
        ui.btnTestConnection.addEventListener("click", testObsidianConnection);
    }

    window.addEventListener("load", init);
})();
