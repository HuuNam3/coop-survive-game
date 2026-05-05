export class MathUtil {

    /**
     * Convert number to short format
     * 3500 -> 3.5K
     * 3500000 -> 3.5M
     * 3500000000 -> 3.5B
     */
    static formatNumber(value: number): string {
        if (value < 1000) return value.toString();

        const units = [
            { value: 1e9, symbol: 'B' },
            { value: 1e6, symbol: 'M' },
            { value: 1e3, symbol: 'K' },
        ];

        for (const unit of units) {
            if (value >= unit.value) {
                const result = value / unit.value;

                // giữ 1 số lẻ nếu cần
                const formatted = result % 1 === 0
                    ? result.toString()
                    : result.toFixed(1);

                return `${formatted}${unit.symbol}`;
            }
        }

        return value.toString();
    }

}