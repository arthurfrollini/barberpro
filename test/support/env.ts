// Tests run against the compose services (or CI service containers) and their own database.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgres://barberpro:barberpro@localhost:5442/barberpro_test';
process.env.REDIS_URL ??= 'redis://localhost:6390';
process.env.SMTP_URL ??= 'smtp://localhost:1025';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-42';
process.env.UPLOAD_DIR ??= `${(await import('node:os')).tmpdir()}/barberpro-test-uploads`;
