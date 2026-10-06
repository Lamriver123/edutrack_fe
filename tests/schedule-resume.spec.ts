import { expect, test, type Page } from '@playwright/test';
import type { LatestFixedSchedule, ResumeFixedSchedulePayload } from '../types/school';

const classId = '6a9c3a55b1285e2c15bbc741';
const user = { id: '6a9c3a55b1285e2c15bbc746', fullName: 'Giáo viên kiểm thử', email: 'schedule@example.test', role: 'teacher', isEmailVerified: true };
const original: LatestFixedSchedule = { id: '6a9c3a55b1285e2c15bbc745', version: 1, effectiveFrom: '2026-09-01', effectiveTo: '2026-10-04T16:59:59.999Z', schedules: [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }] };

async function setup(page: Page, { blockOld = false, rejectWrite = false } = {}) {
  let fixed = original;
  let suspended = true;
  const resumes: ResumeFixedSchedulePayload[] = [];
  const fixedWrites: unknown[] = [];
  const classroom = () => ({ id: classId, teacherId: user.id, name: 'Lớp khôi phục lịch', imageUrl: '/logo.png', colorIndex: 0, regularPrice: 100000, makeupPrice: 120000, studentCount: 0, status: 'active', students: [], latestFixedSchedule: fixed });
  const conflicts = { blockingConflicts: [{ scheduleId: 'other', classId: 'other', className: 'Lớp khác', date: '2026-10-06', startTime: '09:00', endTime: '10:30', message: 'Trùng ca học của lớp khác' }], warnings: [] };
  await page.clock.setFixedTime(new Date('2026-10-06T03:00:00Z'));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'test-token', user } });
    if (path === '/api/auth/me') return route.fulfill({ json: user });
    if (path === `/api/classes/${classId}`) return route.fulfill({ json: classroom() });
    if (path.endsWith('/schedules/fixed/resume')) {
      const body = request.postDataJSON() as ResumeFixedSchedulePayload;
      resumes.push(body);
      if (rejectWrite) return route.fulfill({ status: 409, json: { code: 'SCHEDULE_CONFLICT', message: 'Trùng lịch khi khôi phục', ...conflicts } });
      fixed = { ...original, version: 2, effectiveFrom: body.resumeFrom, effectiveTo: null, schedules: body.schedules ?? original.schedules };
      suspended = false;
      return route.fulfill({ json: fixed });
    }
    if (path.endsWith('/schedules/fixed')) { fixedWrites.push(request.postDataJSON()); return route.fulfill({ json: fixed }); }
    if (path.endsWith('/schedules')) return route.fulfill({ json: { fixedSchedules: [original, ...(suspended ? [] : [fixed])], latestFixedSchedule: fixed, temporarySchedules: [], isFixedScheduleSuspended: suspended } });
    if (path.endsWith('/conflicts/check-fixed')) {
      const body = request.postDataJSON() as { schedules: LatestFixedSchedule['schedules'] };
      return route.fulfill({ json: blockOld && body.schedules[0].startTime === '09:00' ? conflicts : { blockingConflicts: [], warnings: [] } });
    }
    if (path === '/api/schedules/week') {
      const weekStart = url.searchParams.get('weekStart') ?? '2026-10-05';
      const days = Array.from({ length: 7 }, (_, index) => ({ date: new Date(Date.parse(`${weekStart}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10), dayOfWeek: index + 1 }));
      return route.fulfill({ json: { weekStart, weekEnd: days[6].date, days, classes: [classroom()], events: [] } });
    }
    if (path.endsWith('/push-subscription/status')) return route.fulfill({ json: { configured: false, publicKey: null, subscriptionCount: 0, devices: [] } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/classes/${classId}`);
  await page.getByRole('button', { name: 'Thời khóa biểu', exact: true }).click();
  await page.getByRole('button', { name: 'Khôi phục lịch', exact: true }).click();
  const chooser = page.getByRole('dialog');
  await expect(chooser.getByText('Bạn có muốn thay đổi lịch học khi khôi phục không?')).toBeVisible();
  await chooser.getByLabel('Ngày khôi phục', { exact: true }).fill('2026-10-07');
  return { resumes, fixedWrites, isSuspended: () => suspended };
}

async function editSlots(page: Page) {
  const editor = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Điều chỉnh lịch khi khôi phục', exact: true }) });
  await expect(editor.getByLabel('Ngày khôi phục', { exact: true })).toHaveValue('2026-10-07');
  await editor.getByRole('button', { name: 'Thứ 2', exact: true }).click();
  await page.getByRole('option', { name: 'Thứ 4', exact: true }).click();
  await editor.getByLabel('Bắt đầu', { exact: true }).fill('19:00');
  await editor.getByLabel('Kết thúc', { exact: true }).fill('20:30');
  return editor;
}

async function confirmEditedResume(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Khôi phục lịch', exact: true }).click();
  const confirmation = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Xác nhận khôi phục lịch', exact: true }) });
  await confirmation.getByRole('button', { name: 'Khôi phục', exact: true }).click();
}

test('keeps the previous schedule when the teacher selects no changes', async ({ page }) => {
  const state = await setup(page);
  await expect(page.getByRole('radio', { name: /Không, giữ lịch cũ/ })).toBeChecked();
  await page.getByRole('dialog').getByRole('button', { name: 'Khôi phục lịch', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tạm hoãn lịch', exact: true })).toBeVisible();
  expect(state.resumes).toEqual([{ resumeFrom: '2026-10-07' }]);
  expect(state.fixedWrites).toEqual([]);
});

for (const width of [1440, 390]) {
  test(`edits slots before resuming without writing early at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await setup(page);
    await page.getByRole('radio', { name: /Có, thay đổi lịch/ }).check();
    await page.screenshot({ path: testInfo.outputPath(`resume-choices-${width}.png`) });
    await page.getByRole('button', { name: 'Tiếp tục chỉnh lịch', exact: true }).click();
    const editor = await editSlots(page);
    expect(state.resumes).toEqual([]);
    expect(state.isSuspended()).toBe(true);
    await editor.screenshot({ path: testInfo.outputPath(`resume-editor-${width}.png`) });
    await confirmEditedResume(page);
    await expect(page.getByRole('button', { name: 'Tạm hoãn lịch', exact: true })).toBeVisible();
    expect(state.resumes).toEqual([{ resumeFrom: '2026-10-07', schedules: [{ dayOfWeek: 3, startTime: '19:00', endTime: '20:30' }] }]);
    expect(state.fixedWrites).toEqual([]);
    expect(state.isSuspended()).toBe(false);
  });
}

test('cancelling the editor keeps the schedule suspended and resets the next choice', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('radio', { name: /Có, thay đổi lịch/ }).check();
  await page.getByRole('button', { name: 'Tiếp tục chỉnh lịch', exact: true }).click();
  await (await editSlots(page)).getByRole('button', { name: 'Hủy', exact: true }).click();
  expect(state.resumes).toEqual([]);
  expect(state.isSuspended()).toBe(true);
  await page.getByRole('button', { name: 'Khôi phục lịch', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Không, giữ lịch cũ/ })).toBeChecked();
});

test('a conflicting old schedule enters the resume editor and saves through the resume endpoint', async ({ page }) => {
  const state = await setup(page, { blockOld: true });
  await page.getByRole('dialog').getByRole('button', { name: 'Khôi phục lịch', exact: true }).click();
  await editSlots(page);
  expect(state.resumes).toEqual([]);
  await confirmEditedResume(page);
  await expect(page.getByRole('button', { name: 'Tạm hoãn lịch', exact: true })).toBeVisible();
  expect(state.resumes[0].schedules?.[0].startTime).toBe('19:00');
  expect(state.fixedWrites).toEqual([]);
});

test('a conflict detected while writing leaves the editor open and the schedule suspended', async ({ page }) => {
  const state = await setup(page, { rejectWrite: true });
  await page.getByRole('radio', { name: /Có, thay đổi lịch/ }).check();
  await page.getByRole('button', { name: 'Tiếp tục chỉnh lịch', exact: true }).click();
  await editSlots(page);
  await confirmEditedResume(page);
  await expect(page.getByRole('heading', { name: 'Điều chỉnh lịch khi khôi phục', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Trùng lịch, vui lòng chọn giờ khác')).toBeVisible();
  expect(state.isSuspended()).toBe(true);
});
