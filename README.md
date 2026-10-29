# taskmanagerpro
TaskManagerPro – Spring Boot backend with Hibernate &amp; PostgreSQL, ready for full-stack integration with React and Docker.

## Backend tests

Run the backend test suite from the repository root with:

```shell
cd backend
mvn test
```

Docker must be running. The Spring application-context test uses Testcontainers to
start a temporary PostgreSQL 16 database, applies all Flyway migrations, and
validates the Hibernate mappings. It does not connect to the database configured
for the application or reuse a persistent database volume.

## Render production configuration

The application does not read Render settings automatically. Configure the
variables below in the backend service's private Render environment settings;
do not commit real credentials or secret values.

### Required backend settings

| Variable | Purpose |
| --- | --- |
| `SPRING_PROFILES_ACTIVE=prod` | Activates the tracked `application-prod.properties`. Use Spring Boot's standard profile variable and verify the active profile in startup logs. |
| `JWT_SECRET` | Required by the `prod` profile. Supply a private, stable, randomly generated secret with at least 32 bytes for HS256. Do not use the development fallback or rotate it casually: changing it invalidates issued tokens. |
| `DB_HOST` | Hostname of the intended PostgreSQL service; use the private/internal address when the services support it. |
| `DB_PORT` | PostgreSQL port. |
| `DB_NAME` | PostgreSQL database name. |
| `DB_USER` | PostgreSQL username. |
| `DB_PASS` | PostgreSQL password. |
| `APP_CORS_ALLOWED_ORIGINS` | Optional comma-separated list of exact HTTP(S) frontend origins. Set the staging frontend origin here when it differs from the built-in origin. Wildcards and paths are rejected. |

The application assembles its JDBC URL from `DB_HOST`, `DB_PORT`, and
`DB_NAME`, and uses `DB_USER` and `DB_PASS` for credentials. Alternatively,
standard Spring variables `SPRING_DATASOURCE_URL`,
`SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` can override
those settings. `DATABASE_URL` by itself is not consumed by this application;
configure the JDBC URL or the five `DB_*` values explicitly.

Do not omit database settings in Render: local defaults exist only in the
explicit `dev` profile. Production and any unknown profile require explicit
datasource settings and reject a local/loopback JDBC host. Before deployment,
an operator should privately compare the effective JDBC host, database name,
and username with the intended Render PostgreSQL service. Compare the backend
service's private environment settings with the PostgreSQL service's internal
connection details in Render. Do not print a full JDBC URL if it contains
credentials.

For clarity, the effective Hibernate setting is:

| Profile | Hibernate schema behavior |
| --- | --- |
| `dev` (must be selected explicitly) | `update` |
| `prod` | `validate`; startup rejects an `update` override |
| `test` | `validate`; tests use an isolated Testcontainers PostgreSQL database |
| No profile or unknown profile | `validate`; startup requires explicit non-local datasource and a strong non-development JWT secret |

### Production behavior and startup safety

Set `SPRING_PROFILES_ACTIVE=prod` explicitly in Render. This standard Spring
Boot variable activates the tracked `application-prod.properties`; the
application does not select `dev` implicitly. With no profile, or with an
unknown profile, startup validation requires explicit settings, Hibernate
`validate`, enabled Flyway, and rejects loopback databases and known
development/test JWT secrets. Combining `prod` with `dev` or `test` also fails
startup.

The JWT secret is mandatory outside `dev` and `test`, must contain at least 32
UTF-8 bytes for HS256, and production/unknown-profile validation rejects the
known development and test keys. No secret value is logged in validation
errors. The production guard checks effective properties, including
environment overrides, and refuses Hibernate `update` or disabled Flyway.

The tracked `application-prod.properties` contains the Render datasource,
Flyway, JPA, server-port, multipart, mail, and upload defaults. Flyway uses
`classpath:db/migration` and baselines a pre-existing schema at version `0`;
Hibernate validates after migrations. Secrets remain environment-only. The
ignored local `application.properties` and `application.yml` files are not
needed by Git-based builds. Docker Compose selects the `dev` profile and is for
local development; its datasource credentials and Hibernate `update` setting
must not be copied into production configuration.

For local development, explicitly select `dev` before launching the backend.
In PowerShell, run `$env:SPRING_PROFILES_ACTIVE='dev'` and then
`mvn spring-boot:run` from `backend`. Docker Compose uses the same standard
profile variable. Without an explicit profile, startup fails closed rather
than using development database, JWT, or Hibernate settings.

