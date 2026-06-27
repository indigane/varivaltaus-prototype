export function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        return true;
    } catch (error) {
        console.error(`❌ ${name}`);
        console.error(error);
        return false;
    }
}

export function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message || "Assertion failed"}: expected ${expected}, got ${actual}`);
    }
}
