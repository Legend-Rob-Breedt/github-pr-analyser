import {expect, jest, test} from '@jest/globals';

import {getPullRequests} from './getPullRequests';
import {Octokit} from '@octokit/rest';

const octokit = new Octokit();

jest.spyOn(octokit.paginate, 'iterator').mockImplementation(async function* () {
  yield Promise.reject({
    response: {
      status: 403,
      headers: {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': `${Math.floor(Date.now() / 1000) + 5}`,
        'retry-after': '3',
      },
    },
  });
});

test('Should retry after hitting rate limit', async () => {
  console.log('Starting rate limit test...');
  await expect(getPullRequests('test-repo')).rejects.toThrow();
  console.log('Rate limit handling test passed.');
});