`PORT` is read by the application and should be left to Render to assign. Do
not hardcode a Render service port.

### Attachment storage

The upload property is `app.upload.dir` (environment variable
`APP_UPLOAD_DIR`). Its application default is `./attachments`; in the backend
Docker image that resolves under the image work directory (`/app/attachments`).
The image directory alone is ephemeral. Configure a Render persistent disk,
for example mount it at `/var/data` and set
`APP_UPLOAD_DIR=/var/data/taskmanagerpro/attachments`. The configured upload
directory must be on that mounted disk and writable by the application user.
The repository does not establish whether a Render disk is currently attached.

Attachment database rows store absolute filesystem paths. Keep the configured
path stable across restarts/redeploys. If moving the directory, first back up
the database and all attachment bytes; copy each file while preserving a
verified mapping from its existing `storage_path`, validate file counts and
checksums, and update the database paths in a coordinated migration before
switching the application setting. Do not simply change `APP_UPLOAD_DIR`:
existing database paths would no longer resolve beneath the configured root.
Do not delete the old files until the new deployment and downloads have been
verified and backups are retained.

Issue/project deletion and individual attachment deletion queue attachment
paths in the same database transaction as the row deletion. The scheduled
cleanup worker removes files only after the delete transaction commits; failed
or unavailable-file cleanup remains in
`attachment_cleanup_outbox` and is retried. The worker validates that each
stored path remains under `app.upload.dir`. Parent issue deletion detaches its
children rather than deleting them. Direct issue/task deletion and bulk issue
deletion require project ADMIN. Deleting a user sets issue assignees to NULL,
while required reporter attribution restricts deletion. Other user relationships
retain their individually defined foreign-key behavior.

### Optional email settings

