// NOTE: Purpose of this is to mimic C++ float point precision in TypeScript

export class Float32 {
    private value: number;

    constructor(value: number) {
        this.value = Math.fround(value); // Ensure 32-bit precision
    }

    static add(a: Float32, b: Float32): Float32 {
        return new Float32(Math.fround(a.value + b.value));
    }

    static subtract(a: Float32, b: Float32): Float32 {
        return new Float32(Math.fround(a.value - b.value));
    }

    static multiply(a: Float32, b: Float32): Float32 {
        return new Float32(Math.fround(a.value * b.value));
    }

    static divide(a: Float32, b: Float32): Float32 {
        return new Float32(Math.fround(a.value / b.value));
    }

    static pow(base: Float32, exponent: number): Float32 {
        return new Float32(Math.fround(Math.pow(base.value, exponent)));
    }

    static sqrt(a: Float32): Float32 {
        return new Float32(Math.fround(Math.sqrt(a.value)));
    }

    static exp(a: Float32): Float32 {
        return new Float32(Math.fround(Math.exp(a.value)));
    }

    static max(a: Float32, b: Float32): Float32 {
        return new Float32(Math.fround(Math.max(a.value, b.value)));
    }

    toNumber(): number {
        return this.value;
    }
}
