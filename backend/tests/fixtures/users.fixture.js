const {
    createTestUser,
    createAuthenticatedUser,
} = require("../helpers/auth");

const createUserFixture = async (options = {}) => {
    return createTestUser({
        name: options.name || "Fixture User",
        email:
            options.email ||
            `fixture-user-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}@example.com`,
        password: options.password || "Test@123456",
    });
};

const createAuthenticatedUserFixture = async (options = {}) => {
    return createAuthenticatedUser({
        name: options.name || "Fixture Auth User",
        email:
            options.email ||
            `fixture-auth-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}@example.com`,
        password: options.password || "Test@123456",
    });
};

module.exports = {
    createUserFixture,
    createAuthenticatedUserFixture,
};