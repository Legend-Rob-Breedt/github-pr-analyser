import {
  calculatePrMetrics,
  cloneOrUpdateRepo,
  getCommentsAndCommitsForPR,
  getPullRequests,
  getRepos,
  PullRequest,
} from './modules/pullrequest/PullRequest';

import {
  PAGE_SIZE,
  START_DATE,
} from './constants';
import {PullRequestStore} from './modules/pullrequest/PullRequest.store';
import {AuthorStore} from './modules/author/Author.store';
import {calculateAuthorMetrics} from './modules/author/Author';

const main = async () => {
  if (!START_DATE) {
    console.error('START_DATE must be defined in the environment file');
    process.exit(1);
  }
  const page_size = parseInt(PAGE_SIZE);

  const repos = await getRepos();
  const authorStore = new AuthorStore();
  const authorRecords = await authorStore.loadAuthorsRecords();
  for (const repo of repos) {
    const prStore = new PullRequestStore(repo.name);
    const workingRecords = await prStore.loadHistoricalPullRequest();
    cloneOrUpdateRepo(repo.name);
    const prRecords = await getPullRequests(repo.name, START_DATE);
    //Process new PR if created > last process PR created date OR where PR.last processed greater then last record process date
    //this is to handle PRs that were created before the last PR record was processed but were merged after the last PR record that was processed

    let processedPrs: PullRequest[] = [];
    console.log('Processing PRs: ', prRecords['1240']);
    for (const prNumber in prRecords) {
      console.info('Processing PR: ', prNumber);
      if (workingRecords[prNumber]) {
        processedPrs.push(workingRecords[prNumber]);
        console.info('Adding historical record: ', workingRecords[prNumber]);
      } else {
        const pr = prRecords[prNumber];
        const prValid = await getCommentsAndCommitsForPR(repo.name, pr);
        if (prValid) {
          console.info('Processing PR Metrics: ', pr.number);
          calculatePrMetrics(pr);
          calculateAuthorMetrics(pr, authorRecords);
        } else {
          console.log('PR is not valid: ', pr);
        }
        processedPrs.push(pr);
        if (processedPrs.length % page_size === 0) {
          console.info('Saving processed PRs', Date.now());
          await prStore.saveProcessedPullRequestCSV(processedPrs);
          await authorStore.saveProcessedAuthorMetricsCSV(
            Object.values(authorRecords),
          );
          processedPrs = [];
        }
      }
    }
    await prStore.saveProcessedPullRequestCSV(processedPrs);
    await authorStore.saveProcessedAuthorMetricsCSV(
      Object.values(authorRecords),
    );
  }
};

main().catch(console.error);
