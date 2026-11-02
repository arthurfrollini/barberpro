# Dashboard 3: barber setup. Implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A barber sets weekly hours and days off, manages services and edits their profile and photo, so customers can book them.

**Architecture:** Three features in `web/src/features`: `schedule` (weekly hours and days off), `services`, `profile`; plus `uploads` (the image field used here and by the shop logo in plan 4). No API changes: every operation exists.

**Tech Stack:** as plans 1 and 2.

**Spec:** `docs/superpowers/specs/2026-10-31-dashboard-design.md`

## Global Constraints

- Everything in plans 1 and 2.
- Week shown Monday first (Segunda to Domingo); the API counts 0 = Sunday.
- Times typed as `HH:MM` (text, so `24:00` is possible), multiples of 5 minutes, end after start, intervals of a day not overlapping, as the API's `INVALID_SCHEDULE` requires.
- Money typed as reais and sent as cents (`parseBRL`); durations 5 to 480 in steps of 5.
- Images: JPEG, PNG or WebP up to 2 MB, checked before upload; the API checks again.
- Every change that can cancel appointments says so before it happens and lists what it canceled after.

## Review Focus

- Saving hours that cancel appointments: the barber sees which ones, and the agenda reflects it.
- An access token that expires while choosing a photo: the upload refreshes and retries like any request (deferred minor from plan 1).
- Editing a service's price or duration: existing appointments keep their snapshot; the copy says so.
- A day with two intervals where the second starts before the first ends: rejected in the form with the day named, not only by the API.
- Leaving the hours page with unsaved changes: the save button shows there are changes; nothing is lost on a failed save.

---

### Task 1: Uploads

**Files:**
- Modify: `web/src/shared/api/client.ts` (upload refresh and retry), `client.test.ts`
- Create: `web/src/features/uploads/components/image-field.tsx`, `web/src/features/uploads/lib/check-image.ts`
- Test: `check-image.test.ts`, `image-field.test.tsx`

**Interfaces:**
- Produces:
  - `upload()` on `401 UNAUTHENTICATED` forces a refresh and retries once; a second 401 signs out, as `request()` does.
  - `checkImage(file: File): string | null`: Portuguese error for a type outside JPEG/PNG/WebP or a size above 2 MB.
  - `<ImageField label value onChange shape="circle" | "square" />` where `value: { url: string | null }` and `onChange(next: { fileId: string | null; url: string | null })`; shows the image or a placeholder, "Escolher imagem" (file input, hidden behind a button), "Remover"; uploads on pick, shows progress state and errors.
- [ ] **Step 1:** Tests: upload 401 then success after a forced refresh; `checkImage` rejects a GIF and a 3 MB PNG; `ImageField` uploads a picked PNG and calls `onChange` with the returned id and url; shows `FILE_TOO_LARGE` from the API in Portuguese; "Remover" calls `onChange({ fileId: null, url: null })`.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): image field with upload, and upload refresh on 401`.

### Task 2: Weekly hours

**Files:**
- Create: `web/src/features/schedule/api/schedule.ts`, `hooks/use-schedule.ts`, `lib/weekly-form.ts`, `components/weekly-hours-form.tsx`, `components/canceled-list.tsx`, `pages/schedule-page.tsx`
- Modify: `web/src/app/routes.tsx` (`/horarios`)
- Test: `lib/weekly-form.test.ts`, `components/weekly-hours-form.test.tsx`

**Interfaces:**
- Consumes: `useMySchedule()` and `scheduleKey` from the agenda feature's hooks (move them to `schedule/hooks` and re-export from agenda, so the agenda keeps working).
- Produces:
  - `toForm(weekly): WeekForm` (7 days, Monday first, each `{ weekday, working, intervals: { start, end }[] }`), `fromForm(form): WeeklyIntervalInput[]`, `weekSchema` (zod) with messages: "Use o formato 09:00", "Use minutos de 5 em 5", "O fim vem depois do início", "Os intervalos de {Segunda} se sobrepõem".
  - `useSetWeeklySchedule()`: on success writes `mySchedule.weekly`, invalidates `['agenda']`.
  - `<CanceledList appointments timeZone />`: "Ana, Corte, seg 2/11 às 14:00" per line.
- Behaviour: one row per day with a "Trabalha" switch (off reads "Folga"), its intervals (two text inputs labelled "Início" and "Fim" with the day in the accessible name), "Adicionar intervalo", "Remover intervalo", and "Usar estes horários em todos os dias de trabalho". Save button "Salvar horários" enabled only when dirty; above it the rule in one sentence. After saving: toast "Horários salvos" and, when something was canceled, a dialog "N agendamentos cancelados" with the list.
- [ ] **Step 1:** Tests: `toForm`/`fromForm` round trip with a split day and a day off; schema rejects `9:00`, `09:03`, end before start, overlapping intervals (message names the day), accepts `24:00`. Form: turning Sunday off and saving sends no Sunday intervals; copying Monday's hours to all working days; a save that cancels two appointments shows the dialog with both.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): weekly hours editor`.

