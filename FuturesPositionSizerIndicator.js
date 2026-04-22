const predef = require("./tools/predef");
const meta   = require("./tools/meta");

class FuturesPositionSizer {

    init() {}

    map(d, i, history) {
        const entryPrice = d.close();
        const stopPrice  = this.props.stopPrice;

        const riskAmountUSD      = this.props.accountCapital * this.props.riskPercent / 100;
        const priceDiff          = Math.abs(entryPrice - stopPrice);
        const stopTicksRaw       = this.props.tickSize > 0 ? priceDiff / this.props.tickSize : 0;
        const stopTicks          = isFinite(stopTicksRaw) ? stopTicksRaw : 0;
        const riskPerContractUSD = stopTicks * this.props.tickValue;

        const contracts =
            riskPerContractUSD > 0
                ? Math.max(0, Math.floor(riskAmountUSD / riskPerContractUSD))
                : 0;

        const isBuy = stopPrice < entryPrice;

        return {
            stopLine:        stopPrice,
            contracts:       contracts,
            stopTicks:       Math.round(stopTicks * 10) / 10,
            riskPerContract: Math.round(riskPerContractUSD * 100) / 100,
            riskTotal:       Math.round(riskAmountUSD * 100) / 100,
            // BUY=1, SELL=-1 → látható a legendben
            direction:       isBuy ? 1 : -1
        };
    }
}

module.exports = {
    name:        "FuturesPositionSizerInd",
    description: "Futures Position Sizer (live price)",
    calculator:  FuturesPositionSizer,

    inputType: meta.InputType.BARS,

    params: {
        stopPrice:      predef.paramSpecs.number(0, 0.25, 0.0001),
        accountCapital: predef.paramSpecs.number(10000, 100, 1),
        riskPercent:    predef.paramSpecs.number(1.0, 0.1, 0.1),
        tickSize:       predef.paramSpecs.number(0.25, 0.01, 0.0001),
        tickValue:      predef.paramSpecs.number(12.5, 0.01, 0.01)
    },

    plots: {
        stopLine:        { title: "Stop"         },
        contracts:       { title: "Contracts"    },
        stopTicks:       { title: "Ticks"        },
        riskPerContract: { title: "Risk/Ctr $"   },
        riskTotal:       { title: "Risk $"       },
        direction:       { title: "Dir(1=B-1=S)" }
    },

    plotter: [
        predef.plotters.singleline("stopLine")
    ],

    schemeStyles: {
        dark: {
            stopLine: { color: "#ff4444", lineWidth: 2, lineStyle: 2 }
        },
        light: {
            stopLine: { color: "#cc0000", lineWidth: 2, lineStyle: 2 }
        }
    },

    tags: ["My Indicators"]
};
