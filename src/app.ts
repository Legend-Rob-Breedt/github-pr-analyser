import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { format } from 'date-fns';
import { createObjectCsvWriter } from 'csv-writer';
import dotenv from 'dotenv';
import {PRComment} from "./modules/pullrequest/PRComment";
import {PullRequest} from "./modules/pullrequest/PullRequest";

dotenv.config({ path: process.argv[2] || '../.env' });

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const ORG_NAME = process.env.ORG_NAME;
const USER_NAME = process.env.USER_NAME;
const START_DATE = process.env.START_DATE;
const END_DATE = process.env.END_DATE || new Date().toISOString();
const PAGE_SIZE = process.env.PAGE_SIZE || 100;
const REPO_NAME = process.env.REPO_NAME;
const OUTPUT_PATH = path.resolve(__dirname,process.env.OUTPUT_PATH || '../../output');
const BASE_DIR = path.resolve(OUTPUT_PATH, 'repos');
const TIMESTAMP = format(new Date(), 'yyyyMMdd_HHmmss');
const PROCESSED_CSV_FILE =  `${OUTPUT_PATH}/PRAuthors_${TIMESTAMP}.csv`;
const WORKING_CSV_FILE =  `${OUTPUT_PATH}/PRAuthors.csv`;

const CSV_HEADERS = [
    { id: 'repository', title: 'Repository' },
    { id: 'pr_id', title: 'PR ID' },
    { id: 'author', title: 'Author' },
    { id: 'first_commit_date', title: 'Date of First Commit' },
    { id: 'total_commits', title: 'Total Number of Commits' },
    { id: 'date_pr_raised', title: 'Date PR Raised' },
    { id: 'lines_added', title: 'Lines Added at PR Creation' },
    { id: 'lines_removed', title: 'Lines Removed at PR Creation' },
    { id: 'merge_state', title: 'Merge State' },
    { id: 'merged_at', title: 'Merged At' },
    { id: 'total_lines_added', title: 'Total Lines Added in Merged PR' },
    { id: 'total_lines_removed', title: 'Total Lines Removed in Merged PR' },
    { id: 'pr_state', title: 'PR State' }
];

if ((ORG_NAME && USER_NAME) || (!ORG_NAME && !USER_NAME)) {
    console.error('Either ORG_NAME or USER_NAME must be defined, but not both.');
    process.exit(1);
}

if (!START_DATE) {
    console.error('START_DATE must be defined in the environment file');
    process.exit(1);
}

if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR);
}

const getRepos = async () => {
    if (REPO_NAME) {
        return [{ name: REPO_NAME }];
    }
    if (ORG_NAME) {
        const repos = await octokit.paginate(octokit.repos.listForOrg, { org: ORG_NAME, per_page: 100 });
        return repos.map(repo => ({ name: repo.name }));
    }
    if (USER_NAME) {
        const repos = await octokit.paginate(octokit.repos.listForUser, { username: USER_NAME, per_page: 100 });
        return repos.map(repo => ({ name: repo.name }));
    }
    return [];
};

const cloneOrUpdateRepo = (repoName: string) => {
    const repoPath = path.join(BASE_DIR, repoName);
    if (fs.existsSync(repoPath)) {
        console.log(`Updating repository: ${repoName}`);
        execSync(`git -C ${repoPath} pull`);
    } else {
        console.log(`Cloning repository: ${repoName}`);
        execSync(`git clone https://github.com/${ORG_NAME || USER_NAME}/${repoName}.git ${repoPath}`);
    }
};

const loadHistoricalRecords = (repoName: string) => {
    const historicalRecords: Record<string, any> = {};
    if (fs.existsSync(WORKING_CSV_FILE)) {
        fs.createReadStream(WORKING_CSV_FILE)
            .pipe(csvParser({ headers: CSV_HEADERS.map(h => h.id) }))
            .on('data', (row) => {
                if (row.repository === repoName) {
                    historicalRecords[row.pr_id] = row;
                }
            });
    }
    return historicalRecords;
};

