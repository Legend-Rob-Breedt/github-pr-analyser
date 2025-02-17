import {PRCommit} from './PRCommit';
import {PRComment} from './PRComment';
import path from 'path';
import fs from 'fs';
import {execSync} from 'child_process';
import {Octokit} from '@octokit/rest';
import {
  REPO_DIR,
  ORG_NAME,
  PAGE_SIZE,
  PR_TITLE_MATURITY_LENGTH,
  REPO_NAME,
  USER_NAME,
} from '../../constants';

export interface PullRequest {
  repository: string;
  number: number;
  title: string;
  body: string;
  author: string;
  createdAt: Date;
  mergedAt: Date | null;
  state: string;
  valid: boolean;
  additions: number;
  deletions: number;
  size: number; //total additions and deletions of a PR
  changedFiles: number; //total number of files changed in a PR
  lastProcessed: Date;
  comments: PRComment[];
  commits: PRCommit[];
  initialCommits: {
    count: number; // total number of commits added BEFORE initial PR raised.
    additions: number; // total lines additions done on all commits added BEFORE initial PR raised.
    deletions: number; // total lines deletions done on all commits added BEFORE initial PR raised.
  };
  reworkCommits: {
    count: number; // total number of commits added AFTER initial PR raised.
    additions: number; // total lines additions done on all commits added AFTER initial PR raised.
    deletions: number; // total lines deletions done on all commits added AFTER initial PR raised.
  };
  maturity: number; //Measure of how refined a pull request (PR) is when it is submitted for review. Measured as percentage.
  codingTime: number; //Time taken to code the PR - measured in minutes till last commit of the PR
  initialCommitCreatedAt: Date | null; //Date of the first commit of the PR
  lastCommitCreatedAt: Date | null; //Date of the last commit of the PR
  titleMaturity: number; //Measures the quality of the title of the PR - uses length of title as a measure
}

export function createPullRequest(
  repo: string,
  prNumber: number,
  author: string,
  title: string,
  createdAt: Date,
  state: string,
  mergedAt: Date | null,
): PullRequest {
  return {
    repository: repo,
    number: prNumber,
    valid: false,
    additions: 0,
    author: author,
    codingTime: 0,
    comments: [],
    commits: [],
    createdAt: createdAt,
    deletions: 0,
    initialCommitCreatedAt: null,
    initialCommits: {additions: 0, count: 0, deletions: 0},
    lastCommitCreatedAt: null,
    lastProcessed: new Date(),
    maturity: 0,
    mergedAt: mergedAt,
    reworkCommits: {additions: 0, count: 0, deletions: 0},
    size: 0,
    changedFiles: 0,
    state: state,
    title: title,
    body: '',
    titleMaturity: 0,
  };
}

const octokit = new Octokit({auth: process.env.GITHUB_TOKEN});

export const getRepos = async () => {
  if ((ORG_NAME && USER_NAME) || (!ORG_NAME && !USER_NAME)) {
    console.error(
      'Either ORG_NAME or USER_NAME must be defined, but not both.',
    );
    process.exit(1);
  }

  if (REPO_NAME) {
    return [{name: REPO_NAME}];
  }
  if (ORG_NAME) {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: ORG_NAME,
      per_page: 100,
    });
    return repos.map(repo => ({name: repo.name}));
  }
  if (USER_NAME) {
    const repos = await octokit.paginate(octokit.repos.listForUser, {
      username: USER_NAME,
      per_page: 100,
    });
    return repos.map(repo => ({name: repo.name}));
  }
  return [];
};

