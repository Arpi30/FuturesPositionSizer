const predef = require("./tools/predef");
const { du, px, op } = require("./tools/graphics");

/**
 * Futures Position Sizer Drawing Tool
 *
 * Instrument választó (instrument paraméter):
 *   1 = MNQ  tick: 0.25  value: $0.50
 *   2 = MGC  tick: 0.10  value: $1.00
 *   3 = MES  tick: 0.25  value: $1.25
 *   4 = M2K  tick: 0.10  value: $0.50
 *   5 = MCL  tick: 0.01  value: $1.00
 *   6 = NQ   tick: 0.25  value: $5.00
 *   7 = ES   tick: 0.25  value: $12.50
 *   8 = GC   tick: 0.10  value: $10.00
 *
 * 4 anchor:
 *   anchors[0] = entry ár
 *   anchors[1] = stop ár
 *   anchors[2] = info panel pozíciója (szabadon húzható)
 *   anchors[3] = target ár (opcionális, R:R számításhoz)
 */

const INSTRUMENTS = {
    1: { name: "MNQ",  tickSize: 0.25, tickValue: 0.50  },
    2: { name: "MGC",  tickSize: 0.10, tickValue: 1.00  },
    3: { name: "MES",  tickSize: 0.25, tickValue: 1.25  },
    4: { name: "M2K",  tickSize: 0.10, tickValue: 0.50  },
    5: { name: "MCL",  tickSize: 0.01, tickValue: 1.00  },
    6: { name: "NQ",   tickSize: 0.25, tickValue: 5.00  },
    7: { name: "ES",   tickSize: 0.25, tickValue: 12.50 },
    8: { name: "GC",   tickSize: 0.10, tickValue: 10.00 }
};

// Panel méret konstansok
const ROW_H  = 18;  // sorok közti távolság px
const PAD    = 10;  // belső margó px
const COL2   = 120; // value oszlop kezdete px
const W      = 220; // panel szélesség px

