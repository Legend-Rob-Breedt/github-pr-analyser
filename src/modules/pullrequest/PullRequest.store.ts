import {
  PROCESSED_PR_FOLDER,
  TIMESTAMP,
  WORKING_PR_FOLDER,
} from '../../constants';
import * as fs from 'fs';

import csvParser from 'csv-parser';
import {createObjectCsvWriter} from 'csv-writer';
import {createPullRequest, PullRequest} from './PullRequest';

const CSV_HEADERS: {id: string; title: string}[] = [
  {id: 'repository', title: 'Repository'},
  {id: 'number', title: 'Number'},
  {id: 'title', title: 'Title'},
  {id: 'author', title: 'Author'},
  {id: 'createdAt', title: 'Created At'},
  {id: 'mergedAt', title: 'Merged At'},
  {id: 'state', title: 'State'},
  {id: 'valid', title: 'Valid PR'},
  {id: 'additions', title: 'Additions'},
  {id: 'deletions', title: 'Deletions'},
  {id: 'size', title: 'Size'},
  {id: 'changedFiles', title: 'Changed Files'},
  {id: 'lastProcessed', title: 'Last Processed'},
  {id: 'initialCommits.count', title: 'Initial Commits Count'},
  {id: 'initialCommits.additions', title: 'Initial Commits Additions'},
  {id: 'initialCommits.deletions', title: 'Initial Commits Deletions'},
  {id: 'reworkCommits.count', title: 'Rework Commits Count'},
  {id: 'reworkCommits.additions', title: 'Rework Commits Additions'},
  {id: 'reworkCommits.deletions', title: 'Rework Commits Deletions'},
  {id: 'maturity', title: 'Maturity'},
  {id: 'codingTime', title: 'Coding Time'},
  {id: 'initialCommitCreatedAt', title: 'Initial Commit Created At'},
  {id: 'lastCommitCreatedAt', title: 'Last Commit Created At'},
  {id: 'titleMaturity', title: 'Title Maturity'},
];

export class PullRequestStore {
  private repo: string;
  private processedPrCsvFile: string;
  private workingPrCsvFile: string;

  constructor(repo: string) {
    this.repo = repo;
    this.processedPrCsvFile = `${PROCESSED_PR_FOLDER}/PR_${repo}_${TIMESTAMP}.csv`;
    this.workingPrCsvFile = `${WORKING_PR_FOLDER}/PR_${repo}.csv`;

    if (!fs.existsSync(PROCESSED_PR_FOLDER))
      fs.mkdirSync(PROCESSED_PR_FOLDER, {recursive: true});
    if (!fs.existsSync(WORKING_PR_FOLDER))
      fs.mkdirSync(WORKING_PR_FOLDER, {recursive: true});
  }

  public loadHistoricalPullRequest = async (): Promise<
    Record<string, PullRequest>
  > => {
    return new Promise((resolve, reject) => {
      const historicalRecords: Record<string, PullRequest> = {};
      //console.log("Retrieving historical repository data from: ", this.workingPrCsvFile, this.repo);
      try {
        if (fs.existsSync(this.workingPrCsvFile)) {
          fs.createReadStream(this.workingPrCsvFile)
            .pipe(csvParser({ headers: CSV_HEADERS.map(h => h.id), skipLines: 1 }))
            .on('data', row => {
              if (row.repository === this.repo) {
                historicalRecords[row.number] = createPullRequest(
                  row.repository,
                  row.number,
                  row.author,
                  row.title,
                  new Date(row.createdAt),
                  row.state,
                  row.mergedAt === '' ? null : new Date(row.mergedAt),
                );
                historicalRecords[row.number].valid = row.valid;
                historicalRecords[row.number].additions = row.additions;
                historicalRecords[row.number].deletions = row.deletions;
                historicalRecords[row.number].changedFiles = row.changedFiles;
                historicalRecords[row.number].size = row.size;

                historicalRecords[row.number].codingTime = row.codingTime;
                historicalRecords[row.number].initialCommitCreatedAt =
                  row.initialCommitCreatedAt !== ''
                    ? new Date(row.initialCommitCreatedAt)
                    : null;
                historicalRecords[row.number].initialCommits = {
                  count: row['initialCommits.count'],
                  additions: row['initialCommits.additions'],
                  deletions: row['initialCommits.deletions'],
                };
                historicalRecords[row.number].lastCommitCreatedAt =
                  row.lastCommitCreatedAt !== ''
                    ? new Date(row.lastCommitCreatedAt)
                    : null;
                historicalRecords[row.number].lastProcessed = new Date(
                  row.lastProcessed,
                );
                historicalRecords[row.number].maturity = row.maturity;
                historicalRecords[row.number].reworkCommits = {
                  count: row['reworkCommits.count'],
                  additions: row['reworkCommits.additions'],
                  deletions: row['reworkCommits.deletions'],
                };
                historicalRecords[row.number].titleMaturity = row.titleMaturity;
              }
            })
            .on('end', () => {
              fs.rm(this.workingPrCsvFile, () => {
              });
              resolve(historicalRecords);
            })
            .on('error', error => reject(error));
        } else {
          resolve(historicalRecords);
        }
      } catch (error) {
        console.error('Error loading historical PR data:', error);
        throw error;
      }
    });
  };

  public saveProcessedPullRequestCSV = async (pullRequests: PullRequest[]) => {
    const csvWriter = createObjectCsvWriter({
      path: this.workingPrCsvFile,
      header: CSV_HEADERS,
      append: fs.existsSync(this.workingPrCsvFile),
    });
    const csvRecords = [];
    for (const pullRequest of pullRequests) {
      csvRecords.push(csvRow(pullRequest));
    }
    await csvWriter.writeRecords(csvRecords);
    fs.copyFileSync(this.workingPrCsvFile, this.processedPrCsvFile);
  };
}

function csvRow(pr: PullRequest) {
  return {
    repository: pr.repository,
    number: pr.number,
    title: pr.title,
    author: pr.author,
    createdAt: pr.createdAt.toISOString(),
    mergedAt: pr.mergedAt?.toISOString(),
    state: pr.state,
    valid: pr.valid,
    additions: pr.additions,
    deletions: pr.deletions,
    size: pr.size,
    changedFiles: pr.changedFiles,
    lastProcessed: pr.lastProcessed.toISOString(),
    'initialCommits.count': pr.initialCommits.count,
    'initialCommits.additions': pr.initialCommits.additions,
    'initialCommits.deletions': pr.initialCommits.deletions,
    'reworkCommits.count': pr.reworkCommits.count,
    'reworkCommits.additions': pr.reworkCommits.additions,
    'reworkCommits.deletions': pr.reworkCommits.deletions,
    maturity: pr.maturity,
    codingTime: pr.codingTime,
    initialCommitCreatedAt: pr.initialCommitCreatedAt?.toISOString(),
    lastCommitCreatedAt: pr.lastCommitCreatedAt?.toISOString(),
    titleMaturity: pr.titleMaturity,
  };
}
