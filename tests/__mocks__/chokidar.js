// Mock for chokidar - we don't test file watching in unit tests
module.exports = {
    watch: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        close: jest.fn()
    }))
};