const FuturesPositionSizer = {
    init() {
        return {};
    },

    render({ anchors, props }) {
        if (!anchors || anchors.length === 0) {
            return { items: [] };
        }

        const entryAnchor  = anchors[0];
        const stopAnchor   = anchors[1] || anchors[0];
        const panelAnchor  = anchors[2] || anchors[0];
        const targetAnchor = anchors[3] || null;

        const entryPrice  = entryAnchor.y.value;
        const stopPrice   = stopAnchor.y.value;
        const targetPrice = targetAnchor ? targetAnchor.y.value : null;

        const inst      = INSTRUMENTS[props.instrument] || INSTRUMENTS[1];
        const tickSize  = inst.tickSize;
        const tickValue = inst.tickValue;

        const riskAmountUSD      = props.accountCapital * props.riskPercent / 100;
        const priceDiff          = Math.abs(entryPrice - stopPrice);
        const stopTicksRaw       = priceDiff / tickSize;
        const stopTicks          = isFinite(stopTicksRaw) ? stopTicksRaw : 0;
        const riskPerContractUSD = stopTicks * tickValue;
        const contracts          = riskPerContractUSD > 0
            ? Math.max(0, Math.floor(riskAmountUSD / riskPerContractUSD))
            : 0;

        const direction = stopPrice < entryPrice ? "BUY" : "SELL";
        const dirColor  = direction === "BUY" ? props.buyColor : props.sellColor;
        const precision = getPrecision(tickSize);

        // R:R számítás (csak ha van target anchor)
        const riskDist   = Math.abs(entryPrice - stopPrice);
        const rewardDist = targetPrice !== null ? Math.abs(targetPrice - entryPrice) : null;
        const rrRatio    = (rewardDist !== null && riskDist > 0)
            ? rewardDist / riskDist
            : null;

        // Panel sorok
        const rows = [
            { label: "INSTRUMENT", value: inst.name,                          valueColor: "#ffffff"       },
            { label: "DIRECTION",  value: direction,                           valueColor: dirColor        },
            { label: "ENTRY",      value: formatNum(entryPrice, precision),    valueColor: props.entryColor},
            { label: "STOP",       value: formatNum(stopPrice, precision),     valueColor: props.stopColor },
            { label: "CONTRACTS",  value: String(contracts),                   valueColor: props.contractColor, bold: true },
            { label: "TICKS",      value: formatNum(stopTicks, 1),             valueColor: props.textColor },
            { label: "RISK/CTR",   value: `$${formatNum(riskPerContractUSD, 2)}`, valueColor: props.textColor },
            { label: "RISK TOTAL", value: `$${formatNum(riskAmountUSD, 2)}`,   valueColor: "#ffcc00"       },
            { label: "CAPITAL",    value: `$${formatNum(props.accountCapital, 0)}`, valueColor: props.textColor },
            { label: "RISK %",     value: `${formatNum(props.riskPercent, 1)}%`, valueColor: props.textColor },
            ...(targetPrice !== null ? [
                { label: "TARGET",  value: formatNum(targetPrice, precision),      valueColor: props.targetColor },
                { label: "R:R",     value: `1 : ${formatNum(rrRatio, 2)}`,         valueColor: rrRatio >= 2 ? "#00cc66" : rrRatio >= 1 ? "#ffcc00" : "#ff4444", bold: true },
            ] : []),
        ];

        const panelH = PAD * 2 + rows.length * ROW_H + ROW_H; // fejléc + sorok

        const items = [
            // ── Entry vonal ──────────────────────────────────────────────────
            {
                tag: "LineSegments",
                key: "entryLine",
                lines: [{
                    tag: "Line",
                    a: { x: du(0), y: du(entryPrice) },
                    b: { x: du(1), y: du(entryPrice) },
                    infiniteStart: true,
                    infiniteEnd: true
                }],
                lineStyle: { color: props.entryColor, width: 1 }
            },

            // ── Stop vonal ───────────────────────────────────────────────────
            {
                tag: "LineSegments",
                key: "stopLine",
                lines: [{
                    tag: "Line",
                    a: { x: du(0), y: du(stopPrice) },
                    b: { x: du(1), y: du(stopPrice) },
                    infiniteStart: true,
                    infiniteEnd: true
                }],
                lineStyle: { color: props.stopColor, width: 2, lineStyle: 2 }
            },

            // ── Target vonal (opcionális) ─────────────────────────────────────
            ...(targetPrice !== null ? [{
                tag: "LineSegments",
                key: "targetLine",
                lines: [{
                    tag: "Line",
                    a: { x: du(0), y: du(targetPrice) },
                    b: { x: du(1), y: du(targetPrice) },
                    infiniteStart: true,
                    infiniteEnd: true
                }],
                lineStyle: { color: props.targetColor, width: 2, lineStyle: 1 }
            }] : []),

            // ── Panel keret (anchor = bal felső sarok, box lefelé és jobbra nő) ──
            // Felső él
            {
                tag: "LineSegments",
                key: "boxTop",
                lines: [{
                    tag: "Line",
                    a: { x: op(panelAnchor.x, "+", px(0)), y: op(panelAnchor.y, "+", px(0)) },
                    b: { x: op(panelAnchor.x, "+", px(W)), y: op(panelAnchor.y, "+", px(0)) }
                }],
                lineStyle: { color: "#555577", width: 1 }
            },
            // Alsó él
            {
                tag: "LineSegments",
                key: "boxBottom",
                lines: [{
                    tag: "Line",
                    a: { x: op(panelAnchor.x, "+", px(0)), y: op(panelAnchor.y, "+", px(panelH)) },
                    b: { x: op(panelAnchor.x, "+", px(W)), y: op(panelAnchor.y, "+", px(panelH)) }
                }],
                lineStyle: { color: "#555577", width: 1 }
            },
            // Bal él
            {
                tag: "LineSegments",
                key: "boxLeft",
                lines: [{
                    tag: "Line",
                    a: { x: op(panelAnchor.x, "+", px(0)), y: op(panelAnchor.y, "+", px(0)) },
                    b: { x: op(panelAnchor.x, "+", px(0)), y: op(panelAnchor.y, "+", px(panelH)) }
                }],
                lineStyle: { color: "#555577", width: 1 }
            },
            // Jobb él
            {
                tag: "LineSegments",
                key: "boxRight",
                lines: [{
                    tag: "Line",
                    a: { x: op(panelAnchor.x, "+", px(W)), y: op(panelAnchor.y, "+", px(0)) },
                    b: { x: op(panelAnchor.x, "+", px(W)), y: op(panelAnchor.y, "+", px(panelH)) }
                }],
                lineStyle: { color: "#555577", width: 1 }
            },
            // Fejléc elválasztó vonal
            {
                tag: "LineSegments",
                key: "boxDivider",
                lines: [{
                    tag: "Line",
                    a: { x: op(panelAnchor.x, "+", px(0)), y: op(panelAnchor.y, "+", px(ROW_H + PAD)) },
                    b: { x: op(panelAnchor.x, "+", px(W)), y: op(panelAnchor.y, "+", px(ROW_H + PAD)) }
                }],
                lineStyle: { color: "#555577", width: 1 }
            },

            // ── Panel fejléc (felül, anchor alatt) ───────────────────────────
            {
                tag: "Text",
                key: "panelHeader",
                point: {
                    x: op(panelAnchor.x, "+", px(W / 2)),
                    y: op(panelAnchor.y, "+", px(PAD + ROW_H / 2))
                },
                text: `POSITION SIZER`,
                style: { fontSize: 11, fontWeight: "bold", fill: "#aaaacc" },
                textAlignment: "centerMiddle"
            },
        ];

        // ── Táblázat sorok (lefelé növekvő Y) ────────────────────────────────
        rows.forEach((row, idx) => {
            const yOffset = PAD + ROW_H + PAD + idx * ROW_H + ROW_H / 2;

            // Label (bal oszlop)
            items.push({
                tag: "Text",
                key: `rowLabel_${idx}`,
                point: {
                    x: op(panelAnchor.x, "+", px(PAD)),
                    y: op(panelAnchor.y, "+", px(yOffset))
                },
                text: row.label,
                style: { fontSize: 10, fontWeight: "normal", fill: "#888899" },
                textAlignment: "leftMiddle"
            });

            // Érték (jobb oszlop)
            items.push({
                tag: "Text",
                key: `rowValue_${idx}`,
                point: {
                    x: op(panelAnchor.x, "+", px(COL2)),
                    y: op(panelAnchor.y, "+", px(yOffset))
                },
                text: row.value,
                style: {
                    fontSize: row.bold ? 12 : 11,
                    fontWeight: row.bold ? "bold" : "normal",
                    fill: row.valueColor
                },
                textAlignment: "leftMiddle"
            });

            // Sor elválasztó
            if (idx < rows.length - 1) {
                items.push({
                    tag: "LineSegments",
                    key: `rowLine_${idx}`,
                    lines: [{
                        tag: "Line",
                        a: { x: op(panelAnchor.x, "+", px(PAD)),     y: op(panelAnchor.y, "+", px(yOffset + ROW_H / 2)) },
                        b: { x: op(panelAnchor.x, "+", px(W - PAD)), y: op(panelAnchor.y, "+", px(yOffset + ROW_H / 2)) }
                    }],
                    lineStyle: { color: "#333344", width: 1 }
                });
            }
        });

        return { items };
    },

    tooltips({ anchors, props }) {
        if (!anchors || anchors.length < 2) {
            return [{
                title: "Position Sizer",
                content: [
                    "1. anchor = entry ár",
                    "2. anchor = stop ár",
                    "3. anchor = info panel pozíció",
                    "",
                    "Instrument: 1=MNQ 2=MGC 3=MES",
                    "            4=M2K 5=MCL 6=NQ",
                    "            7=ES  8=GC"
                ]
            }];
        }

        const inst      = INSTRUMENTS[props.instrument] || INSTRUMENTS[1];
        const tickSize  = inst.tickSize;
        const tickValue = inst.tickValue;

        const entryPrice         = anchors[0].y.value;
        const stopPrice          = anchors[1].y.value;
        const riskAmountUSD      = props.accountCapital * props.riskPercent / 100;
        const priceDiff          = Math.abs(entryPrice - stopPrice);
        const stopTicks          = priceDiff / tickSize;
        const riskPerContractUSD = stopTicks * tickValue;
        const contracts          = riskPerContractUSD > 0
            ? Math.max(0, Math.floor(riskAmountUSD / riskPerContractUSD))
            : 0;
        const direction = stopPrice < entryPrice ? "BUY" : "SELL";

        return [{
            title: `Position Sizer – ${inst.name}`,
            content: [
                `Direction: ${direction}`,
                `Entry: ${formatNum(entryPrice, getPrecision(tickSize))}`,
                `Stop: ${formatNum(stopPrice, getPrecision(tickSize))}`,
                `Ticks: ${formatNum(stopTicks, 1)}`,
                `Risk $: ${formatNum(riskAmountUSD, 2)}`,
                `Risk/Ctr: $${formatNum(riskPerContractUSD, 2)}`,
                `Contracts: ${contracts}`,
                ...(anchors[3] ? [`R:R: 1 : ${formatNum(Math.abs(anchors[3].y.value - entryPrice) / priceDiff, 2)}`] : [])
            ]
        }];
    },

    anchorStyles() {
        return [
            { color: "#4da3ff" }, // entry
            { color: "#ff4d4d" }, // stop
            { color: "#aaaacc" }, // panel
            { color: "#00cc66" }  // target
        ];
    }
};

