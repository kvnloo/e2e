import { expect, test } from 'e2e';

test('native values and actions, not delivery receipts', async ({ screen }) => {
  const field = screen.getByPlaceholder('Value');
  await expect(field).toBeVisible();
  await field.fill('quotes " and Unicode λ\nsecond line');
  await expect(field).toHaveValue('quotes " and Unicode λ\nsecond line');
  await field.clear();
  await expect(field).toHaveValue('');
  await screen.getByRole('button', { name: 'Increment' }).click();
  await expect(screen.getByText('Count: 1')).toBeVisible();
});

test('duplicate semantic labels remain ambiguous', async ({ screen }) => {
  expect(await screen.getByLabel('Duplicate').count()).toBe(2);
});