export const cloneOrUpdateRepo = (repoName: string) => {
  if (!fs.existsSync(REPO_DIR)) {
    console.info(`Creating directory: ${REPO_DIR}`);
    try {
      fs.mkdirSync(REPO_DIR);
    } catch (error: any) {
      console.error('Error creating directory: ', error);
      throw error;
    }
  }

  const repoPath = path.join(REPO_DIR, repoName);
  if (fs.existsSync(repoPath)) {
    console.info(`Updating repository: ${repoPath}`);
    execSync(`git -C ${repoPath} pull`);
  } else {
    console.info(`Cloning repository: ${repoName}`);
    execSync(
      `git clone https://github.com/${ORG_NAME || USER_NAME}/${repoName}.git ${repoPath}`,
    );
  }
};

export const getPullRequests = async (
  repoName: string,
  startDate: string,
): Promise<Record<string, PullRequest>> => {
  const prRecords: Record<number, PullRequest> = {};
  try {
    const pullsIterator = octokit.paginate.iterator(octokit.pulls.list, {
      owner: ORG_NAME || USER_NAME,
      repo: repoName,
      state: 'closed',
      per_page: PAGE_SIZE,
      sort: 'created',
      direction: 'asc',
      since: startDate,
    });

    for await (const {data: pulls, headers} of pullsIterator) {
      const rateLimitRemaining = parseInt(
        headers['x-ratelimit-remaining'] || '1',
        10,
      );
      console.log('Rate limit remaining: ', rateLimitRemaining);
      try {
        for (const pull of pulls) {
          prRecords[pull.number] = createPullRequest(
            repoName,
            pull.number,
            pull.user?.login || 'UNKNOWN_AUTHOR',
            pull.title,
            new Date(pull.created_at),
            pull.state,
            pull.merged_at !== null ? new Date(pull.merged_at) : null,
          );
        }
      } catch (error: any) {
        if (error.response) {
          const rateLimitReset = parseInt(
            headers['x-ratelimit-reset'] || '0',
            10,
          );
          const retryAfter = parseInt(headers['retry-after'] || '0', 10);

          if (error.response.status === 403 || error.response.status === 429) {
            console.warn('Rate limit exceeded. Retrying after waiting...');
            const waitTime =
              retryAfter > 0
                ? retryAfter * 1000
                : rateLimitReset * 1000 - Date.now();
            if (waitTime > 0) {
              console.info(
                `Waiting for ${waitTime / 1000} seconds before retrying...`,
              );
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          } else {
            console.error(
              'GitHub API error: ',
              error.response.status,
              error.response.data,
            );
            throw error;
          }
        } else {
          console.error('Unexpected error: ', error);
          throw error;
        }
      }
    }
    return prRecords;
  } catch (error: any) {
    console.error(
      `Error fetching pull requests - confirm that Github Token is valid for Organisation ${ORG_NAME} || ${USER_NAME}`,
      `It requires the following permissions:',
        'Commit statuses - Access: Read-only
         Contents - Access: Read-only
         Metadata - Access: Read-only
         Pull requests - Access: Read-onlyerror`,
    );
    throw error;
  }
};

export function calculatePrMetrics(pr: PullRequest) {
  pr.initialCommits = {
    count: 0,
    additions: 0,
    deletions: 0,
  };
  pr.reworkCommits = {
    count: 0,
    additions: 0,
    deletions: 0,
  };

  for (const commit of pr.commits) {
    if (commit.date.getTime() < pr.createdAt.getTime()) {
      pr.initialCommits.count++;
      pr.initialCommits.additions += commit.additions;
      pr.initialCommits.deletions += commit.deletions;
    } else {
      pr.reworkCommits.count++;
      pr.reworkCommits.additions += commit.additions;
      pr.reworkCommits.deletions += commit.deletions;
    }
    pr.size = pr.size + commit.additions + commit.deletions;
  }
  if (pr.lastCommitCreatedAt && pr.initialCommitCreatedAt) {
    pr.codingTime = Math.round(
      pr.createdAt < pr.lastCommitCreatedAt
        ? (new Date(pr.lastCommitCreatedAt).getTime() -
            new Date(pr.initialCommitCreatedAt).getTime()) /
            60000
        : (new Date(pr.createdAt).getTime() -
            new Date(pr.initialCommitCreatedAt).getTime()) /
            60000,
    );
    pr.titleMaturity =
      Number(
        Math.max(
          0.1,
          1 -
            (pr.title.length + pr.body.length) /
              Number(PR_TITLE_MATURITY_LENGTH),
        ).toFixed(2),
      ) * 100;
    if (pr.size > 10) {
      pr.maturity =
        Number(
          Math.max(
            0.1,
            1 -
              (pr.reworkCommits.additions + pr.reworkCommits.deletions) /
                pr.size,
          ).toFixed(2),
        ) * 100;
    } else {
      pr.maturity = 0;
    }
  }
}

export const getCommentsAndCommitsForPR = async (
  repoName: string,
  pr: PullRequest,
) => {
  const query = `query ($repo: String!, $owner: String!, $prNumber: Int!) {
  repository(name: $repo, owner: $owner) {
    pullRequest(number: $prNumber) {
      __typename
      id
      title
      body
      author {
        login
      }
      additions
      deletions
      changedFiles
      createdAt
      commits(first: 100) {        
        nodes {
          commit {            
            committedDate
            additions
            deletions
            messageHeadline
          }
        }
      }
      comments(first: 100) {
        nodes {
          __typename
          createdAt
          author {
            login
          }
          body
        }
      }      
      reviewThreads(first: 100) {
        nodes {
          comments(first: 100) {
            nodes {
              __typename
              body
              createdAt
              author {
                login
              }
            }
          }
        }
      }
    }
  }
}`;

  const variables = {
    owner: ORG_NAME || USER_NAME,
    repo: repoName,
    prNumber: pr.number,
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await octokit.graphql(query, variables);
      const prData = response.repository.pullRequest;

      pr.title = prData.title;
      pr.body = prData.body;
      pr.additions = prData.additions;
      pr.deletions = prData.deletions;
      pr.size = prData.additions + prData.deletions;
      pr.changedFiles = prData.changedFiles;

      pr.comments = [
        ...prData.comments.nodes.map(comment => ({
          author: comment.author?.login,
          date: comment.createdAt,
          body: comment.body,
        })),
        ...prData.reviewThreads.nodes.flatMap(reviewThread =>
          reviewThread.comments.nodes.map(comment => ({
            author: comment.author?.login,
            date: comment.createdAt,
            body: comment.body,
          })),
        ),
      ];
      pr.commits = prData.commits.nodes.map(commit => ({
        //Ideally I should be using the author of the commit but it gives back only the email address
        // and not the username in some instances.
        author: pr.author,
        date: new Date(commit.commit.committedDate),
        additions: commit.commit.additions,
        deletions: commit.commit.deletions,
        title: commit.commit.messageHeadline,
      }));

      if (pr.commits.length === 0) return false; //No commits in PR
      if (pr.size > 1000 && pr.changedFiles > 5) return false; //Arbitrary limit to prevent large PRs which are likely a release or lint/code cleanup from being processed
      if (pr.size > 2000) return false; //Arbitrary limit to prevent large PRs which are likely a release or lint/code cleanup from being processed

      pr.initialCommitCreatedAt = pr.commits[0].date;
      pr.lastCommitCreatedAt = pr.commits[pr.commits.length - 1].date;
      pr.valid = true;
      return pr.valid;
    } catch (error: any) {
      if (
        error.status === 403 &&
        error.response?.headers['x-ratelimit-remaining'] === '0'
      ) {
        const resetTime =
          parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
        const waitTime = resetTime - Date.now();

        if (attempt < 3) {
          console.warn(
            `Rate limit exceeded! Retrying in ${waitTime / 1000} seconds...`,
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error('Rate limit exceeded! No retries left.');
        }
      } else if (error.status > 500) {
        console.warn('Timeout error. Retrying...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('GraphQL Error:', error.message);
        throw error;
      }
    }
  }
};
