const request = require("./request");

const createTestUser = async ({
    name = "Test User",
    email = `test-${Date.now()}@example.com`,
    password = "Test@123456",
} = {}) => {
    const response = await request
        .post("/api/auth/register")
        .send({
            name,
            email,
            password,
        });

    if (response.status !== 201) {
        throw new Error(
            `Falha ao criar usuário de teste: ${JSON.stringify(response.body)}`
        );
    }

    return {
        id: response.body.data.user.id,
        name,
        email,
        password,
    };
};

const loginTestUser = async ({
    email,
    password,
}) => {
    const response = await request
        .post("/api/auth/login")
        .send({
            email,
            password,
        });

    if (response.status !== 200) {
        throw new Error(
            `Falha ao realizar login de teste: ${JSON.stringify(response.body)}`
        );
    }

    return {
        token: response.body.data.token,
        user: response.body.data.user,
    };
};

const createAuthenticatedUser = async (options = {}) => {
    const user = await createTestUser(options);

    const auth = await loginTestUser({
        email: user.email,
        password: user.password,
    });

    return {
        user,
        token: auth.token,
    };
};

module.exports = {
    createTestUser,
    loginTestUser,
    createAuthenticatedUser,
};