### Task 3: Days off

**Files:**
- Create: `web/src/features/schedule/components/days-off.tsx`
- Modify: `schedule/api/schedule.ts`, `hooks/use-schedule.ts`, `pages/schedule-page.tsx`
- Test: `components/days-off.test.tsx`

**Interfaces:**
- Produces: `useBlockDate()` (returns canceled appointments; updates `blockedDates`, invalidates the agenda), `useUnblockDate()`.
- Behaviour: upcoming blocked days (today onwards in the shop's zone), sorted, each with its long date and "Desbloquear"; a date field and "Bloquear dia" that asks first ("Bloquear segunda-feira, 2 de novembro? Agendamentos desse dia com 2 horas ou mais de antecedência são cancelados e os clientes avisados."). After: toast "Dia bloqueado" or "Dia bloqueado. 2 agendamentos cancelados", with the same list dialog when there are any.
- [ ] **Step 1:** Tests: lists only today onwards; block asks, sends the date, shows the canceled list; unblock removes it from the list.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): days off`.

### Task 4: Services

**Files:**
- Create: `web/src/features/services/api/services.ts`, `hooks/use-services.ts`, `components/service-form.tsx`, `components/service-list.tsx`, `pages/services-page.tsx`
- Modify: `routes.tsx` (`/servicos`)
- Test: `components/service-form.test.tsx`, `pages/services-page.test.tsx`

**Interfaces:**
- Produces: `useMyServices()` (from `myBarberProfile { services }`, key `['services']`), `useCreateService()`, `useUpdateService()`, `useArchiveService()`; `serviceSchema` (name 1 to 60, description up to 500, price via `parseBRL` greater than zero, duration 5 to 480 step 5).
- Behaviour: a list (name, description, "R$ 50,00 · 30 min" written without the middle dot: "R$ 50,00, 30 min"), "Novo serviço" opening a dialog form, "Editar" with the same form filled in and the note "Agendamentos já feitos mantêm o preço e a duração de quando foram marcados.", "Arquivar" with confirmation ("Clientes não poderão mais agendar Corte. Agendamentos já feitos continuam."). Empty state: "Nenhum serviço ainda" and "Crie o primeiro para os clientes poderem agendar com você."
- [ ] **Step 1:** Tests: the form rejects `0`, `abc` and a 7-minute duration; creating sends cents and minutes and the list shows the new service; editing sends only the changed fields; archiving removes it from the list.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): services`.

### Task 5: Profile

**Files:**
- Create: `web/src/features/profile/api/profile.ts`, `hooks/use-profile.ts`, `components/name-form.tsx`, `components/barber-profile-form.tsx`, `pages/profile-page.tsx`
- Modify: `routes.tsx` (`/perfil`), roles query (add `bio` to `myBarberProfile`)
- Test: `pages/profile-page.test.tsx`

**Interfaces:**
- Produces: `useUpdateName()` (updates `['me']`), `useUpdateBarberProfile()` (updates `['roles']`).
- Behaviour: "Seus dados" with the name (and the email read-only); for barbers, "Perfil de barbeiro" with the photo (`ImageField`, circle) and the bio (500 characters, with a counter). Each section saves on its own and confirms with a toast.
- [ ] **Step 1:** Tests: renaming updates the account menu label; a non-barber sees no barber section; saving a new photo sends `avatarFileId`, removing sends `null`, leaving it sends nothing.
- [ ] **Step 2:** FAIL, implement, PASS. Commit `feat(web): profile with photo and bio`.

### Task 6: End to end

**Files:**
- Create: `web/e2e/setup.spec.ts`, `web/e2e/fixtures/avatar.png`

- [ ] **Step 1:** A new owner (shop through the API, `becomeBarber` through the API, no hours, no services) opens Horários, sets Monday to Saturday 09:00 to 18:00 by copying Monday, saves; blocks a date; creates "Corte" for R$ 45,00 and 30 minutes; uploads a photo and writes a bio; a customer's `availableSlots` for the next Monday through the API includes 09:00 and not 18:00.
- [ ] **Step 2:** PASS. Commit `test(web): barber setup end to end`.

### Task 7: Docs

- [ ] README status; `learning/Formularios.md` (RHF + zod, field arrays, mirroring API limits, server errors on fields, dirty state) and the index. Commit `docs: forms study notes`.
