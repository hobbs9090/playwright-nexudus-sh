import { expect, test } from './api-test'

test.describe('Nexudus API', () => {
  test('can create a bearer token and fetch the current user profile @smoke @api', async ({
    nexudusApi,
    accessToken,
  }) => {
    const currentUser = await nexudusApi.getCurrentUser(accessToken)

    expect(currentUser.DefaultBusinessId, 'Expected the user profile to include a default business id.').toBeTruthy()
    expect(currentUser.DefaultBusinessName?.toString().trim(), 'Expected the user profile to include a business name.').toBeTruthy()
  })
})
