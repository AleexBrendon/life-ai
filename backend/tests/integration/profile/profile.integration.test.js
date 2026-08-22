import {
    beforeAll,
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

const request = require("../../helpers/request");

const {
    createAuthenticatedUser,
} = require("../../helpers/auth");

const {
    prisma,
    connectDatabase,
    disconnectDatabase,
} = require("../../helpers/database");

const {
    cleanupDatabase,
} = require("../../helpers/cleanup");

describe("Profile — Integration Tests", () => {
    beforeAll(async () => {
        await connectDatabase();
    });

    beforeEach(async () => {
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
        await disconnectDatabase();
    });





    describe("GET /api/users/me", () => {
        it("deve retornar o usuário autenticado sem perfil inicialmente", async () => {
            const auth = await createAuthenticatedUser({
                email: "profile-get@example.com",
            });

            const response = await request
                .get("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                );

            expect(response.status).toBe(200);

            expect(response.body.success).toBe(true);

            expect(response.body.data.user).toMatchObject({
                id: auth.user.id,
                name: auth.user.name,
                email: auth.user.email,
                profile: null,
            });
        });

        it("deve rejeitar requisição sem autenticação", async () => {
            const response = await request.get(
                "/api/users/me"
            );

            expect(response.status).toBe(401);

            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar token inválido", async () => {
            const response = await request
                .get("/api/users/me")
                .set(
                    "Authorization",
                    "Bearer token-invalido"
                );

            expect(response.status).toBe(401);

            expect(response.body.success).toBe(false);
        });
    });





    describe("PUT /api/users/me", () => {
        it("deve atualizar o nome do usuário", async () => {
            const auth = await createAuthenticatedUser({
                email: "profile-name@example.com",
            });

            const response = await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    name: "Nome Atualizado",
                });

            expect(response.status).toBe(200);

            expect(response.body.success).toBe(true);

            expect(response.body.message).toBe(
                "Perfil atualizado com sucesso."
            );

            expect(
                response.body.data.user.name
            ).toBe("Nome Atualizado");

            const user =
                await prisma.user.findUnique({
                    where: {
                        id: auth.user.id,
                    },
                });

            expect(user.name).toBe(
                "Nome Atualizado"
            );
        });

        it("deve criar o perfil ao atualizar dados de perfil pela primeira vez", async () => {
            const auth = await createAuthenticatedUser({
                email: "profile-create@example.com",
            });

            const response = await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    birthDate:
                        "1995-05-10T00:00:00.000Z",
                    timezone:
                        "America/Sao_Paulo",
                    occupation:
                        "Software Developer",
                    relationshipStatus:
                        "Solteiro",
                    hasChildren: false,
                });

            expect(response.status).toBe(200);

            expect(response.body.success).toBe(true);

            expect(response.body.data.user.profile)
                .not.toBeNull();

            expect(
                response.body.data.user.profile
            ).toMatchObject({
                timezone: "America/Sao_Paulo",
                occupation: "Software Developer",
                relationshipStatus:
                    "Solteiro",
                hasChildren: false,
            });

            expect(
                response.body.data.user.profile.birthDate
            ).toBe(
                "1995-05-10T00:00:00.000Z"
            );

            const profile =
                await prisma.profile.findUnique({
                    where: {
                        userId: auth.user.id,
                    },
                });

            expect(profile).not.toBeNull();

            expect(profile.timezone).toBe(
                "America/Sao_Paulo"
            );

            expect(profile.occupation).toBe(
                "Software Developer"
            );
        });

        it("deve atualizar um perfil existente", async () => {
            const auth = await createAuthenticatedUser({
                email: "profile-update@example.com",
            });

            await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    timezone:
                        "America/Sao_Paulo",
                    occupation:
                        "Software Developer",
                    relationshipStatus:
                        "Solteiro",
                    hasChildren: false,
                });

            const response = await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    occupation:
                        "Senior Software Developer",
                    hasChildren: true,
                });

            expect(response.status).toBe(200);

            expect(
                response.body.data.user.profile
            ).toMatchObject({
                timezone:
                    "America/Sao_Paulo",
                occupation:
                    "Senior Software Developer",
                relationshipStatus:
                    "Solteiro",
                hasChildren: true,
            });

            const profile =
                await prisma.profile.findUnique({
                    where: {
                        userId: auth.user.id,
                    },
                });

            expect(profile.occupation).toBe(
                "Senior Software Developer"
            );

            expect(profile.hasChildren).toBe(
                true
            );

            expect(profile.timezone).toBe(
                "America/Sao_Paulo"
            );
        });

        it("deve permitir limpar campos nullable do perfil", async () => {
            const auth = await createAuthenticatedUser({
                email: "profile-null@example.com",
            });

            await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    birthDate:
                        "1995-05-10T00:00:00.000Z",
                    occupation:
                        "Developer",
                    relationshipStatus:
                        "Solteiro",
                });

            const response = await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    birthDate: null,
                    occupation: null,
                    relationshipStatus: null,
                });

            expect(response.status).toBe(200);

            expect(
                response.body.data.user.profile.birthDate
            ).toBeNull();

            expect(
                response.body.data.user.profile.occupation
            ).toBeNull();

            expect(
                response.body.data.user.profile
                    .relationshipStatus
            ).toBeNull();
        });

        it("deve rejeitar atualização sem campos", async () => {
            const auth = await createAuthenticatedUser({
                email: "profile-empty@example.com",
            });

            const response = await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({});

            expect(response.status).toBe(400);

            expect(response.body.success).toBe(false);

            expect(response.body.message).toBe(
                "Dados inválidos."
            );
        });

        it("deve rejeitar nome inválido", async () => {
            const auth = await createAuthenticatedUser({
                email: "profile-invalid-name@example.com",
            });

            const response = await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    name: "A",
                });

            expect(response.status).toBe(400);

            expect(response.body.success).toBe(false);

            expect(
                Array.isArray(response.body.errors)
            ).toBe(true);
        });

        it("deve rejeitar birthDate inválido", async () => {
            const auth = await createAuthenticatedUser({
                email: "profile-invalid-date@example.com",
            });

            const response = await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    birthDate: "data-invalida",
                });

            expect(response.status).toBe(400);

            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar hasChildren que não seja boolean", async () => {
            const auth = await createAuthenticatedUser({
                email: "profile-invalid-boolean@example.com",
            });

            const response = await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${auth.token}`
                )
                .send({
                    hasChildren: "false",
                });

            expect(response.status).toBe(400);

            expect(response.body.success).toBe(false);
        });

        it("deve rejeitar atualização sem autenticação", async () => {
            const response = await request
                .put("/api/users/me")
                .send({
                    name: "Sem Auth",
                });

            expect(response.status).toBe(401);

            expect(response.body.success).toBe(false);
        });

        it("não deve permitir acesso ao perfil de outro usuário", async () => {
            const userA =
                await createAuthenticatedUser({
                    email: "profile-user-a@example.com",
                });

            const userB =
                await createAuthenticatedUser({
                    email: "profile-user-b@example.com",
                });

            await request
                .put("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${userB.token}`
                )
                .send({
                    occupation:
                        "Private Occupation",
                });

            const response = await request
                .get("/api/users/me")
                .set(
                    "Authorization",
                    `Bearer ${userA.token}`
                );

            expect(response.status).toBe(200);

            expect(
                response.body.data.user.id
            ).toBe(userA.user.id);

            expect(
                response.body.data.user.id
            ).not.toBe(userB.user.id);

            expect(
                response.body.data.user.profile
            ).toBeNull();
        });
    });
});