Email is disabled by default (`MAIL_ENABLED=false`). Only enable it when SMTP
credentials and a sender address are configured. The optional variables are
`MAIL_ENABLED`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`,
and `MAIL_FROM`. Store SMTP credentials in Render's private settings.

### Safe deployment and smoke checks

1. Use a staging service and database clone first. Configure the required
   variables and persistent disk there.
2. Verify the startup logs identify the `prod` profile, successful Flyway
   migration, and Hibernate schema validation. Verify the intended database
   target privately without logging secrets.
3. Back up the production database and attachment storage before an approved
   release. Compare the production Flyway history/schema with the release;
   never use Hibernate `update` to repair a production schema.
4. After an approved deployment, test `POST /api/auth/register` and
   `POST /api/auth/login` with a disposable account. Keep returned tokens
   private.
5. Test `GET /api/projects` with a valid token, then create/read/update a
   staging project and issue. Confirm unauthorized cross-project requests are
   denied.
6. Test issue and time-report CSV exports at
   `GET /api/projects/{projectKey}/issues/export` and
   `GET /api/projects/{projectKey}/time-report/export`.
7. Test attachment upload/list/download/delete, then verify the uploaded bytes
   survive a staging restart/redeploy. Confirm an unauthorized or former
   project member cannot delete the attachment.

No Render environment values, production database target, or Render disk
configuration have been verified by this repository documentation.

## Operator-run Render staging preparation

This section is a checklist for an authorized operator. It does not mean that
a Render service, staging database, frontend origin, or persistent disk has
been configured or verified. Use an isolated staging environment and synthetic
test data. Do not point staging at production services or production storage.

### Staging configuration

Set the following privately in the staging service; never put credential
values in source control, build arguments, screenshots, or logs.

| Setting | Requirement |
| --- | --- |
| `SPRING_PROFILES_ACTIVE=prod` | Required. Use the exact `prod` profile and verify the effective active profile in startup logs. |
| `JWT_SECRET` | Required. Use a unique, randomly generated staging secret of at least 32 UTF-8 bytes. Do not reuse a development or production secret. |
| PostgreSQL settings | Required. Set all five `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASS` values, or set all three `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` overrides. Use only the isolated staging database's private connection details. `DATABASE_URL` alone is not read. |
| `SPRING_FLYWAY_ENABLED=true` | Required. Flyway is enabled by default, but explicitly verify this effective value. |
| `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` | Required. This is the safe schema behavior; do not use `update` to repair a failed staging migration. |
| `PORT` | Let the platform assign this value. Do not hardcode a port. |
| Persistent disk and `APP_UPLOAD_DIR` | Required for attachment persistence tests. Mount a staging-only disk and set `APP_UPLOAD_DIR` to a directory on that mount, for example `/var/data/taskmanagerpro/attachments` when the mount is `/var/data`. The example is not a claim that such a disk exists. |
| `MAIL_ENABLED=false` | Optional email is disabled by default; keep it disabled unless the staging test specifically needs email. If enabled, configure private `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM` values. |
| `APP_CORS_ALLOWED_ORIGINS` | For a separate staging frontend, set its exact origin (scheme and host, no path). Multiple exact origins may be comma-separated. Do not use `*`. |

The backend Docker image runs as the non-root `app` user. Verify that the
mounted directory exists and that this runtime user can create, read, and
delete a synthetic test file there; a mount can hide the image's pre-created
directory and its permissions. Do not assume the image filesystem persists.

The checked-in backend Dockerfile builds the Spring Boot JAR and starts it
with `java -jar app.jar`; the frontend Dockerfile builds the Vite bundle and
serves it with Nginx on port 80. Configure each hosted service to use its
corresponding Dockerfile and build context. The repository does not establish
Render's service root directories, Docker contexts, or start settings.
`docker-compose.yml` is for local development and its local database,
development profile, and named volume are not staging settings.

For a separately hosted frontend, explicitly build it with
`VITE_API_URL` set to the staging backend's base origin (scheme and host, no
trailing slash and no `/api` suffix). `VITE_API_URL` is embedded into the
browser bundle at build time and must contain no secret. If omitted, API calls
use same-origin `/api` paths; they no longer fall back to the existing hosted
backend. Confirm the selected proxy/topology routes those paths to staging.

`SecurityConfig` accepts an exact-origin allowlist through
`APP_CORS_ALLOWED_ORIGINS`; the existing frontend origin and local development
origin remain defaults. No staging frontend or backend URL is established by
the repository. Before building/deploying, the operator must supply the exact
staging backend base origin for `VITE_API_URL` and the exact frontend origin
for `APP_CORS_ALLOWED_ORIGINS`. Do not use wildcards. A same-origin reverse
proxy is also possible, but verify that its API proxy points to staging: the
checked-in Nginx config uses the Docker Compose hostname `backend:8080` and
does not work unchanged between independently hosted services.

The current backend does not expose a dedicated health/readiness endpoint
(Actuator is not configured). Do not configure a platform health-check path
based on assumption; validate the chosen path and startup behavior separately.

### Migration preflight

Do not run this preflight against production. The existing automated
Testcontainers test applies the migration chain, including V19 and V20, to a
fresh disposable PostgreSQL database. It does not establish compatibility
with a representative populated schema or existing attachment storage.

1. Have an authorized operator create a new, isolated staging PostgreSQL
   database. Confirm privately that the backend's effective JDBC target is
   that database before starting the application.
2. Prepare a representative staging schema and synthetic or appropriately
   sanitized test rows using an authorized process. Do not copy production
   data or attachments as part of this procedure. Ensure any attachment
   metadata and outbox paths refer only to staging test files; the cleanup
   worker must never be able to target production files.
3. Before migration, record the staging database's current schema and
   successful `flyway_schema_history` versions/checksums. Compare them with
   the expected release history. Investigate unknown versions, failed
   migrations, checksum mismatches, or an unexpected baseline; do not
   manually edit Flyway history to bypass a problem.
4. Run the exact candidate release against the staging database with the
   `prod` profile, Flyway enabled, and Hibernate `validate`. Review startup
   logs for Flyway completion and schema validation without logging
   credentials or a credential-bearing JDBC URL.
5. Verify the resulting migration history includes V19 and V20 and inspect
   the task foreign-key behavior: deleting a parent detaches its direct
   children, deleting an assignee preserves the task with a null assignee,
   and reporter attribution remains restricted. Check that existing reporter
   references and constraints are compatible before migration.
6. Confirm every staged attachment `storage_path` is compatible with the
   configured `APP_UPLOAD_DIR`, and that any included synthetic attachment
   bytes resolve at the expected paths. If paths must change, stop and plan a
   coordinated database-and-file mapping; changing the directory alone will
   orphan existing references.

**Block the rollout** on unexpected migration history/checksums, failed
migrations, incompatible constraints, unresolved reporter references,
Hibernate validation errors, attachment paths that do not resolve within the
staging upload root, or an unwritable/unpersistent disk. Do not alter V19/V20
to get past a staging failure; investigate and prepare a reviewed forward
fix.

### Staging smoke tests

Use synthetic accounts, projects, tasks, and files only. Record results and
avoid recording tokens or passwords.

1. Start the candidate backend with the intended production-style profile.
   Confirm startup completes, the effective profile is `prod`, the staging
   database is reachable, Flyway succeeds, and Hibernate validates the schema.
2. Register and log in with disposable users. Verify logout clears the
   browser session, and expired, malformed, or tampered tokens are rejected.
   Confirm a forbidden request returns 403 without treating it as an expired
   session.
3. Create two isolated projects with an ADMIN, a MEMBER, and a user who is not
   a member. Verify project membership scoping and cross-project reads/writes
   are denied. Verify MEMBER operations remain available while ADMIN-only
   settings and destructive operations are denied.
4. As project ADMIN, delete a synthetic parent task and verify its direct
   subtasks remain and are detached; verify deeper descendants remain linked
   to their surviving parent.
5. Upload, list, download, and delete a small synthetic attachment. Verify
   the downloaded bytes match and the corresponding cleanup work eventually
   leaves the outbox. Test the configured upload-size limit without sending
   oversized real data.
6. For retry behavior, use only a synthetic attachment on the isolated
   staging disk. In a controlled test, temporarily make that test file
   unavailable for deletion, verify its outbox attempt is retained and
   rescheduled, restore access, and verify a later retry removes the file and
   queue row. Never simulate this against shared or production storage.
7. Restart and redeploy the staging service. Verify the same synthetic
   attachment remains downloadable and the database/outbox state remains
   intact.
8. If using the browser UI, verify the built frontend targets the staging API,
   the selected CORS/topology setup works, and no request is sent to the
   fallback backend origin.

### Monitoring, backup, and recovery

- Watch application startup logs for database connection, Flyway, and
  Hibernate validation failures. The repository has no dedicated backend
  health/readiness endpoint, and the cleanup worker has no built-in metrics,
  alert integration, or dead-letter state.
- The cleanup worker runs every 60 seconds by default, handles at most 100
  due entries per pass, and retries filesystem errors after one minute.
  Monitor application warnings and the staging `attachment_cleanup_outbox`
  for accumulating due rows or increasing attempts. For example, an
  authorized operator can inspect staging with:

  ```sql
  SELECT COUNT(*) AS due_rows,
         MAX(attempts) AS highest_attempts,
         MIN(next_attempt_at) AS oldest_next_attempt
  FROM attachment_cleanup_outbox
  WHERE next_attempt_at <= CURRENT_TIMESTAMP;
  ```

  `last_error` stores an exception class, not a full diagnostic or alert.
  Establish an operator-owned threshold and escalation process before relying
  on this queue.
- Before a staging rollout or recovery test, define a maintenance window,
  stop writes, allow in-flight transactions and cleanup work to settle, and
  back up both the staging database and the matching persistent attachment
  directory. Test restoring the pair together; the database contains absolute
  file paths and queued cleanup work.
- If startup, authorization, migration, or persistence checks fail, stop
  further rollout and traffic to the candidate, preserve the database and
  disk for diagnosis, and notify the release owner. Do not delete the staging
  database, disk, or files to make the rollout appear successful.
- No V19/V20 down-migration or tested rollback procedure is established here.
  Reverting application code alone may leave a schema the old version cannot
  use. Prefer a reviewed forward fix; restore a matching database-and-file
  backup only under an approved recovery plan that accounts for changes since
  that backup.

### Operator confirmation still required

- [ ] Confirm the effective staging profile, PostgreSQL target and private
      credentials, unique JWT secret, Flyway setting, and Hibernate validation.
- [ ] Confirm the candidate migration history and compatibility on the
      representative isolated staging schema.
- [ ] Confirm the frontend/backend topology, staging frontend origin/CORS
      behavior, and build-time `VITE_API_URL`.
- [ ] Confirm the persistent disk is mounted, writable by the runtime user,
      stable across restart/redeploy, and contains only staging files.
- [ ] Confirm backup/restore, cleanup-failure monitoring, and recovery owners.

No staging service, environment value, database, disk, or migration against a
populated clone has been verified by this repository change.
