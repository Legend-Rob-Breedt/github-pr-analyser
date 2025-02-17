import {
  calculatePrMetrics,
  cloneOrUpdateRepo,
  getCommentsAndCommitsForPR,
  getPullRequests,
  getRepos
} from "./modules/pullrequest/PullRequest";

import {START_DATE} from "./constants";
import {PullRequestStore} from "./modules/pullrequest/PullRequest.store";
import {AuthorStore} from "./modules/author/Author.store";
import {calculateAuthorMetrics} from "./modules/author/Author";

const main = async () => {
  if (!START_DATE) {
    console.error('START_DATE must be defined in the environment file');
    process.exit(1);
  }

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
    for (const prNumber in prRecords) {
      if (workingRecords[prNumber]) {
        await prStore.saveProcessedPullRequestCSV(workingRecords[prNumber]);
        console.log("Adding historical record: ", prNumber);
      } else {
        const pr = prRecords[prNumber];
        console.log(pr.createdAt);
        await getCommentsAndCommitsForPR(repo.name, pr);
        calculatePrMetrics(pr);
        console.log("Processing PR: ", pr);
        calculateAuthorMetrics(pr, authorRecords);
        await prStore.saveProcessedPullRequestCSV(pr);
      }
    }
    await authorStore.saveProcessedAuthorMetricsCSV(Object.values(authorRecords));
  }
};

main().catch(console.error);
