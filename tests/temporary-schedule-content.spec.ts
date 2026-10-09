import { expect, test, type Page } from '@playwright/test';
import type { CreateTemporarySchedulePayload } from '../types/school';

const classId = '6a9c3a55b1285e2c15bbc741';
const user = { id: '6a9c3a55b1285e2c15bbc746', fullName: 'Giáo viên kiểm thử', email: 'schedule@example.test', role: 'teacher', isEmailVerified: true };

async function setup(page: Page, rejectWrite = false) {
  const creates: CreateTemporarySchedulePayload[] = [];
  const separateContentWrites: unknown[] = [];
  let saved: CreateTemporarySchedulePayload | undefined;
  const classroom = { id: classId, teacherId: user.id, name: 'Lớp nội dung buổi học', imageUrl: '/logo.png', colorIndex: 0, regularPrice: 100000, makeupPrice: 120000, studentCount: 0, status: 'active', students: [], latestFixedSchedule: null };
  await page.clock.setFixedTime(new Date('2026-10-09T03:00:00Z'));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === '/api/auth/refresh') return route.fulfill({ json: { accessToken: 'test-token', user } });
    if (path === '/api/auth/me') return route.fulfill({ json: user });
    if (path === `/api/classes/${classId}`) return route.fulfill({ json: classroom });
    if (path.endsWith('/schedules/temporary') && request.method() === 'POST') {
      const body = request.postDataJSON() as CreateTemporarySchedulePayload;
      creates.push(body);
      if (rejectWrite) return route.fulfill({ status: 500, json: { message: 'Không thể lưu nội dung buổi học.' } });
      saved = body;
      return route.fulfill({ json: { id: 'temporary-1', classId, ...body } });
    }
    if (path.endsWith('/schedules/session-content')) {
      separateContentWrites.push(request.postDataJSON());
      return route.fulfill({ json: {} });
    }
    if (path.endsWith('/schedules')) return route.fulfill({ json: { fixedSchedules: [], latestFixedSchedule: null, temporarySchedules: saved ? [{ id: 'temporary-1', classId, ...saved }] : [] } });
    if (path.endsWith('/conflicts/check-temporary')) return route.fulfill({ json: { blockingConflicts: [], warnings: [] } });
    if (path === '/api/schedules/availability') return route.fulfill({ json: { slots: [], warnings: [] } });
    if (path === '/api/schedules/week') {
      const weekStart = url.searchParams.get('weekStart') ?? '2026-10-05';
      const days = Array.from({ length: 7 }, (_, index) => ({ date: new Date(Date.parse(`${weekStart}T00:00:00Z`) + index * 86400000).toISOString().slice(0, 10), dayOfWeek: index + 1 }));
      const events = saved ? [{ ...saved, id: 'extra:temporary-1:2026-10-09', classId, className: classroom.name, colorIndex: 0, date: saved.newDate, dayOfWeek: 5, type: saved.action, scheduleOverrideId: 'temporary-1' }] : [];
      return route.fulfill({ json: { weekStart, weekEnd: days[6].date, days, classes: [classroom], events } });
    }
    if (path.endsWith('/push-subscription/status')) return route.fulfill({ json: { configured: false, publicKey: null, subscriptionCount: 0, devices: [] } });
    return route.fulfill({ json: [] });
  });
  await page.goto(`/classes/${classId}`);
  await page.getByRole('button', { name: 'Thời khóa biểu', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo lịch tạm', exact: true }).click();
  const modal = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Tạo lịch tạm', exact: true }) });
  await modal.getByLabel('Ngày học thêm', { exact: true }).fill('2026-10-09');
  await modal.getByLabel('Giờ bắt đầu', { exact: true }).fill('19:00');
  await modal.getByLabel('Giờ kết thúc', { exact: true }).fill('20:30');
  return { modal, creates, separateContentWrites };
}

async function confirmCreation(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Tạo lịch tạm', exact: true }).click();
  const confirmation = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Xác nhận tạo lịch tạm', exact: true }) });
  await confirmation.getByRole('button', { name: 'Tạo lịch tạm', exact: true }).click();
}

for (const width of [1440, 390]) {
  test(`creates the lesson with content in one request and restores it after reload at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const { modal, creates, separateContentWrites } = await setup(page);
    await modal.getByLabel('Chủ đề', { exact: true }).fill('  Ôn tập chương 1  ');
    await modal.getByRole('textbox', { name: 'Nội dung buổi học', exact: true }).fill('  Giải phương trình\nBài tập về nhà  ');
    await modal.screenshot({ path: testInfo.outputPath(`temporary-content-${width}.png`) });
    expect(creates).toHaveLength(0);
    await confirmCreation(page);
    await expect(page.getByRole('heading', { name: 'Tạo lịch tạm', exact: true })).toHaveCount(0);
    expect(creates).toEqual([{ action: 'extra', newDate: '2026-10-09', startTime: '19:00', endTime: '20:30', topic: 'Ôn tập chương 1', content: 'Giải phương trình\nBài tập về nhà' }]);
    expect(separateContentWrites).toHaveLength(0);
    await page.reload();
    await page.getByRole('button', { name: 'Thời khóa biểu', exact: true }).click();
    await page.locator('button[data-type="extra"]:visible').first().click();
    const lesson = page.getByRole('dialog');
    await expect(lesson.getByLabel('Chủ đề', { exact: true })).toHaveValue('Ôn tập chương 1');
    await expect(lesson.getByRole('textbox', { name: 'Nội dung buổi học', exact: true })).toHaveValue('Giải phương trình\nBài tập về nhà');
  });
}

test('allows an empty lesson and hides content fields for cancellation', async ({ page }) => {
  const { modal, creates } = await setup(page);
  await modal.getByRole('button', { name: 'Buổi học thêm', exact: true }).click();
  await page.getByRole('option', { name: 'Hủy buổi', exact: true }).click();
  await expect(modal.getByRole('textbox', { name: 'Nội dung buổi học', exact: true })).toHaveCount(0);
  await modal.getByRole('button', { name: 'Hủy buổi', exact: true }).click();
  await page.getByRole('option', { name: 'Buổi học thêm', exact: true }).click();
  await modal.getByLabel('Giờ bắt đầu', { exact: true }).fill('19:00');
  await modal.getByLabel('Giờ kết thúc', { exact: true }).fill('20:30');
  await confirmCreation(page);
  await expect(page.getByRole('heading', { name: 'Tạo lịch tạm', exact: true })).toHaveCount(0);
  expect(creates[0]).not.toHaveProperty('content');
  expect(creates[0]).not.toHaveProperty('topic');
});

test('keeps entered content when creation fails and resets it when the teacher cancels', async ({ page }) => {
  const { modal } = await setup(page, true);
  await modal.getByRole('textbox', { name: 'Nội dung buổi học', exact: true }).fill('Nội dung chưa lưu');
  await confirmCreation(page);
  await expect(modal.getByRole('textbox', { name: 'Nội dung buổi học', exact: true })).toHaveValue('Nội dung chưa lưu');
  await modal.getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo lịch tạm', exact: true }).click();
  await expect(modal.getByRole('textbox', { name: 'Nội dung buổi học', exact: true })).toBeEmpty();
});
