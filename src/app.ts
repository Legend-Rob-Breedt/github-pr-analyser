import {
    calculatePrMetrics,
    cloneOrUpdateRepo,
    getCommentsAndCommitsForPR,
    getPullRequests,
    getRepos,
    PullRequest
} from "./modules/pullrequest/PullRequest";

import {END_DATE, START_DATE} from "./constants";
import {loadHistoricalPullRequest, saveProcessedPullRequestCSV} from "./modules/pullrequest/PullRequest.store";

const loadAuthorsRecords = () => {
    
}

const main = async () => {
    if (!START_DATE) {
        console.error('START_DATE must be defined in the environment file');
        process.exit(1);
    }

    const repos = await getRepos();

    for (const repo of repos) {
        const records: Record<number, PullRequest> = {};
        const historicalRecords = loadHistoricalPullRequest(repo.name);
        cloneOrUpdateRepo(repo.name);
        const prs = await getPullRequests(repo.name);

        for (const prId in prs) {
            const pr: PullRequest = prs[prId];
            if (historicalRecords[prId] && historicalRecords[prId].state === 'closed') {
                records[prId] = historicalRecords[prId];
                console.log("Adding historical record: ", historicalRecords[prId].state);
            } else if (new Date(pr.createdAt) >= new Date(START_DATE) && new Date(pr.createdAt) <= new Date(END_DATE)) {
                //console.log("Processing", historicalRecords[prId] ? 'updated' : 'new', 'record', prId);
                await getCommentsAndCommitsForPR(repo.name, pr);
                calculatePrMetrics(pr);
                records[prId] = {...pr};
                console.log("Processed PR: ", records[prId]);
            }
        }

        await saveProcessedPullRequestCSV(Object.values(records));
    }
    //fs.copyFileSync(PROCESSED_PR_CSV_FILE, WORKING_PR_CSV_FILE);
    console.log('PR data saved to CSV successfully.');
};

main().catch(console.error);
