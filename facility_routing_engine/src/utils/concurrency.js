/**
 * Lightweight Promise Concurrency Pool.
 * Executes an array of async task generators with bounded concurrency to prevent server flooding.
 * 
 * @param {Array<() => Promise<T>>} taskGenerators Array of zero-arg functions returning promises
 * @param {number} concurrencyLimit Maximum number of active parallel promises
 * @returns {Promise<Array<T>>}
 */
async function runWithConcurrencyLimit(taskGenerators, concurrencyLimit = 5) {
    if (!Array.isArray(taskGenerators) || taskGenerators.length === 0) {
        return [];
    }

    const limit = Math.max(1, Math.min(concurrencyLimit, taskGenerators.length));
    const results = new Array(taskGenerators.length);
    let currentIndex = 0;

    async function worker() {
        while (currentIndex < taskGenerators.length) {
            const index = currentIndex++;
            try {
                results[index] = await taskGenerators[index]();
            } catch (err) {
                // Return rejection or captured error in place
                results[index] = { error: err };
            }
        }
    }

    const workers = Array.from({ length: limit }, () => worker());
    await Promise.all(workers);

    return results;
}

module.exports = {
    runWithConcurrencyLimit
};