const getPullRequests = async (repoName: string): Promise<Record<number, PullRequest>> => {
    console.log("Page size: ", PAGE_SIZE);
    const prRecords: Record<number, PullRequest> = {};
    const pullsIterator = await octokit.paginate.iterator(octokit.pulls.list, {
        owner: ORG_NAME || USER_NAME,
        repo: repoName,
        state: 'all',
        per_page: PAGE_SIZE
    });

    for await (const { data: pulls } of pullsIterator) {
        for (const pull of pulls) {
            console.log(pull.number);

            prRecords[pull.number] = {
                number: pull.number,
                author: pull.user?.login || '',
                created_at: pull.created_at,
                merged_at: pull.merged_at || null,
                merge_state: pull.merged_at ? 'merged' : 'open',
                state: pull.state
            };
            console.log(prRecords[pull.number]);
        }
    }
    return prRecords;

};

const getCommentsAndCommitsForPR = async (repoName: string, pr: PullRequest) => {
    const query = `
        query ($owner: String!, $repo: String!, $prNumber: Int!) {
            repository(owner: $owner, name: $repo) {
                pullRequest(number: $prNumber) {
                    additions
                    deletions
                    comments(first: 100) {
                        nodes {
                            author { login }
                            createdAt
                            body
                        }
                    }
                    reviews(first: 100) {
                        nodes {
                            author { login }
                            createdAt
                            body
                        }
                    }
                    commits(first: 100) {
                        nodes {
                            commit {
                                oid
                                author { user { login } }
                                committedDate
                                additions
                                deletions
                            }
                        }
                    }
                }
            }
        }`;
    console.log("PR ID: ", pr.number);
    const variables = { owner: ORG_NAME || USER_NAME, repo: repoName, prNumber: pr.number };
    const response = await octokit.graphql(query, variables);
    const prData = response.repository.pullRequest;

    pr.comments = [
        ...prData.comments.nodes.map(comment => ({
            type: 'comment',
            author: comment.author?.login,
            date: comment.createdAt,
            body: comment.body
        })),
        ...prData.reviews.nodes.map(review => ({
            type: 'review',
            author: review.author?.login,
            date: review.createdAt,
            body: review.body
        }))
    ];

    pr.commits =  prData.commits.nodes.map(commit => ({
        type: 'commit',
        sha: commit.commit.oid,
        author: commit.commit.author?.user?.login,
        date: commit.commit.committedDate,
        linesAdded: commit.commit.additions,
        linesRemoved: commit.commit.deletions
    }));

    pr.additions = prData.additions;
    pr.deletions = prData.deletions;
    return;
};

const saveToCSV = async (data: any[]) => {
    const csvWriter = createObjectCsvWriter({
        path: PROCESSED_CSV_FILE,
        header: CSV_HEADERS,
        append: fs.existsSync(PROCESSED_CSV_FILE)
    });
    await csvWriter.writeRecords(data);
};

const main = async () => {
    const repos = await getRepos();

    for (const repo of repos) {
        const records: Record<number,PullRequest> = {};
        const historicalRecords = loadHistoricalRecords(repo.name);
        cloneOrUpdateRepo(repo.name);
        const prs = await getPullRequests(repo.name);

        for (const prId in prs) {
            const pr:PullRequest = prs[prId];

            if (historicalRecords[prId] && historicalRecords[prId].pr_state === 'closed') {
                records[prId] = historicalRecords[prId];
                console.log("Adding historical record: ", historicalRecords[prId].pr_id);
            } else if (new Date(pr.created_at) >= new Date(START_DATE) && new Date(pr.created_at) <= new Date(END_DATE)) {
                console.log("Processing", historicalRecords[prId] ? 'updated' : 'new','record', prId);
                await getCommentsAndCommitsForPR(repo.name, pr);

                records[prId] = {
                    repository: repo.name,
                    pr_id: pr.number,
                    author: pr.author,
                    first_commit_date: pr.commits[0].date,
                    total_commits: pr.commits.length,
                    date_pr_raised: pr.created_at,
                    lines_added: pr.additions,
                    lines_removed: pr.deletions,
                    merge_state: pr.merge_state,
                    merged_at: pr.merged_at,
                    total_lines_added: pr.additions,
                    total_lines_removed: pr.deletions,
                    pr_state: pr.state
                };
            }
            console.log(records[prId]);
        }

        await saveToCSV(Object.values(records));
    }
    fs.copyFileSync(PROCESSED_CSV_FILE, WORKING_CSV_FILE);
    console.log('PR data saved to CSV successfully.');
};

main().catch(console.error);