function formatNum(v, p) {
    return Number(v).toFixed(p);
}

function getPrecision(tickSize) {
    const s = String(tickSize);
    const i = s.indexOf(".");
    return i === -1 ? 0 : s.length - i - 1;
}

module.exports = {
    name:        "FuturesPositionSizer",
    description: "Futures Position Sizer (visual calculator)",
    drawing:     FuturesPositionSizer,

    params: {
        // 1=MNQ 2=MGC 3=MES 4=M2K 5=MCL 6=NQ 7=ES 8=GC
        instrument:    predef.paramSpecs.number(1, 1, 1),
        accountCapital: predef.paramSpecs.number(10000, 5000, 1),
        riskPercent:    predef.paramSpecs.number(1.0, 0.1, 0.1),

        entryColor:    predef.paramSpecs.color("#4da3ff"),
        stopColor:     predef.paramSpecs.color("#ff4444"),
        targetColor:   predef.paramSpecs.color("#00cc66"),
        buyColor:      predef.paramSpecs.color("#00cc66"),
        sellColor:     predef.paramSpecs.color("#ff4444"),
        contractColor: predef.paramSpecs.color("#00d4ff"),
        textColor:     predef.paramSpecs.color("#e6e6e6")
    },

    tags: ["My Tools"],
    minN: 3,
    maxN: 4
};
